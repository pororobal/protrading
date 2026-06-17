/**
 * Monster Score engine — implements the 100-point scoring rubric from the
 * design spec.
 *
 * Weighting:
 *   Float Rotation   35%
 *   RVOL             20%
 *   VWAP Strength    15%
 *   ORB              10%
 *   Gap Strength     10%
 *   Short Interest   10%
 *
 * Plus bonuses (halt, 52w high, prior-high break, sector strength, relative
 * strength vs SPY) and penalties (VWAP breakdown, pullback from high, volume
 * decline, dilution risk). Total is clamped to [0, 100].
 */

import type { DerivedMetrics, RawQuote, ScoreBreakdown, Grade, BuySignal, SellTargets } from '@/types/stock';

// ---------------------------------------------------------------------------
// Category scorers
// ---------------------------------------------------------------------------

/** Float Rotation — 35% — tiered by multiple of float traded */
function scoreFloatRotation(floatRotation: number): number {
  if (floatRotation >= 20) return 35;
  if (floatRotation >= 10) return 25;
  if (floatRotation >= 5) return 15;
  if (floatRotation >= 3) return 10;
  if (floatRotation >= 1) return 5;
  return 0;
}

/** RVOL — 20% — tiered by multiple of average volume */
function scoreRvol(rvol: number): number {
  if (rvol >= 20) return 20;
  if (rvol >= 10) return 15;
  if (rvol >= 5) return 10;
  if (rvol >= 2) return 5;
  return 0;
}

/** VWAP Strength — 15% — based on % of session held above VWAP */
function scoreVwapStrength(vwapHoldPercent: number): number {
  if (vwapHoldPercent >= 90) return 15;
  if (vwapHoldPercent >= 70) return 10;
  if (vwapHoldPercent >= 50) return 5;
  return 0;
}

/** ORB — 10% — breakout confirmed on 5/15/30 min opening range */
function scoreOrb(orb5: boolean, orb15: boolean, orb30: boolean): number {
  // Higher-confidence longer-window breakouts score more; only count the
  // strongest confirmed breakout to avoid double counting toward the 10pt cap.
  if (orb30) return 10;
  if (orb15) return 7;
  if (orb5) return 4;
  return 0;
}

/** Gap Strength — 10% — staged by gap % */
function scoreGapStrength(gapPercent: number): number {
  const gapAbs = Math.abs(gapPercent) * 100; // convert to percentage points
  if (gapAbs >= 50) return 10;
  if (gapAbs >= 20) return 7.5;
  if (gapAbs >= 10) return 5;
  if (gapAbs >= 5) return 2.5;
  return 0;
}

/** Short Interest — 10% — staged by % of float short */
function scoreShortInterest(shortInterest: number | null): number {
  if (shortInterest == null) return 0;
  if (shortInterest >= 35) return 10;
  if (shortInterest >= 25) return 7;
  if (shortInterest >= 15) return 4;
  return 0;
}

// ---------------------------------------------------------------------------
// Bonuses
// ---------------------------------------------------------------------------

function scoreHaltBonus(haltCount: number): number {
  if (haltCount >= 5) return 20;
  if (haltCount >= 3) return 10;
  if (haltCount >= 1) return 5;
  return 0;
}

function scoreFiftyTwoWeekHighBonus(brokeFiftyTwoWeekHigh: boolean): number {
  return brokeFiftyTwoWeekHigh ? 10 : 0;
}

function scorePriorHighBreakBonus(isNearPriorHigh: boolean): number {
  return isNearPriorHigh ? 5 : 0;
}

/**
 * Sector strength — scaled 0-10 based on a pre-computed "sector momentum
 * boost" signal (count of other surging stocks in the same sector).
 * Caller passes a normalized 0-10 value.
 */
function scoreSectorStrength(sectorBoost: number): number {
  return Math.max(0, Math.min(10, sectorBoost));
}

