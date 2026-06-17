/**
 * Mock data generator — produces realistic-looking MonsterStock data for
 * local development and demo deployments where real Yahoo Finance data isn't
 * reachable (e.g. Vercel preview branches with no network access to YF).
 *
 * Toggle via NEXT_PUBLIC_MOCK_DATA=true in .env.local
 */

import type { MonsterStock, DerivedMetrics, ScoreBreakdown, Grade } from '@/types/stock';
import { gradeFromScore } from '@/lib/scoring/monsterScore';

const MOCK_TICKERS: Array<{ ticker: string; name: string; exchange: 'NASDAQ' | 'NYSE' | 'AMEX' }> = [
  { ticker: 'BNGO', name: 'Bionano Genomics Inc', exchange: 'NASDAQ' },
  { ticker: 'MULN', name: 'Mullen Automotive Inc', exchange: 'NASDAQ' },
  { ticker: 'SNDL', name: 'SNDL Inc', exchange: 'NASDAQ' },
  { ticker: 'FFIE', name: 'Faraday Future Intelligent', exchange: 'NASDAQ' },
  { ticker: 'CXAI', name: 'CXApp Inc', exchange: 'NASDAQ' },
  { ticker: 'HOLO', name: 'MicroCloud Hologram Inc', exchange: 'NASDAQ' },
  { ticker: 'TOP', name: 'TOP Financial Group Ltd', exchange: 'NASDAQ' },
  { ticker: 'ATER', name: 'Aterian Inc', exchange: 'NASDAQ' },
  { ticker: 'BBAI', name: 'BigBear.ai Holdings Inc', exchange: 'NYSE' },
  { ticker: 'INDO', name: 'Indonesia Energy Corp', exchange: 'AMEX' },
  { ticker: 'IMPP', name: 'Imperial Petroleum Inc', exchange: 'NASDAQ' },
  { ticker: 'GFAI', name: 'Guardforce AI Co Ltd', exchange: 'NASDAQ' },
  { ticker: 'NCTY', name: 'The9 Limited', exchange: 'NASDAQ' },
  { ticker: 'MEGL', name: 'Magic Empire Global Ltd', exchange: 'NASDAQ' },
  { ticker: 'PHUN', name: 'Phunware Inc', exchange: 'NASDAQ' },
  { ticker: 'COSM', name: 'Cosmos Health Inc', exchange: 'NASDAQ' },
  { ticker: 'CEI', name: 'Camber Energy Inc', exchange: 'AMEX' },
  { ticker: 'GNUS', name: 'Genius Brands International', exchange: 'NASDAQ' },
  { ticker: 'SOUN', name: 'SoundHound AI Inc', exchange: 'NASDAQ' },
  { ticker: 'NEGG', name: 'Newegg Commerce Inc', exchange: 'NASDAQ' },
];

