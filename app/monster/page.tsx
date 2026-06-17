'use client';

import { useState } from 'react';
import { useScan } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { ScoreDetailPanel } from '@/components/scanner/ScoreDetailPanel';
import { SectionHeader, GradeBadge, ScoreBar } from '@/components/ui/atoms';
import { fmt, cn, GRADE_STYLES } from '@/lib/utils/format';
import type { MonsterStock, Grade } from '@/types/stock';

const GRADES: Grade[] = ['SSS', 'SS', 'S', 'A', 'B', 'C'];

export default function MonsterPage() {
  const { data, isLoading } = useScan();
  const [selectedGrade, setSelectedGrade] = useState<Grade | 'ALL'>('ALL');
  const [selectedStock, setSelectedStock] = useState<MonsterStock | null>(null);

  const allStocks = (data?.stocks ?? []).filter((s) => s.passedFilter);
  const filtered = selectedGrade === 'ALL' ? allStocks : allStocks.filter((s) => s.grade === selectedGrade);
  const sorted = [...filtered].sort((a, b) => b.score.total - a.score.total);

  const gradeCounts = GRADES.reduce<Record<string, number>>((acc, g) => {
    acc[g] = allStocks.filter((s) => s.grade === g).length;
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4 max-w-[1600px]">
      <div>
        <h1 className="text-base font-bold text-foreground">⚡몬스터 점수 순위</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Composite momentum score (0–100) combining Float Rotation, RVOL, VWAP, ORB, Gap, Short Interest.
        </p>
      </div>

      {/* Grade filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedGrade('ALL')}
          className={cn(
            'px-3 py-1 rounded text-xs font-mono font-bold border transition-colors',
            selectedGrade === 'ALL'
              ? 'bg-primary/15 text-primary border-primary/40'
              : 'bg-muted/30 text-muted-foreground border-border/50 hover:text-foreground'
          )}
        >
          ALL ({allStocks.length})
        </button>
        {GRADES.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
            className={cn(
              'px-3 py-1 rounded text-xs font-mono font-bold border transition-colors',
              selectedGrade === g
                ? GRADE_STYLES[g]
                : 'bg-muted/30 text-muted-foreground border-border/50 hover:text-foreground'
            )}
          >
            {g} ({gradeCounts[g] ?? 0})
          </button>
        ))}
      </div>

      <div className={cn('grid gap-4', selectedStock ? 'grid-cols-1 xl:grid-cols-[1fr_280px]' : 'grid-cols-1')}>
        {/* Table */}
        <div>
          <SectionHeader title="Ranked by Monster Score" count={sorted.length} />
          <ScannerTable
            stocks={sorted}
            isLoading={isLoading}
            columns={['rank', 'ticker', 'price', 'change', 'score', 'grade', 'rvol', 'floatRotation', 'float', 'gap', 'shortInterest', 'orb', 'vwapHold', 'halt', 'signal', 'watchlist']}
            defaultSort="score"
            showSearch
          />
        </div>

        {/* Detail panel */}
        {selectedStock && (
          <div className="xl:sticky xl:top-0 self-start">
            <div className="rounded border border-border/50 bg-card p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detail</p>
                <button
                  onClick={() => setSelectedStock(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  ✕ Close
                </button>
              </div>
              <ScoreDetailPanel stock={selectedStock} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