/** Relative strength vs SPY — scaled 0-10 based on outperformance in pp */
function scoreRelativeStrength(relativeStrengthPct: number): number {
  if (relativeStrengthPct >= 20) return 10;
  if (relativeStrengthPct >= 10) return 7;
  if (relativeStrengthPct >= 5) return 5;
  if (relativeStrengthPct > 0) return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// Penalties
// ---------------------------------------------------------------------------

function penaltyVwapBreakdown(distanceFromVwap: number): number {
  // distanceFromVwap < 0 means price is below VWAP
  return distanceFromVwap < 0 ? -15 : 0;
}

function penaltyPullbackFromHigh(distanceFromHod: number): number {
  // distanceFromHod is negative (price - high) / high
  const pullbackPct = Math.abs(distanceFromHod) * 100;
  if (pullbackPct >= 20) return -20;
  if (pullbackPct >= 15) return -10;
  if (pullbackPct >= 10) return -5;
  return 0;
}

function penaltyVolumeDecline(volumeTrend: DerivedMetrics['volumeTrend']): number {
  return volumeTrend === 'decreasing' ? -10 : 0;
}

function penaltyDilutionRisk(dilutionRisk: boolean): number {
  return dilutionRisk ? -10 : 0;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function computeMonsterScore(derived: DerivedMetrics, sectorBoost = 0): ScoreBreakdown {
  const floatRotation = scoreFloatRotation(derived.floatRotation);
  const rvol = scoreRvol(derived.rvol);
  const vwapStrength = scoreVwapStrength(derived.vwapHoldPercent);
  const orb = scoreOrb(derived.orb5Breakout, derived.orb15Breakout, derived.orb30Breakout);
  const gapStrength = scoreGapStrength(derived.gapPercent);
  const shortInterestScore = scoreShortInterest(null); // populated by caller via setShortInterest below

  const bonuses = {
    halt: scoreHaltBonus(derived.haltCount),
    fiftyTwoWeekHigh: scoreFiftyTwoWeekHighBonus(derived.brokeFiftyTwoWeekHigh),
    priorHighBreak: scorePriorHighBreakBonus(derived.isNearPriorHigh),
    sectorStrength: scoreSectorStrength(sectorBoost),
    relativeStrength: scoreRelativeStrength(derived.relativeStrengthVsSpy),
  };

  const penalties = {
    vwapBreakdown: penaltyVwapBreakdown(derived.distanceFromVwap),
    pullbackFromHigh: penaltyPullbackFromHigh(derived.distanceFromHod),
    volumeDecline: penaltyVolumeDecline(derived.volumeTrend),
    dilutionRisk: penaltyDilutionRisk(derived.dilutionRisk),
  };

  const rawTotal =
    floatRotation +
    rvol +
    vwapStrength +
    orb +
    gapStrength +
    shortInterestScore +
    Object.values(bonuses).reduce((s, v) => s + v, 0) +
    Object.values(penalties).reduce((s, v) => s + v, 0);

  const total = Math.max(0, Math.min(100, Math.round(rawTotal * 10) / 10));

  return {
    floatRotation,
    rvol,
    vwapStrength,
    orb,
    gapStrength,
    shortInterest: shortInterestScore,
    bonuses,
    penalties,
    total,
  };
}

/**
 * Variant that incorporates short interest (kept as a separate exported
 * function for clarity since shortInterest lives on RawQuote, not
 * DerivedMetrics).
 */
export function computeMonsterScoreFull(
  quote: RawQuote,
  derived: DerivedMetrics,
  sectorBoost = 0
): ScoreBreakdown {
  const base = computeMonsterScore(derived, sectorBoost);
  const shortInterestScore = scoreShortInterest(quote.shortInterest);

  const rawTotal =
    base.floatRotation +
    base.rvol +
    base.vwapStrength +
    base.orb +
    base.gapStrength +
    shortInterestScore +
    Object.values(base.bonuses).reduce((s, v) => s + v, 0) +
    Object.values(base.penalties).reduce((s, v) => s + v, 0);

  const total = Math.max(0, Math.min(100, Math.round(rawTotal * 10) / 10));

  return {
    ...base,
    shortInterest: shortInterestScore,
    total,
  };
}

// ---------------------------------------------------------------------------
// Grade
// ---------------------------------------------------------------------------

export function gradeFromScore(total: number): Grade {
  if (total >= 95) return 'SSS';
  if (total >= 90) return 'SS';
  if (total >= 85) return 'S';
  if (total >= 75) return 'A';
  if (total >= 65) return 'B';
  return 'C';
}

// ---------------------------------------------------------------------------
// Buy signal
// ---------------------------------------------------------------------------

export function computeBuySignal(score: ScoreBreakdown, derived: DerivedMetrics): BuySignal {
  const reasons: string[] = [];
  const checks = {
    score: score.total >= 85,
    rvol: derived.rvol >= 5,
    floatRotation: derived.floatRotation >= 3,
    aboveVwap: derived.distanceFromVwap > 0,
    orbBreakout: derived.orb5Breakout || derived.orb15Breakout || derived.orb30Breakout,
  };

  if (checks.score) reasons.push(`Monster Score ${score.total} >= 85`);
  if (checks.rvol) reasons.push(`RVOL ${derived.rvol.toFixed(1)}x >= 5x`);
  if (checks.floatRotation) reasons.push(`Float Rotation ${derived.floatRotation.toFixed(1)}x >= 3x`);
  if (checks.aboveVwap) reasons.push('Price above VWAP');
  if (checks.orbBreakout) reasons.push('ORB breakout confirmed');

  const active = Object.values(checks).every(Boolean);

  return { active, reasons };
}

// ---------------------------------------------------------------------------
// Sell targets
// ---------------------------------------------------------------------------

export function computeSellTargets(entryPrice: number): SellTargets {
  return {
    target1: Math.round(entryPrice * 1.1 * 10000) / 10000,
    target2: Math.round(entryPrice * 1.2 * 10000) / 10000,
    target3Label: 'VWAP trail (exit on close below VWAP)',
  };
}