function rnd(min: number, max: number, dp = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function generateMockDerived(floatShares: number, volume: number, rvol: number): DerivedMetrics {
  const floatRotation = floatShares > 0 ? volume / floatShares : 0;
  const vwapHoldPercent = rnd(20, 100, 0);
  const relativeStrength = rnd(-5, 30, 1);
  const distanceFromVwap = rnd(-0.05, 0.12, 4);
  const distanceFromHod = rnd(-0.15, 0, 4);
  const haltCount = Math.random() > 0.8 ? Math.floor(rnd(1, 6, 0)) : 0;

  return {
    rvol,
    floatRotation,
    dollarVolume: rnd(5e6, 200e6, 0),
    gapPercent: rnd(-0.05, 0.5, 4),
    distanceFromVwap,
    distanceFromHod,
    relativeStrengthVsSpy: relativeStrength,
    vwapHoldPercent,
    orb5Breakout: Math.random() > 0.5,
    orb15Breakout: Math.random() > 0.6,
    orb30Breakout: Math.random() > 0.7,
    haltCount,
    isNearFiftyTwoWeekHigh: Math.random() > 0.7,
    brokeFiftyTwoWeekHigh: Math.random() > 0.85,
    isNearPriorHigh: Math.random() > 0.5,
    volumeTrend: pick(['increasing', 'flat', 'decreasing'] as const),
    dilutionRisk: Math.random() > 0.8,
  };
}

function generateMockScore(derived: DerivedMetrics, shortInterest: number | null): ScoreBreakdown {
  const floatRotationScore = (() => {
    const fr = derived.floatRotation;
    if (fr >= 20) return 35;
    if (fr >= 10) return 25;
    if (fr >= 5) return 15;
    if (fr >= 3) return 10;
    if (fr >= 1) return 5;
    return 0;
  })();

  const rvolScore = (() => {
    const rv = derived.rvol;
    if (rv >= 20) return 20;
    if (rv >= 10) return 15;
    if (rv >= 5) return 10;
    if (rv >= 2) return 5;
    return 0;
  })();

  const vwapStrength = derived.vwapHoldPercent >= 90 ? 15 : derived.vwapHoldPercent >= 70 ? 10 : derived.vwapHoldPercent >= 50 ? 5 : 0;
  const orb = derived.orb30Breakout ? 10 : derived.orb15Breakout ? 7 : derived.orb5Breakout ? 4 : 0;
  const gapStrength = Math.abs(derived.gapPercent * 100) >= 50 ? 10 : Math.abs(derived.gapPercent * 100) >= 20 ? 7 : Math.abs(derived.gapPercent * 100) >= 10 ? 5 : Math.abs(derived.gapPercent * 100) >= 5 ? 2.5 : 0;
  const siScore = shortInterest ? (shortInterest >= 35 ? 10 : shortInterest >= 25 ? 7 : shortInterest >= 15 ? 4 : 0) : 0;

  const bonuses = {
    halt: derived.haltCount >= 5 ? 20 : derived.haltCount >= 3 ? 10 : derived.haltCount >= 1 ? 5 : 0,
    fiftyTwoWeekHigh: derived.brokeFiftyTwoWeekHigh ? 10 : 0,
    priorHighBreak: derived.isNearPriorHigh ? 5 : 0,
    sectorStrength: Math.floor(rnd(0, 10, 0)),
    relativeStrength: derived.relativeStrengthVsSpy >= 20 ? 10 : derived.relativeStrengthVsSpy >= 10 ? 7 : derived.relativeStrengthVsSpy >= 5 ? 5 : 2,
  };

  const penalties = {
    vwapBreakdown: derived.distanceFromVwap < 0 ? -15 : 0,
    pullbackFromHigh: Math.abs(derived.distanceFromHod * 100) >= 20 ? -20 : Math.abs(derived.distanceFromHod * 100) >= 15 ? -10 : Math.abs(derived.distanceFromHod * 100) >= 10 ? -5 : 0,
    volumeDecline: derived.volumeTrend === 'decreasing' ? -10 : 0,
    dilutionRisk: derived.dilutionRisk ? -10 : 0,
  };

  const rawTotal = floatRotationScore + rvolScore + vwapStrength + orb + gapStrength + siScore
    + Object.values(bonuses).reduce((s, v) => s + v, 0)
    + Object.values(penalties).reduce((s, v) => s + v, 0);

  return {
    floatRotation: floatRotationScore,
    rvol: rvolScore,
    vwapStrength,
    orb,
    gapStrength,
    shortInterest: siScore,
    bonuses,
    penalties,
    total: Math.max(0, Math.min(100, rawTotal)),
  };
}

export function generateMockStocks(count = 20): MonsterStock[] {
  const now = Date.now();
  return MOCK_TICKERS.slice(0, count).map((t) => {
    const price = rnd(1.2, 45, 2);
    const prevClose = price / (1 + rnd(0.05, 3, 2));
    const changePercent = ((price - prevClose) / prevClose) * 100;
    const floatShares = rnd(2e6, 80e6, 0);
    const rvol = rnd(2, 25, 1);
    const avgVolume30 = rnd(500e3, 5e6, 0);
    const volume = avgVolume30 * rvol;
    const shortInterest = Math.random() > 0.4 ? rnd(10, 45, 1) : null;
    const vwap = price * rnd(0.92, 1.05, 4);

    const derived = generateMockDerived(floatShares, volume, rvol);
    const score = generateMockScore(derived, shortInterest);
    const grade = gradeFromScore(score.total);

    return {
      ticker: t.ticker,
      companyName: t.name,
      exchange: t.exchange,
      price,
      prevClose,
      changePercent,
      marketCap: price * floatShares * rnd(1, 2, 1),
      volume,
      avgVolume30,
      floatShares,
      sharesOutstanding: floatShares * rnd(1.2, 3, 1),
      shortInterest,
      vwap,
      dayHigh: price * rnd(1.01, 1.15, 4),
      dayLow: price * rnd(0.85, 0.99, 4),
      open: prevClose * rnd(1.05, 1.5, 4),
      premarketPrice: prevClose * rnd(1.1, 1.6, 4),
      premarketChange: rnd(10, 60, 1),
      fiftyTwoWeekHigh: price * rnd(1, 1.5, 4),
      fiftyTwoWeekLow: price * rnd(0.2, 0.8, 4),
      updatedAt: now,
      derived,
      score,
      grade,
      buySignal: {
        active: score.total >= 85 && derived.rvol >= 5,
        reasons: score.total >= 85 ? ['Monster Score ≥ 85', `RVOL ${derived.rvol.toFixed(1)}x`] : [],
      },
      sellTargets: {
        target1: parseFloat((price * 1.1).toFixed(2)),
        target2: parseFloat((price * 1.2).toFixed(2)),
        target3Label: 'VWAP trail',
      },
      passedFilter: true,
      filterRejectReasons: [],
    };
  });
}
