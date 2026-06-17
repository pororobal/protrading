/**
 * Yahoo Finance data client.
 */
import type { RawQuote, IntradayBar } from '@/types/stock';

const QUOTE_BASE = 'https://query1.finance.yahoo.com/v7/finance/quote';
const QUOTE_SUMMARY_BASE = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';
const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const SCREENER_BASE = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

type CacheEntry<T> = { data: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

async function fetchJson<T>(url: string, revalidateSeconds = 15): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) {
      console.error(`Yahoo fetch failed: ${res.status} ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error('Yahoo fetch error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Quote batch
// ---------------------------------------------------------------------------

interface YahooQuoteResultRaw {
  symbol: string;
  longName?: string;
  shortName?: string;
  fullExchangeName?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  sharesOutstanding?: number;
  vwap?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  preMarketPrice?: number;
  preMarketChangePercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  floatShares?: number;
  sharesShort?: number;
  shortPercentFloat?: number;
}

interface YahooQuoteResponse {
  quoteResponse: { result: YahooQuoteResultRaw[]; error: string | null };
}

function mapExchange(fullExchangeName?: string): RawQuote['exchange'] {
  if (!fullExchangeName) return 'OTHER';
  const ex = fullExchangeName.toUpperCase();
  if (ex.includes('NASDAQ')) return 'NASDAQ';
  if (ex.includes('NYSE') && !ex.includes('AMEX')) return 'NYSE';
  if (ex.includes('AMEX') || ex.includes('NYSE MKT') || ex.includes('NYSEAMERICAN')) return 'AMEX';
  return 'OTHER';
}

export async function fetchQuotes(symbols: string[]): Promise<RawQuote[]> {
  if (symbols.length === 0) return [];

  const chunks: string[][] = [];
  const CHUNK_SIZE = 50;
  for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
    chunks.push(symbols.slice(i, i + CHUNK_SIZE));
  }

  const results: RawQuote[] = [];

  for (const chunk of chunks) {
    const cacheKey = `quotes:${chunk.join(',')}`;
    const cached = getCached<RawQuote[]>(cacheKey);
    if (cached) {
      results.push(...cached);
      continue;
    }

    const url = `${QUOTE_BASE}?symbols=${encodeURIComponent(chunk.join(','))}`;
    const data = await fetchJson<YahooQuoteResponse>(url, 10);
    if (!data?.quoteResponse?.result) continue;

    const mapped: RawQuote[] = data.quoteResponse.result.map((q) => {
      const price = q.regularMarketPrice ?? 0;
      const prevClose = q.regularMarketPreviousClose ?? price;
      return {
        ticker: q.symbol,
        companyName: q.longName ?? q.shortName ?? q.symbol,
        exchange: mapExchange(q.fullExchangeName),
        price,
        prevClose,
        changePercent: q.regularMarketChangePercent ?? 0,
        marketCap: q.marketCap ?? 0,
        volume: q.regularMarketVolume ?? 0,
        avgVolume30: q.averageDailyVolume3Month ?? 0,
        floatShares: q.floatShares ?? null,
        sharesOutstanding: q.sharesOutstanding ?? null,
        shortInterest: q.shortPercentFloat != null ? q.shortPercentFloat * 100 : null,
        vwap: q.vwap ?? null,
        dayHigh: q.regularMarketDayHigh ?? price,
        dayLow: q.regularMarketDayLow ?? price,
        open: q.regularMarketOpen ?? price,
        premarketPrice: q.preMarketPrice ?? null,
        premarketChange: q.preMarketChangePercent ?? null,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? price,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? price,
        updatedAt: Date.now(),
      };
    });

    setCached(cacheKey, mapped, 10_000);
    results.push(...mapped);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Intraday chart (수정: timestamp undefined 처리)
// ---------------------------------------------------------------------------

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
        vwap?: Array<{ vwap: number[] }>;
      };
    }> | null;
    error: unknown;
  };
}

export async function fetchIntradayBars(symbol: string): Promise<IntradayBar[]> {
  const cacheKey = `intraday:${symbol}`;
  const cached = getCached<IntradayBar[]>(cacheKey);
  if (cached) return cached;

  const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=true`;
  const data = await fetchJson<YahooChartResponse>(url, 30);
  const result = data?.chart?.result?.[0];
  if (!result || !result.timestamp) return [];

  const { timestamp, indicators } = result;
  const quote = indicators.quote?.[0];
  if (!quote) return [];

  const bars: IntradayBar[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    const close = quote.close[i];
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const volume = quote.volume[i];
    const time = timestamp[i];
    if (close == null || open == null || time == null) continue;
    bars.push({
      time: time,
      open,
      high: high ?? open,
      low: low ?? open,
      close,
      volume: volume ?? 0,
    });
  }

  setCached(cacheKey, bars, 30_000);
  return bars;
}

// ---------------------------------------------------------------------------
// Symbol universe
// ---------------------------------------------------------------------------

interface YahooScreenerResponse {
  finance: {
    result: Array<{ quotes: Array<{ symbol: string }> }>;
  };
}

const PREDEFINED_SCREENERS = [
  'day_gainers',
  'most_actives',
  'small_cap_gainers',
  'undervalued_growth_stocks',
] as const;

export async function fetchScreenerSymbols(): Promise<string[]> {
  const cacheKey = 'screener:universe';
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  const symbolSet = new Set<string>();

  await Promise.all(
    PREDEFINED_SCREENERS.map(async (scrId) => {
      const url = `${SCREENER_BASE}?scrIds=${scrId}&count=100`;
      const data = await fetchJson<YahooScreenerResponse>(url, 60);
      const quotes = data?.finance?.result?.[0]?.quotes ?? [];
      for (const q of quotes) {
        if (q.symbol) symbolSet.add(q.symbol);
      }
    })
  );

  const symbols = Array.from(symbolSet);
  setCached(cacheKey, symbols, 60_000);
  return symbols;
}

export async function fetchSpyChangePercent(): Promise<number> {
  const cacheKey = 'spy:change';
  const cached = getCached<number>(cacheKey);
  if (cached != null) return cached;

  const quotes = await fetchQuotes(['SPY']);
  const change = quotes[0]?.changePercent ?? 0;
  setCached(cacheKey, change, 10_000);
  return change;
}
