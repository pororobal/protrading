'use client';

import { cn, fmt, changeColor, GRADE_STYLES, scoreColor } from '@/lib/utils/format';
import type { Grade } from '@/types/stock';

// ---------------------------------------------------------------------------
// GradeBadge
// ---------------------------------------------------------------------------
export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold border rounded font-mono tracking-wider',
        GRADE_STYLES[grade]
      )}
    >
      {grade}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ChangeCell — colored +/-% display
// ---------------------------------------------------------------------------
export function ChangeCell({
  value,
  suffix = '%',
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const color = changeColor(value);
  const sign = value > 0 ? '+' : '';
  return (
    <span className={cn('font-mono tabular-nums', color, className)}>
      {sign}{value.toFixed(2)}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ScoreBar — visual bar showing Monster Score
// ---------------------------------------------------------------------------
export function ScoreBar({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  const color = scoreColor(score);
  const barColor =
    score >= 95 ? 'bg-[hsl(var(--grade-sss))]' :
    score >= 90 ? 'bg-[hsl(var(--grade-ss))]' :
    score >= 85 ? 'bg-[hsl(var(--grade-s))]' :
    score >= 75 ? 'bg-[hsl(var(--grade-a))]' :
    score >= 65 ? 'bg-[hsl(var(--grade-b))]' :
    'bg-muted-foreground';

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-mono font-bold w-9 text-right tabular-nums', color)}>
          {fmt.score(score)}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricPill — small inline metric chip
// ---------------------------------------------------------------------------
export function MetricPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border',
        highlight
          ? 'bg-bull/10 border-bull/30 text-bull'
          : 'bg-muted/50 border-border text-muted-foreground'
      )}
    >
      <span className="text-muted-foreground/70">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// BuySignalBadge
// ---------------------------------------------------------------------------
export function BuySignalBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-bull/15 border border-bull/40 text-bull animate-pulse-glow">
      <span className="w-1.5 h-1.5 rounded-full bg-bull inline-block" />
      BUY SIGNAL
    </span>
  );
}

// ---------------------------------------------------------------------------
// HaltBadge
// ---------------------------------------------------------------------------
export function HaltBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-bear/15 border border-bear/40 text-bear">
      🚨 HALT ×{count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Ticker symbol display
// ---------------------------------------------------------------------------
export function TickerSymbol({ ticker, exchange }: { ticker: string; exchange: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono font-bold text-sm text-foreground tracking-wide">{ticker}</span>
      <span className="text-[9px] text-muted-foreground font-mono">{exchange}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LiveDot — pulsing indicator
// ---------------------------------------------------------------------------
export function LiveDot({ active = true }: { active?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull opacity-75" />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2 w-2',
          active ? 'bg-bull' : 'bg-muted-foreground'
        )}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------
export function SectionHeader({
  title,
  subtitle,
  count,
  action,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-2 opacity-30">📡</div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoadingRows — skeleton placeholder for table
// ---------------------------------------------------------------------------
export function LoadingRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border/30">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-3 py-2.5">
              <div className="h-3 bg-muted/50 rounded animate-pulse" style={{ width: `${40 + Math.random() * 50}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
