'use client';

import { useEffect, useState } from 'react';
import { useWatchlistStore } from '@/lib/store/watchlist';
import { useScan } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { SectionHeader, EmptyState, GradeBadge, ChangeCell } from '@/components/ui/atoms';
import { ScoreDetailPanel } from '@/components/scanner/ScoreDetailPanel';
import { fmt, cn } from '@/lib/utils/format';
import type { MonsterStock } from '@/types/stock';
import { Star, Trash2, X } from 'lucide-react';

export default function WatchlistPage() {
  const { items, remove, clear, updateNotes } = useWatchlistStore();
  const { data, isLoading } = useScan();
  const [selected, setSelected] = useState<MonsterStock | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const watchlistTickers = new Set(items.map((i) => i.ticker));
  const watchlistStocks = (data?.stocks ?? []).filter((s) => watchlistTickers.has(s.ticker));

  // Stocks in watchlist but not yet in scan data
  const missingTickers = items.filter((i) => !watchlistStocks.some((s) => s.ticker === i.ticker));

  return (
    <div className="p-4 space-y-4 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground">⭐ Watchlist</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your saved stocks. Add any ticker via the ★ column in any scanner.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => { if (confirm('Clear all watchlist items?')) clear(); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-bear transition-colors"
          >
            <Trash2 size={12} />
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Star size={36} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Your watchlist is empty</p>
          <p className="text-xs text-muted-foreground/70">
            Click the ★ icon on any stock in the scanner tables to add it here.
          </p>
        </div>
      ) : (
        <div className={cn('grid gap-4', selected ? 'grid-cols-1 xl:grid-cols-[1fr_280px]' : 'grid-cols-1')}>
          <div className="space-y-4">
            <SectionHeader title="Saved Stocks" count={watchlistStocks.length} />

            {watchlistStocks.length > 0 && (
              <ScannerTable
                stocks={watchlistStocks}
                isLoading={isLoading}
                columns={['rank', 'ticker', 'price', 'change', 'score', 'grade', 'rvol', 'floatRotation', 'float', 'gap', 'orb', 'vwapHold', 'signal', 'watchlist']}
                showSearch={false}
              />
            )}

            {/* Watchlist items with notes */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
              {items.map((item) => {
                const stock = watchlistStocks.find((s) => s.ticker === item.ticker);
                return (
                  <div
                    key={item.ticker}
                    className="flex items-start gap-2 p-2.5 rounded border border-border/40 bg-muted/10"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-xs text-foreground">{item.ticker}</span>
                        {stock && <GradeBadge grade={stock.grade} />}
                        {stock && <ChangeCell value={stock.changePercent} className="text-[10px]" />}
                      </div>
                      {editingNotes === item.ticker ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            defaultValue={item.notes}
                            onBlur={(e) => {
                              updateNotes(item.ticker, e.target.value);
                              setEditingNotes(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateNotes(item.ticker, e.currentTarget.value);
                                setEditingNotes(null);
                              }
                              if (e.key === 'Escape') setEditingNotes(null);
                            }}
                            className="flex-1 text-[10px] bg-muted border border-border rounded px-2 py-0.5 outline-none focus:border-primary/50 font-mono"
                            placeholder="Add notes (e.g. catalyst, entry plan)…"
                          />
                        </div>
                      ) : (
                        <p
                          onClick={() => setEditingNotes(item.ticker)}
                          className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        >
                          {item.notes || <span className="opacity-40 italic">Click to add notes…</span>}
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground/40 mt-0.5 font-mono">
                        Added {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {stock && (
                        <button
                          onClick={() => setSelected(selected?.ticker === stock.ticker ? null : stock)}
                          className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border/50 hover:border-border transition-colors"
                        >
                          Detail
                        </button>
                      )}
                      <button
                        onClick={() => remove(item.ticker)}
                        className="text-muted-foreground hover:text-bear transition-colors p-1"
                        title="Remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Missing tickers */}
            {missingTickers.length > 0 && (
              <div className="p-2 rounded border border-warn/20 bg-warn/5 text-[10px] text-warn font-mono">
                ⚠️ Not found in current scan: {missingTickers.map((i) => i.ticker).join(', ')}
                <span className="text-muted-foreground ml-1">(may be filtered out or not in universe)</span>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="xl:sticky xl:top-0 self-start">
              <div className="rounded border border-border/50 bg-card p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detail</p>
                  <button onClick={() => setSelected(null)} className="text-[10px] text-muted-foreground hover:text-foreground">
                    ✕
                  </button>
                </div>
                <ScoreDetailPanel stock={selected} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
