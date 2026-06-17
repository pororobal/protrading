/**
 * Core domain types for Momentum Monster Scanner.
 *
 * Naming follows the original spec (Korean field comments preserved as English
 * docstrings) so that scoring logic maps 1:1 to the design doc.
 */

/** Raw quote data as collected from the data provider (Yahoo Finance, etc). */
export interface RawQuote {
  ticker: string;
  companyName: string;
  exchange: 'NASDAQ' | 'NYSE' | 'AMEX' | 'OTHER';
  price: number;
  prevClose: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  avgVolume30: number;
  floatShares: number | null;
  sharesOutstanding: number | null;
  shortInterest: number | null; // percent of float, 0-100
  vwap: number | null;
  dayHigh: number;
  dayLow: number;
  open: number;
  premarketPrice: number | null;
  premarketChange: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  updatedAt: number; // epoch ms
}

/** One OHLCV bar from intraday history, used for VWAP / ORB calculations. */
export interface IntradayBar {
  time: number; // epoch seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

/** Derived metrics computed from RawQuote + intraday history. */
export interface DerivedMetrics {
  rvol: number; // todayVolume / avgVolume30
  floatRotation: number; // volume / floatShares
  dollarVolume: number; // price * volume
  gapPercent: number; // (open - prevClose) / prevClose
  distanceFromVwap: number; // (price - vwap) / vwap
  distanceFromHod: number; // (price - dayHigh) / dayHigh
  relativeStrengthVsSpy: number; // stock change% - SPY change%
  vwapHoldPercent: number; // % of bars today where price stayed above VWAP
  orb5Breakout: boolean;
  orb15Breakout: boolean;
  orb30Breakout: boolean;
  haltCount: number;
  isNearFiftyTwoWeekHigh: boolean; // within 1% of 52w high
  brokeFiftyTwoWeekHigh: boolean;
  isNearPriorHigh: boolean; // broke yesterday's high (전고 돌파 proxy)
  volumeTrend: 'increasing' | 'decreasing' | 'flat';
  dilutionRisk: boolean;
}

/** Score breakdown by category, mirrors the spec's weighting. */
export interface ScoreBreakdown {
  floatRotation: number; // max 35
  rvol: number; // max 20
  vwapStrength: number; // max 15
  orb: number; // max 10
  gapStrength: number; // max 10
  shortInterest: number; // max 10
  bonuses: {
    halt: number;
    fiftyTwoWeekHigh: number;
    priorHighBreak: number;
    sectorStrength: number;
    relativeStrength: number;
  };
  penalties: {
    vwapBreakdown: number;
    pullbackFromHigh: number;
    volumeDecline: number;
    dilutionRisk: number;
  };
  total: number; // clamped 0-100
}

export type Grade = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C';

export interface BuySignal {
  active: boolean;
  reasons: string[];
}

export interface SellTargets {
  target1: number; // entry price * 1.10
  target2: number; // entry price * 1.20
  target3Label: string; // "VWAP trail"
}

/** Fully processed stock entry, ready for display/ranking. */
export interface MonsterStock extends RawQuote {
  derived: DerivedMetrics;
  score: ScoreBreakdown;
  grade: Grade;
  buySignal: BuySignal;
  sellTargets: SellTargets;
  passedFilter: boolean;
  filterRejectReasons: string[];
}

/** Response shape for /api/scan */
export interface ScanResponse {
  generatedAt: number;
  count: number;
  stocks: MonsterStock[];
  source: 'live' | 'cached' | 'mock';
  warnings?: string[];
}

export interface HaltEvent {
  ticker: string;
  companyName: string;
  haltTime: number;
  resumeTime: number | null;
  reasonCode: string;
  haltCount: number;
}

export type ScannerKey =
  | 'dashboard'
  | 'premarket'
  | 'monster'
  | 'orb'
  | 'vwap'
  | 'float-rotation'
  | 'halts'
  | 'watchlist';

export interface FilterConfig {
  minPrice: number;
  maxPrice: number;
  maxMarketCap: number;
  minDollarVolume: number;
  maxFloatShares: number;
  requireVolumeAboveAvg: boolean;
}

export const DEFAULT_FILTER: FilterConfig = {
  minPrice: 1,
  maxPrice: 50,
  maxMarketCap: 1_000_000_000,
  minDollarVolume: 10_000_000,
  maxFloatShares: 100_000_000,
  requireVolumeAboveAvg: true,
};
