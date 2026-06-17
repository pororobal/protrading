/**
 * Computes derived metrics (RVOL, Float Rotation, VWAP distance, ORB
 * breakouts, etc.) from a RawQuote + intraday bars.
 */

import type { RawQuote, IntradayBar, DerivedMetrics } from '@/types/stock';

const ORB_WINDOWS = {
  orb5: 5 * 60, // 5 minutes in seconds
  orb15: 15 * 60,
  orb30: 30 * 60,
} as const;

/**
 * Compute the opening range high for the first N seconds of the session,
 * then check whether the latest price has broken above it.
 */
function computeOrbBreakout(bars: IntradayBar[], windowSeconds: number, currentPrice: number): boolean {
  if (bars.length === 0) return false;
  const sessionStart = bars[0].time;
  const windowEnd = sessionStart + windowSeconds;

  const openingBars = bars.filter((b) => b.time <= windowEnd);
  if (openingBars.length === 0) return false;

  const orbHigh = Math.max(...openingBars.map((b) => b.high));

  // Must have bars AFTER the opening window to confirm a "breakout" (not
  // just still inside it), and current price must be above the ORB high.
  const hasBarsAfterWindow = bars.some((b) => b.time > windowEnd);
  return hasBarsAfterWindow && currentPrice > orbHigh;
}

/**
 * % of intraday bars where close price was above VWAP.
 * If no VWAP series is available in bars, fall back to comparing current
 * price vs the single VWAP value from the quote (returns 0% or 100%).
 */
function computeVwapHoldPercent(bars: IntradayBar[], quoteVwap: number | null, currentPrice: number): number {
  if (bars.length === 0) {
    if (quoteVwap == null) return 0;
    return currentPrice >= quoteVwap ? 100 : 0;
  }

  // Compute a running VWAP across bars (cumulative typical-price * volume).
  let cumPV = 0;
  let cumVol = 0;
  let aboveCount = 0;
  let validBars = 0;

  for (const bar of bars) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumPV += typicalPrice * bar.volume;
    cumVol += bar.volume;
    if (cumVol === 0) continue;
    const runningVwap = cumPV / cumVol;
    validBars++;
    if (bar.close >= runningVwap) aboveCount++;
  }

  if (validBars === 0) return 0;
  return (aboveCount / validBars) * 100;
}

/**
 * Determine recent volume trend by comparing the volume of the most recent
 * bars vs the prior block of bars.
 */
function computeVolumeTrend(bars: IntradayBar[]): DerivedMetrics['volumeTrend'] {
  if (bars.length < 10) return 'flat';

  const recentWindow = bars.slice(-5);
  const priorWindow = bars.slice(-10, -5);

  const recentAvg = recentWindow.reduce((s, b) => s + b.volume, 0) / recentWindow.length;
  const priorAvg = priorWindow.reduce((s, b) => s + b.volume, 0) / priorWindow.length;

  if (priorAvg === 0) return 'flat';
  const ratio = recentAvg / priorAvg;

  if (ratio >= 1.15) return 'increasing';
  if (ratio <= 0.85) return 'decreasing';
  return 'flat';
}

/**
 * Dilution risk heuristic: flags potential share-count dilution which often
 * precedes a momentum reversal. Without a dedicated filings feed, we use a
 * simple proxy — shares outstanding significantly exceeding float suggests
 * large insider/locked-up tranches that could be registered/sold (S-1, ATM
 * offerings), and very large float relative to market cap (heavy historical
 * dilution already occurred, often recurring for the same issuers).
 */
function computeDilutionRisk(quote: RawQuote): boolean {
  const { floatShares, sharesOutstanding, marketCap, price } = quote;
  if (!floatShares || !sharesOutstanding) return false;

  const lockedUpRatio = (sharesOutstanding - floatShares) / sharesOutstanding;
  // >70% of shares locked up / non-float is common in recent micro-cap IPOs
  // that are notorious for ATM dilution once price spikes.
  const highLockup = lockedUpRatio > 0.7 && price > 2;

  // Market cap far below float * price (e.g. heavy warrant/option overhang)
  const impliedFloatValue = floatShares * price;
  const heavyOverhang = marketCap > 0 && impliedFloatValue > marketCap * 1.5;

  return highLockup || heavyOverhang;
}

export function computeDerivedMetrics(
  quote: RawQuote,
  bars: IntradayBar[],
  spyChangePercent: number,
  haltCount: number,
  sectorMomentumBoost: number
): DerivedMetrics {
  const { price, volume, avgVolume30, floatShares, vwap, open, prevClose, dayHigh, fiftyTwoWeekHigh } = quote;

  const rvol = avgVolume30 > 0 ? volume / avgVolume30 : 0;
  const floatRotation = floatShares && floatShares > 0 ? volume / floatShares : 0;
  const dollarVolume = price * volume;
  const gapPercent = prevClose > 0 ? (open - prevClose) / prevClose : 0;
  const distanceFromVwap = vwap && vwap > 0 ? (price - vwap) / vwap : 0;
  const distanceFromHod = dayHigh > 0 ? (price - dayHigh) / dayHigh : 0;
  const relativeStrengthVsSpy = quote.changePercent - spyChangePercent;

  const vwapHoldPercent = computeVwapHoldPercent(bars, vwap, price);
  const orb5Breakout = computeOrbBreakout(bars, ORB_WINDOWS.orb5, price);
  const orb15Breakout = computeOrbBreakout(bars, ORB_WINDOWS.orb15, price);
  const orb30Breakout = computeOrbBreakout(bars, ORB_WINDOWS.orb30, price);

  const isNearFiftyTwoWeekHigh = fiftyTwoWeekHigh > 0 && price >= fiftyTwoWeekHigh * 0.99;
  const brokeFiftyTwoWeekHigh = fiftyTwoWeekHigh > 0 && price > fiftyTwoWeekHigh;

  // "전고 돌파" (broke prior high) — approximate using previous close as the
  // reference "prior high" when intraday history for yesterday isn't available.
  const isNearPriorHigh = prevClose > 0 && price > prevClose * 1.0; // any positive day counts as base signal

  const volumeTrend = computeVolumeTrend(bars);
  const dilutionRisk = computeDilutionRisk(quote);

  return {
    rvol,
    floatRotation,
    dollarVolume,
    gapPercent,
    distanceFromVwap,
    distanceFromHod,
    relativeStrengthVsSpy: relativeStrengthVsSpy + sectorMomentumBoost,
    vwapHoldPercent,
    orb5Breakout,
    orb15Breakout,
    orb30Breakout,
    haltCount,
    isNearFiftyTwoWeekHigh,
    brokeFiftyTwoWeekHigh,
    isNearPriorHigh,
    volumeTrend,
    dilutionRisk,
  };
}
