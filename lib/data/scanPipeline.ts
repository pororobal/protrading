/**
 * Main scan pipeline:
 *   1. Fetch symbol universe (screeners + seed list)
 *   2. Batch-quote all symbols
 *   3. Apply primary filter
 *   4. Fetch intraday bars for filtered stocks (parallel, limited concurrency)
 *   5. Compute derived metrics + Monster Score for each
 *   6. Return sorted MonsterStock[]
 */

import type { RawQuote, MonsterStock, DerivedMetrics } from '@/types/stock';
import { DEFAULT_FILTER } from '@/types/stock';
import { fetchQuotes, fetchIntradayBars, fetchScreenerSymbols, fetchSpyChangePercent } from '@/lib/data/yahoo';
import { LOW_FLOAT_SEED_UNIVERSE } from '@/lib/data/universe';
import { applyPrimaryFilter } from '@/lib/filters/primaryFilter';
import { computeDerivedMetrics } from '@/lib/scoring/derived';
import { computeMonsterScoreFull, gradeFromScore, computeBuySignal, computeSellTargets } from '@/lib/scoring/monsterScore';

/** Simple async concurrency limiter */
async function withConcurrencyLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Naive sector momentum boost: if multiple stocks in the same rough "sector"
 * (guessed from ticker patterns — replace with a proper sector map for
 * production) are all surging, add a bonus to each.
 */
function computeSectorBoosts(quotes: RawQuote[]): Map<string, number> {
  // Very rough sector bucketing by common suffix / name patterns
  const sectorMap = new Map<string, number>([
    ['BIO', 0],
    ['PHARM', 0],
    ['TECH', 0],
    ['ENERGY', 0],
    ['CANNABIS', 0],
  ]);

  const bioNames = /bio|pharma|therapeutics|genomics|oncology|medical/i;
  const energyNames = /energy|oil|gas|solar|lithium|mining/i;
  const cannabisNames = /cannabis|hemp|marijuana|thc|cbd/i;

  const assigned = new Map<string, string>();

  for (const q of quotes) {
    const name = q.companyName.toLowerCase();
    if (bioNames.test(name) || bioNames.test(q.ticker)) assigned.set(q.ticker, 'BIO');
    else if (energyNames.test(name)) assigned.set(q.ticker, 'ENERGY');
    else if (cannabisNames.test(name)) assigned.set(q.ticker, 'CANNABIS');
    else assigned.set(q.ticker, 'TECH');
  }

  const sectorSurgeCount = new Map<string, number>();
  for (const q of quotes) {
    const sec = assigned.get(q.ticker) ?? 'OTHER';
    if (q.changePercent >= 20) {
      sectorSurgeCount.set(sec, (sectorSurgeCount.get(sec) ?? 0) + 1);
    }
  }

  const result = new Map<string, number>();
  for (const q of quotes) {
    const sec = assigned.get(q.ticker) ?? 'OTHER';
    const surgeCount = sectorSurgeCount.get(sec) ?? 0;
    let boost = 0;
    if (surgeCount >= 5) boost = 10;
    else if (surgeCount >= 3) boost = 7;
    else if (surgeCount >= 2) boost = 5;
    result.set(q.ticker, boost);
  }
  return result;
}

export interface ScanOptions {
  includePremarket?: boolean;
  forceRefresh?: boolean;
}

export async function runScanPipeline(options: ScanOptions = {}): Promise<MonsterStock[]> {
  // 1. Build universe
  const [screenerSymbols, spyChange] = await Promise.all([
    fetchScreenerSymbols(),
    fetchSpyChangePercent(),
  ]);

  const allSymbols = Array.from(new Set([...screenerSymbols, ...LOW_FLOAT_SEED_UNIVERSE]));

  // 2. Fetch raw quotes
  const rawQuotes = await fetchQuotes(allSymbols);

  // 3. Apply primary filter
  const filtered: Array<{ quote: RawQuote; filterReasons: string[] }> = [];
  const rejected: Array<{ quote: RawQuote; filterReasons: string[] }> = [];

  for (const quote of rawQuotes) {
    const filterResult = applyPrimaryFilter(quote, DEFAULT_FILTER);
    if (filterResult.passed) {
      filtered.push({ quote, filterReasons: [] });
    } else {
      rejected.push({ quote, filterReasons: filterResult.reasons });
    }
  }

  // 4. Compute sector boosts across all raw quotes (not just filtered — use
  //    all to detect sector-wide moves)
  const sectorBoosts = computeSectorBoosts(rawQuotes);

  // 5. Fetch intraday bars for filtered stocks with concurrency limit
  const barMap = new Map<string, ReturnType<typeof fetchIntradayBars> extends Promise<infer T> ? T : never>();

  await withConcurrencyLimit(filtered, 8, async ({ quote }) => {
    const bars = await fetchIntradayBars(quote.ticker);
    barMap.set(quote.ticker, bars);
  });

  // 6. Score each filtered stock
  const monsterStocks: MonsterStock[] = filtered.map(({ quote }) => {
    const bars = barMap.get(quote.ticker) ?? [];
    const sectorBoost = sectorBoosts.get(quote.ticker) ?? 0;

    // Halt count: not tracked in Yahoo data — default 0; the /api/halts
    // endpoint can overlay real FINRA halt data and this will be non-zero.
    const haltCount = 0;

    const derived: DerivedMetrics = computeDerivedMetrics(
      quote,
      bars,
      spyChange,
      haltCount,
      sectorBoost
    );

    const score = computeMonsterScoreFull(quote, derived, sectorBoost);
    const grade = gradeFromScore(score.total);
    const buySignal = computeBuySignal(score, derived);
    const sellTargets = computeSellTargets(quote.price);

    return {
      ...quote,
      derived,
      score,
      grade,
      buySignal,
      sellTargets,
      passedFilter: true,
      filterRejectReasons: [],
    };
  });

  // Also include rejected stocks (passedFilter=false) for the full watchlist
  const rejectedStocks: MonsterStock[] = rejected.map(({ quote, filterReasons }) => {
    const derived = computeDerivedMetrics(quote, [], spyChange, 0, 0);
    const score = computeMonsterScoreFull(quote, derived);
    const grade = gradeFromScore(score.total);
    const buySignal = computeBuySignal(score, derived);
    const sellTargets = computeSellTargets(quote.price);

    return {
      ...quote,
      derived,
      score,
      grade,
      buySignal,
      sellTargets,
      passedFilter: false,
      filterRejectReasons: filterReasons,
    };
  });

  // Sort by Monster Score descending
  return [...monsterStocks, ...rejectedStocks].sort((a, b) => b.score.total - a.score.total);
}
