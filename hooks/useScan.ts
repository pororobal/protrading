'use client';

import useSWR from 'swr';
import type { ScanResponse, MonsterStock } from '@/types/stock';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const REFRESH_INTERVAL = 60_000; // 1 minute — matches spec requirement

/** Fetch the full scan (sorted by Monster Score). Auto-refreshes every 60s. */
export function useScan() {
  return useSWR<ScanResponse>('/api/scan', fetcher, {
    refreshInterval: REFRESH_INTERVAL,
    revalidateOnFocus: true,
    dedupingInterval: 15_000,
    keepPreviousData: true,
  });
}

/**
 * Filtered/sorted subsets from the scan — avoids multiple API calls.
 * All derived from the single useScan() call (SWR deduplication ensures one
 * network request even when multiple components call these hooks).
 */
export function useTopMonster(limit = 10): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.passedFilter)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, limit);
  return { stocks, isLoading, error };
}

export function useTopFloatRotation(limit = 10): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.passedFilter)
    .sort((a, b) => b.derived.floatRotation - a.derived.floatRotation)
    .slice(0, limit);
  return { stocks, isLoading, error };
}

export function useTopRvol(limit = 10): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.passedFilter)
    .sort((a, b) => b.derived.rvol - a.derived.rvol)
    .slice(0, limit);
  return { stocks, isLoading, error };
}

export function useTopGapUp(limit = 10): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.passedFilter && s.derived.gapPercent > 0)
    .sort((a, b) => b.derived.gapPercent - a.derived.gapPercent)
    .slice(0, limit);
  return { stocks, isLoading, error };
}

export function usePremarketMovers(limit = 10): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.premarketChange != null && Math.abs(s.premarketChange) >= 5)
    .sort((a, b) => Math.abs(b.premarketChange ?? 0) - Math.abs(a.premarketChange ?? 0))
    .slice(0, limit);
  return { stocks, isLoading, error };
}

export function useOrbStocks(): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.passedFilter && (s.derived.orb5Breakout || s.derived.orb15Breakout || s.derived.orb30Breakout))
    .sort((a, b) => b.score.total - a.score.total);
  return { stocks, isLoading, error };
}

export function useVwapStocks(): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.passedFilter && s.derived.distanceFromVwap > -0.01)
    .sort((a, b) => b.derived.vwapHoldPercent - a.derived.vwapHoldPercent);
  return { stocks, isLoading, error };
}

export function useShortSqueezeStocks(limit = 10): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.passedFilter && (s.shortInterest ?? 0) >= 15)
    .sort((a, b) => (b.shortInterest ?? 0) - (a.shortInterest ?? 0))
    .slice(0, limit);
  return { stocks, isLoading, error };
}

export function useHaltStocks(): { stocks: MonsterStock[]; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useScan();
  const stocks = (data?.stocks ?? [])
    .filter((s) => s.derived.haltCount > 0)
    .sort((a, b) => b.derived.haltCount - a.derived.haltCount);
  return { stocks, isLoading, error };
}

/** Last updated timestamp */
export function useLastUpdated(): number | null {
  const { data } = useScan();
  return data?.generatedAt ?? null;
}
