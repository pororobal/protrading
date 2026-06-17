'use client';

import { useScan, useTopMonster, useTopFloatRotation, useTopRvol, useTopGapUp, usePremarketMovers, useShortSqueezeStocks } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { SectionHeader, EmptyState, GradeBadge, ChangeCell, LiveDot } from '@/components/ui/atoms';
import { fmt, cn, changeColor } from '@/lib/utils/format';
import type { MonsterStock } from '@/types/stock';

// ---------------------------------------------------------------------------
// Mini ranking card (used in the top-row summary widgets)
// ---------------------------------------------------------------------------
function RankCard({ stock, rank }: { stock: MonsterStock; rank: number }) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded border transition-colors',
      stock.buySignal.active ? 'border-bull/30 bg-bull/5' : 'border-border/50 bg-muted/20'
    )}>
      <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs text-foreground">{stock.ticker}</span>
          <GradeBadge grade={stock.grade} />
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{stock.companyName}</p>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-mono font-bold text-primary">{fmt.score(stock.score.total)}</div>
        <ChangeCell value={stock.changePercent} className="text-[10px]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat widget cards in top summary row
// ---------------------------------------------------------------------------
function StatWidget({ label, value, sub, color = 'text-foreground' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="p-3 rounded border border-border/50 bg-card">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-xl font-mono font-black tabular-nums', color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useScan();
  const { stocks: topMonster } = useTopMonster(10);
  const { stocks: topFloat } = useTopFloatRotation(5);
  const { stocks: topRvol } = useTopRvol(5);
  const { stocks: topGap } = useTopGapUp(5);
  const { stocks: premarket } = usePremarketMovers(5);
  const { stocks: squeeze } = useShortSqueezeStocks(5);

  const passedCount = data?.stocks.filter((s) => s.passedFilter).length ?? 0;
  const buySignalCount = data?.stocks.filter((s) => s.buySignal.active).length ?? 0;
  const topScore = topMonster[0]?.score.total ?? 0;
  const topRvolVal = topRvol[0]?.derived.rvol ?? 0;

  return (
    <div className="p-4 space-y-5 max-w-[1600px]">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Real-time momentum overview — NASDAQ / NYSE / AMEX</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveDot active={!isLoading} />
          {data?.source === 'mock' && (
            <span className="text-[10px] font-mono bg-warn/10 text-warn border border-warn/30 px-2 py-0.5 rounded">
              DEMO MODE
            </span>
          )}
        </div>
      </div>

      {/* Warning banners */}
      {data?.warnings?.map((w) => (
        <div key={w} className="text-[11px] bg-warn/10 border border-warn/30 text-warn px-3 py-2 rounded font-mono">
          ⚠️ {w}
        </div>
      ))}

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatWidget label="Stocks Scanned" value={fmt.num(data?.count ?? 0)} sub="Passed primary filter" color="text-foreground" />
        <StatWidget label="Filter Pass" value={fmt.num(passedCount)} sub="Price / Float / Vol OK" color="text-accent" />
        <StatWidget label="Buy Signals" value={fmt.num(buySignalCount)} sub="Monster Score ≥ 85" color="text-bull" />
        <StatWidget label="Top Score" value={topScore > 0 ? fmt.score(topScore) : '—'} sub={topMonster[0]?.ticker ?? 'None'} color="text-primary" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Top Monster Stocks — full width */}
        <div className="xl:col-span-3">
          <SectionHeader title="🔥 Top Monster Stocks" count={topMonster.length} />
          <ScannerTable
            stocks={topMonster}
            isLoading={isLoading}
            columns={['rank', 'ticker', 'price', 'change', 'score', 'grade', 'rvol', 'floatRotation', 'float', 'volume', 'gap', 'orb', 'signal', 'watchlist']}
            showSearch={false}
          />
        </div>

        {/* Top Float Rotation */}
        <div>
          <SectionHeader title="⚡ Float Rotation" subtitle="volume / float" count={topFloat.length} />
          <div className="space-y-1.5">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
            ))}
            {!isLoading && topFloat.map((s, i) => (
              <div key={s.ticker} className="flex items-center gap-2 p-2 rounded border border-border/40 bg-muted/10">
                <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-mono font-bold text-xs">{s.ticker}</span>
                  <p className="text-[10px] text-muted-foreground truncate">{s.companyName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-xs text-bull">{fmt.multiplier(s.derived.floatRotation)}</p>
                  <p className="text-[10px] text-muted-foreground">Float: {fmt.float(s.floatShares)}</p>
                </div>
              </div>
            ))}
            {!isLoading && topFloat.length === 0 && <EmptyState message="No float rotation data" />}
          </div>
        </div>

        {/* Top RVOL */}
        <div>
          <SectionHeader title="📈 Top RVOL" subtitle="vs 30-day avg" count={topRvol.length} />
          <div className="space-y-1.5">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
            ))}
            {!isLoading && topRvol.map((s, i) => (
              <div key={s.ticker} className="flex items-center gap-2 p-2 rounded border border-border/40 bg-muted/10">
                <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-mono font-bold text-xs">{s.ticker}</span>
                  <p className="text-[10px] text-muted-foreground">{fmt.vol(s.volume)} shares</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-xs text-accent">{fmt.multiplier(s.derived.rvol)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg: {fmt.vol(s.avgVolume30)}</p>
                </div>
              </div>
            ))}
            {!isLoading && topRvol.length === 0 && <EmptyState message="No RVOL data" />}
          </div>
        </div>

        {/* Top Gap Up */}
        <div>
          <SectionHeader title="🚀 Top Gap Up" subtitle="vs prev close" count={topGap.length} />
          <div className="space-y-1.5">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
            ))}
            {!isLoading && topGap.map((s, i) => (
              <div key={s.ticker} className="flex items-center gap-2 p-2 rounded border border-border/40 bg-muted/10">
                <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-mono font-bold text-xs">{s.ticker}</span>
                  <p className="text-[10px] text-muted-foreground">Open: {fmt.price(s.open)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-xs text-bull">+{(s.derived.gapPercent * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Prev: {fmt.price(s.prevClose)}</p>
                </div>
              </div>
            ))}
            {!isLoading && topGap.length === 0 && <EmptyState message="No gap-up stocks" />}
          </div>
        </div>

        {/* Premarket movers */}
        <div>
          <SectionHeader title="🌅 Pre-Market Movers" count={premarket.length} />
          <div className="space-y-1.5">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
            ))}
            {!isLoading && premarket.map((s, i) => (
              <div key={s.ticker} className="flex items-center gap-2 p-2 rounded border border-border/40 bg-muted/10">
                <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-mono font-bold text-xs">{s.ticker}</span>
                  <p className="text-[10px] text-muted-foreground">{fmt.price(s.premarketPrice ?? 0)} PM</p>
                </div>
                <ChangeCell value={s.premarketChange ?? 0} className="text-xs font-bold" />
              </div>
            ))}
            {!isLoading && premarket.length === 0 && <EmptyState message="No pre-market movers" />}
          </div>
        </div>

        {/* Short squeeze */}
        <div>
          <SectionHeader title="💥 Short Squeeze" subtitle="SI ≥ 15%" count={squeeze.length} />
          <div className="space-y-1.5">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
            ))}
            {!isLoading && squeeze.map((s, i) => (
              <div key={s.ticker} className="flex items-center gap-2 p-2 rounded border border-border/40 bg-muted/10">
                <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-mono font-bold text-xs">{s.ticker}</span>
                  <p className="text-[10px] text-muted-foreground">Float: {fmt.float(s.floatShares)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-xs text-warn">{s.shortInterest?.toFixed(1)}% SI</p>
                  <ChangeCell value={s.changePercent} className="text-[10px]" />
                </div>
              </div>
            ))}
            {!isLoading && squeeze.length === 0 && <EmptyState message="No squeeze candidates" />}
          </div>
        </div>
      </div>
    </div>
  );
}
