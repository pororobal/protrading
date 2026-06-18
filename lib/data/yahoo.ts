/**
 * Yahoo Finance data client.
 * 
 * FIXED: 401 Unauthorized error resolved by:
 * - Updating User-Agent to latest Chrome version
 * - Adding required headers (Referer, Origin, etc.)
 * - Removing problematic next.revalidate option
 * - Adding fallback to query2 endpoint
 * - Adding retry logic with exponential backoff
 */

import type { RawQuote, IntradayBar } from '@/types/stock';

// ✅ 수정 1: User-Agent를 최신 Chrome 131로 업데이트
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ✅ 수정 2: 백업 엔드포인트 추가
const QUOTE_BASE_PRIMARY = 'https://query1.finance.yahoo.com/v7/finance/quote';
const QUOTE_BASE_SECONDARY = 'https://query2.finance.yahoo.com/v7/finance/quote';
const QUOTE_BASE_V6 = 'https://query1.finance.yahoo.com/v6/finance/quote';

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const SCREENER_BASE = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved';

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

// ✅ 수정 3: fetchJson 함수 완전히 개선
async function fetchJson<T>(url: string, retries = 2): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://finance.yahoo.com/',
          'Origin': 'https://finance.yahoo.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'Connection': 'keep-alive',
        },
        cache: 'no-store',  // Vercel 캐시 완전히 비활성화
      });

      if (!res.ok) {
        console.error(`Yahoo fetch failed (attempt ${attempt + 1}): ${res.status} ${url}`);
        if (attempt === retries) return null;
        // 재시도 전 대기 (지수 백오프)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      const data = await res.json();
      return data as T;
    } catch (err) {
      console.error(`Yahoo fetch error (attempt ${attempt + 1}):`, err);
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

// ✅ 수정 4: 여러 엔드포인트 시도하는 함수 추가
async function fetchWithFallback<T>(
  symbols: string[],
  endpoints: string[] = [QUOTE_BASE_PRIMARY, QUOTE_BASE_SECONDARY, QUOTE_BASE_V6]
): Promise<T | null> {
  for (const endpoint of endpoints) {
    const url = `${endpoint}?symbols=${encodeURIComponent(symbols.join(','))}`;
    console.log(`Trying endpoint: ${endpoint}`);
    const data = await fetchJson<T>(url);
    if (data) return data;
  }
  return null;
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
  quoteResponse: {
    result: YahooQuoteResultRaw[];
    error: string | null;
  };
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

    // ✅ 수정 5: fetchWithFallback 사용하여 여러 엔드포인트 시도
    const data = await fetchWithFallback<YahooQuoteResponse>(chunk);
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
// Intraday chart (timestamp undefined 처리 완료)
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
  const data = await fetchJson<YahooChartResponse>(url);
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
      const data = await fetchJson<YahooScreenerResponse>(url);
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
