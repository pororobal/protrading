'use client';

import { useEffect, useState } from 'react';
import { marketStatusLabel, formatEasternTime } from '@/lib/utils/format';
import { LiveDot } from '@/components/ui/atoms';
import { useScan, useLastUpdated } from '@/hooks/useScan';
import { RefreshCw } from 'lucide-react';

export function TopBar() {
  const [now, setNow] = useState<Date | null>(null);
  const { isLoading, mutate } = useScan();
  const lastUpdated = useLastUpdated();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { label, color } = marketStatusLabel();

  return (
    <header className="h-10 flex items-center justify-between px-4 border-b border-border/50 bg-card/50 shrink-0">
      {/* Market status */}
      <div className="flex items-center gap-2">
        <LiveDot active={label === 'MARKET OPEN'} />
        <span className={`text-[10px] font-mono font-bold uppercase ${color}`}>{label}</span>
        {now && (
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            ET {now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* Center — branding */}
      <div className="hidden md:flex items-center gap-1">
        <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
          Momentum Monster Scanner
        </span>
      </div>

      {/* Right — last updated + refresh */}
      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            Updated {formatEasternTime(lastUpdated)}
          </span>
        )}
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Refresh now"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
