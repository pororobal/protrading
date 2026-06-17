/**
 * GET /api/scan
 *
 * Returns MonsterStock[] sorted by Monster Score.
 * Falls back to mock data when:
 *   - NEXT_PUBLIC_MOCK_DATA=true (local dev / demo)
 *   - Yahoo Finance is unreachable
 *   - No stocks pass the primary filter (e.g. after-hours, empty screeners)
 */

import { NextResponse } from 'next/server';
import type { ScanResponse } from '@/types/stock';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Vercel function timeout: max 30s on Hobby, 60s on Pro
export const maxDuration = 30;

export async function GET() {
  const useMock =
    process.env.NEXT_PUBLIC_MOCK_DATA === 'true' ||
    process.env.NODE_ENV === 'development';

  try {
    if (useMock) {
      const { generateMockStocks } = await import('@/lib/data/mockData');
      const stocks = generateMockStocks(20);
      const response: ScanResponse = {
        generatedAt: Date.now(),
        count: stocks.length,
        stocks,
        source: 'mock',
        warnings: ['Running in demo mode — data is simulated'],
      };
      return NextResponse.json(response);
    }

    const { runScanPipeline } = await import('@/lib/data/scanPipeline');
    const stocks = await runScanPipeline();

    if (stocks.length === 0) {
      // Graceful fallback if scan returns nothing (e.g. market closed, rate
      // limited by Yahoo)
      const { generateMockStocks } = await import('@/lib/data/mockData');
      const mockStocks = generateMockStocks(20);
      const response: ScanResponse = {
        generatedAt: Date.now(),
        count: mockStocks.length,
        stocks: mockStocks,
        source: 'mock',
        warnings: [
          'Live scan returned no results — displaying demo data.',
          'This may happen after market hours or if Yahoo Finance is rate-limiting requests.',
        ],
      };
      return NextResponse.json(response);
    }

    const response: ScanResponse = {
      generatedAt: Date.now(),
      count: stocks.length,
      stocks,
      source: 'live',
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 's-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    console.error('[/api/scan] Error:', err);

    // Always return valid JSON with mock data rather than a 500 — the scanner
    // UI should never hard-crash.
    const { generateMockStocks } = await import('@/lib/data/mockData');
    const mockStocks = generateMockStocks(20);
    const response: ScanResponse = {
      generatedAt: Date.now(),
      count: mockStocks.length,
      stocks: mockStocks,
      source: 'mock',
      warnings: [
        'Live data unavailable — displaying demo data.',
        err instanceof Error ? err.message : 'Unknown error',
      ],
    };
    return NextResponse.json(response, { status: 200 });
  }
}
