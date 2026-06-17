'use client';

import { useState } from 'react';
import { useScan } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { SectionHeader, EmptyState, MetricPill } from '@/components/ui/atoms';
import { fmt, cn } from '@/lib/utils/format';
import type { MonsterStock } from '@/types/stock';

type FloatTier = 'all' | 'micro' | 'low' | 'medium';

const FLOAT_TIERS: Record<FloatTier, { label: string; desc: string; min: number; max: number }> = {
  all: { label: 'All Floats', desc: '< 100M shares', min: 0, max: 1e9 },
  micro: { label: 'Micro Float', desc: '< 5M shares', min: 0, max: 5e6 },
  low: { label: 'Low Float', desc: '5M – 20M shares', min: 5e6, max: 20e6 },
  medium: { label: 'Medium Float', desc: '20M – 100M shares', min: 20e6, max: 100e6 },
};

export default function FloatRotationPage() {
  const { data, isLoading } = useScan();
  const [tier, setTier] = useState<FloatTier>('all');
  const [minRotation, setMinRotation] = useState(1);

  const { min, max } = FLOAT_TIERS[tier];
  const filtered = (data?.stocks ?? [])
    .filter((s) => s.passedFilter)
    .filter((s) => {
      const f = s.floatShares ?? 0;
      return f >= min && f <= max && s.derived.floatRotation >= minRotation;
    })
    .sort((a, b) => b.derived.floatRotation - a.derived.floatRotation);

  return (
    <div className="p-4 space-y-4 max-w-[1600px]">
      <div>
        <h1 className="text-base font-bold text-foreground">🔄 유동회전율 스캐너</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Float rotation = today's volume ÷ float shares. 10x+ means the entire float has traded 10 times — extraordinary conviction.
        </p>
      </div>

      <div className="p-3 rounded border border-border/40 bg-muted/10 text-[11px] space-y-1">
        <p className="font-semibold text-foreground">💡 Float Rotation Explained</p>
        <p className="text-muted-foreground">
          <strong className="text-foreground">1x</strong> = entire float traded once (active). &nbsp;
          <strong className="text-foreground">5x</strong> = exceptional (stock is being chased). &nbsp;
          <strong className="text-foreground">10x+</strong> = short squeeze / panic buying territory. &nbsp;
          <strong className="text-foreground">20x+</strong> = historic — monster run potential.
        </p>
        <p className="text-muted-foreground">
          Micro-float stocks (under 5M shares) with 5x+ rotation on a catalyst are the highest-probability setups in this scanner.
        </p>
      </div>

      {/* Float tier filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-muted-foreground font-mono">Float size:</span>
        {(Object.entries(FLOAT_TIERS) as [FloatTier, typeof FLOAT_TIERS[FloatTier]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setTier(key)}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors',
              tier === key
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-muted/30 text-muted-foreground border-border/50 hover:text-foreground'
            )}
          >
            {meta.label} <span className="font-normal opacity-60">({meta.desc})</span>
          </button>
        ))}
      </div>

      {/* Min rotation filter */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">Min rotation:</span>
        {[1, 3, 5, 10, 20].map((n) => (
          <button
            key={n}
            onClick={() => setMinRotation(n)}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors',
              minRotation === n
                ? 'bg-bull/15 text-bull border-bull/40'
                : 'bg-muted/30 text-muted-foreground border-border/50 hover:text-foreground'
            )}
          >
            {n}x+
          </button>
        ))}
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <MetricPill label="Showing" value={`${filtered.length} stocks`} />
          <MetricPill label="Top Rotation" value={fmt.multiplier(filtered[0]?.derived.floatRotation ?? 0)} highlight />
          <MetricPill label="Avg Float" value={fmt.float(filtered.reduce((s, st) => s + (st.floatShares ?? 0), 0) / filtered.length)} />
        </div>
      )}

      <SectionHeader title="Float Rotation Ranking" count={filtered.length} />

      {filtered.length === 0 && !isLoading ? (
        <EmptyState message="No stocks match the current float rotation filters." />
      ) : (
        <ScannerTable
          stocks={filtered}
          isLoading={isLoading}
          columns={['rank', 'ticker', 'price', 'change', 'floatRotation', 'float', 'rvol', 'volume', 'dollarVolume', 'score', 'grade', 'gap', 'shortInterest', 'signal', 'watchlist']}
          defaultSort="floatRotation"
          showSearch
        />
      )}
    </div>
  );
}
