'use client';

import { useScan } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { SectionHeader, EmptyState } from '@/components/ui/atoms';
import type { MonsterStock } from '@/types/stock';

function premarketFilter(s: MonsterStock): boolean {
  return s.premarketChange != null && Math.abs(s.premarketChange) >= 5;
}

export default function PremarketPage() {
  const { data, isLoading } = useScan();

  const allStocks = data?.stocks ?? [];
  const premarketStocks = allStocks
    .filter(premarketFilter)
    .sort((a, b) => Math.abs(b.premarketChange ?? 0) - Math.abs(a.premarketChange ?? 0));

  return (
    <div className="p-4 space-y-4 max-w-[1600px]">
      <div>
        <h1 className="text-base font-bold text-foreground">🌅 Premarket Scanner</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Stocks with significant pre-market moves (±5%+). Pre-market catalysts often set the day's direction.
        </p>
      </div>

      {/* Tip box */}
      <div className="p-3 rounded border border-primary/20 bg-primary/5 text-[11px] text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">💡 Pre-Market Strategy</p>
        <p>Look for: <strong className="text-foreground">large gap-up + news catalyst + low float</strong>. The best setups have a clear catalyst (FDA approval, earnings beat, contract win) combined with a very low float that can cause exponential moves.</p>
        <p>Watch for: <strong className="text-foreground">fakeouts near open</strong>. Wait for the first 5-15 min ORB to form before entering.</p>
      </div>

      <SectionHeader title="Pre-Market Movers" count={premarketStocks.length} subtitle="sorted by pre-market change%" />

      {premarketStocks.length === 0 && !isLoading ? (
        <EmptyState message="No pre-market movers detected. Data may be unavailable outside of pre-market hours (4:00–9:30 AM ET)." />
      ) : (
        <ScannerTable
          stocks={premarketStocks}
          isLoading={isLoading}
          columns={['rank', 'ticker', 'price', 'premarket', 'change', 'gap', 'score', 'grade', 'float', 'volume', 'shortInterest', 'signal', 'watchlist']}
          defaultSort="premarket"
          showSearch
        />
      )}
    </div>
  );
}
