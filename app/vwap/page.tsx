'use client';

import { useState } from 'react';
import { useScan } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { SectionHeader, EmptyState } from '@/components/ui/atoms';
import { cn } from '@/lib/utils/format';
import type { MonsterStock } from '@/types/stock';

type VwapFilter = 'above' | 'holding' | 'reclaim' | 'below';

function getVwapFilter(mode: VwapFilter) {
  return (s: MonsterStock) => {
    const hold = s.derived.vwapHoldPercent;
    const dist = s.derived.distanceFromVwap;
    switch (mode) {
      case 'above':   return dist > 0;
      case 'holding': return hold >= 70 && dist > -0.02;
      case 'reclaim': return hold >= 40 && hold < 70 && dist > -0.01;
      case 'below':   return dist < -0.01;
    }
  };
}

const FILTER_LABELS: Record<VwapFilter, { label: string; desc: string; color: string }> = {
  above: { label: 'Above VWAP', desc: 'Price > VWAP right now', color: 'text-bull border-bull/30 bg-bull/10' },
  holding: { label: 'Holding VWAP', desc: '≥70% of session above VWAP', color: 'text-accent border-accent/30 bg-accent/10' },
  reclaim: { label: 'Reclaiming', desc: '40-70% above, near VWAP now', color: 'text-warn border-warn/30 bg-warn/10' },
  below: { label: 'Below VWAP', desc: 'Price < VWAP (avoid)', color: 'text-bear border-bear/30 bg-bear/10' },
};

export default function VwapPage() {
  const { data, isLoading } = useScan();
  const [mode, setMode] = useState<VwapFilter>('holding');

  const allStocks = (data?.stocks ?? []).filter((s) => s.passedFilter);
  const filtered = allStocks
    .filter(getVwapFilter(mode))
    .sort((a, b) => {
      if (mode === 'below') return a.derived.distanceFromVwap - b.derived.distanceFromVwap;
      return b.derived.vwapHoldPercent - a.derived.vwapHoldPercent;
    });

  return (
    <div className="p-4 space-y-4 max-w-[1600px]">
      <div>
        <h1 className="text-base font-bold text-foreground">🌊 VWAP Scanner</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Volume-Weighted Average Price analysis — the single most important intraday level for momentum traders.
        </p>
      </div>

      <div className="p-3 rounded border border-border/40 bg-muted/10 text-[11px] text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">💡 VWAP Strategy</p>
        <p>Stocks that <strong className="text-foreground">hold above VWAP for 70%+ of the session</strong> show institutional accumulation. The best momentum names reclaim VWAP after a pullback then surge to new highs. Avoid stocks that have lost VWAP and can't reclaim it.</p>
      </div>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(FILTER_LABELS) as [VwapFilter, typeof FILTER_LABELS[VwapFilter]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all',
              mode === key
                ? meta.color
                : 'bg-muted/30 text-muted-foreground border-border/50 hover:text-foreground'
            )}
          >
            <span>{meta.label}</span>
            <span className="ml-1 font-normal text-[10px] opacity-70">{meta.desc}</span>
          </button>
        ))}
      </div>

      <SectionHeader
        title={FILTER_LABELS[mode].label}
        subtitle={FILTER_LABELS[mode].desc}
        count={filtered.length}
      />

      {filtered.length === 0 && !isLoading ? (
        <EmptyState message="No stocks match this VWAP filter." />
      ) : (
        <ScannerTable
          stocks={filtered}
          isLoading={isLoading}
          columns={['rank', 'ticker', 'price', 'change', 'vwap', 'vwapHold', 'score', 'grade', 'rvol', 'floatRotation', 'volume', 'orb', 'signal', 'watchlist']}
          defaultSort="vwapHold"
          showSearch
        />
      )}
    </div>
  );
}
