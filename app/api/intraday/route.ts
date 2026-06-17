/**
 * GET /api/intraday?symbol=AAPL
 * Returns 1-minute intraday bars for charting.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'symbol query param required' }, { status: 400 });
  }

  try {
    const { fetchIntradayBars } = await import('@/lib/data/yahoo');
    const bars = await fetchIntradayBars(symbol.toUpperCase());
    return NextResponse.json({ symbol, bars, source: 'live' }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[/api/intraday] Error:', err);
    return NextResponse.json({ bars: [], source: 'error' }, { status: 200 });
  }
}
