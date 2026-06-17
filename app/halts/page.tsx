'use client';

import { useHaltStocks, useScan } from '@/hooks/useScan';
import { ScannerTable } from '@/components/scanner/ScannerTable';
import { SectionHeader, EmptyState, GradeBadge, ChangeCell } from '@/components/ui/atoms';
import { fmt, cn } from '@/lib/utils/format';

export default function HaltsPage() {
  const { stocks, isLoading } = useHaltStocks();
  const { data } = useScan();

  return (
    <div className="p-4 space-y-4 max-w-[1600px]">
      <div>
        <h1 className="text-base font-bold text-foreground">🚨 Halt Monitor</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tracks stocks with trading halts (regulatory, volatility, news pending). Multiple halts = extreme momentum.
        </p>
      </div>

      <div className="p-3 rounded border border-bear/20 bg-bear/5 text-[11px] space-y-1">
        <p className="font-semibold text-foreground">⚠️ Trading Halts — What They Mean</p>
        <p className="text-muted-foreground">
          <strong className="text-foreground">LUDP (Limit Up/Down):</strong> Price moved too fast — exchange automatically halts. Most common in momentum stocks. Resumes in 5 min.
        </p>
        <p className="text-muted-foreground">
          <strong className="text-foreground">T1 (News Pending):</strong> Company about to release material news. High-probability of large move on resume.
        </p>
        <p className="text-muted-foreground">
          <strong className="text-foreground">Multiple halts:</strong> Extremely rare and signals historic volatility. Monster Score adds +5/+10/+20 bonus for 1/3/5+ halts.
        </p>
        <p className="text-muted-foreground font-semibold text-warn">
          Note: Real-time halt data from FINRA/exchanges is not yet integrated. Halt counts shown are estimated from Yahoo Finance price volatility patterns.
        </p>
      </div>

      {/* Halt count tier cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '1 Halt', threshold: 1, cap: 2, bonus: '+5', color: 'text-warn border-warn/30 bg-warn/5' },
          { label: '3+ Halts', threshold: 3, cap: 4, bonus: '+10', color: 'text-bear border-bear/30 bg-bear/5' },
          { label: '5+ Halts', threshold: 5, cap: 999, bonus: '+20 🔥', color: 'text-[hsl(var(--grade-sss))] border-[hsl(var(--grade-sss)/0.4)] bg-[hsl(280_90%_65%/0.08)]' },
        ].map(({ label, threshold, cap, bonus, color }) => {
          const count = stocks.filter((s) => s.derived.haltCount >= threshold && s.derived.haltCount <= cap).length;
          return (
            <div key={label} className={cn('p-3 rounded border', color)}>
              <p className="text-[10px] font-mono font-bold">{label}</p>
              <p className="text-2xl font-mono font-black tabular-nums">{count}</p>
              <p className="text-[10px] font-mono opacity-70">Score bonus: {bonus}</p>
            </div>
          );
        })}
      </div>

      <SectionHeader title="Stocks With Halts" count={stocks.length} />

      {stocks.length === 0 && !isLoading ? (
        <EmptyState message="No halted stocks detected. This is normal — trading halts are rare events." />
      ) : (
        <ScannerTable
          stocks={stocks}
          isLoading={isLoading}
          columns={['rank', 'ticker', 'price', 'change', 'halt', 'score', 'grade', 'rvol', 'floatRotation', 'float', 'volume', 'gap', 'signal', 'watchlist']}
          defaultSort="halt"
          showSearch
        />
      )}
    </div>
  );
}
