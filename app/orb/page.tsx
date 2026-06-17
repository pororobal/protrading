'use client';

import { useState } from 'react';
import { useOrbStocks, useScan } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { SectionHeader, EmptyState } from '@/components/ui/atoms';
import { cn } from '@/lib/utils/format';
import type { MonsterStock } from '@/types/stock';

type OrbWindow = '5m' | '15m' | '30m' | 'any';

function orbFilter(window: OrbWindow) {
  return (s: MonsterStock) => {
    if (window === '5m') return s.derived.orb5Breakout;
    if (window === '15m') return s.derived.orb15Breakout;
    if (window === '30m') return s.derived.orb30Breakout;
    return s.derived.orb5Breakout || s.derived.orb15Breakout || s.derived.orb30Breakout;
  };
}

export default function OrbPage() {
  const { data, isLoading } = useScan();
  const [window, setWindow] = useState<OrbWindow>('any');

  const allStocks = data?.stocks ?? [];
  const filtered = allStocks.filter((s) => s.passedFilter).filter(orbFilter(window));

  return (
    <div className="p-4 space-y-4 max-w-[1600px]">
      <div>
        <h1 className="text-base font-bold text-foreground">📊 ORB Scanner</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Opening Range Breakout — stocks that have broken above their early-session high with confirmed volume.
        </p>
      </div>

      {/* Educational callout */}
      <div className="p-3 rounded border border-accent/20 bg-accent/5 text-[11px] text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">📖 ORB Explained</p>
        <p><strong className="text-foreground">5-min ORB:</strong> Aggressive entry, highest risk. Best for stocks already in strong momentum with high RVOL.</p>
        <p><strong className="text-foreground">15-min ORB:</strong> Standard setup. Wait for the 9:30–9:45 range to establish then buy breakout with volume confirmation.</p>
        <p><strong className="text-foreground">30-min ORB:</strong> Conservative. More reliable breakout signal but you give up some of the initial move.</p>
      </div>

      {/* Window filter */}
      <div className="flex gap-2">
        {(['any', '5m', '15m', '30m'] as OrbWindow[]).map((w) => (
          <button
            key={w}
            onClick={() => setWindow(w)}
            className={cn(
              'px-3 py-1 rounded text-xs font-mono font-bold border transition-colors',
              window === w
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-muted/30 text-muted-foreground border-border/50 hover:text-foreground'
            )}
          >
            {w === 'any' ? 'Any ORB' : `${w} ORB`}
          </button>
        ))}
      </div>

      <SectionHeader title={`ORB Breakouts (${window})`} count={filtered.length} />

      {filtered.length === 0 && !isLoading ? (
        <EmptyState message="No ORB breakouts detected. Check back after 9:45–10:00 AM ET." />
      ) : (
        <ScannerTable
          stocks={filtered}
          isLoading={isLoading}
          columns={['rank', 'ticker', 'price', 'change', 'score', 'grade', 'rvol', 'floatRotation', 'volume', 'dollarVolume', 'gap', 'orb', 'vwap', 'signal', 'watchlist']}
          defaultSort="score"
          showSearch
        />
      )}
    </div>
  );
}
