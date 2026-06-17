/**
 * GET /api/quote?symbols=AAPL,TSLA,...
 * Returns raw quotes for arbitrary symbols (used by watchlist page).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbolsParam = url.searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols query param required' }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 100); // hard cap

  try {
    const useMock = process.env.NEXT_PUBLIC_MOCK_DATA === 'true';
    if (useMock) {
      const { generateMockStocks } = await import('@/lib/data/mockData');
      return NextResponse.json({ quotes: generateMockStocks(symbols.length), source: 'mock' });
    }

    const { fetchQuotes } = await import('@/lib/data/yahoo');
    const quotes = await fetchQuotes(symbols);
    return NextResponse.json({ quotes, source: 'live' }, {
      headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=20' },
    });
  } catch (err) {
    console.error('[/api/quote] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
