'use client';

import { cn, fmt, changeColor, GRADE_STYLES, scoreColor } from '@/lib/utils/format';
import type { Grade } from '@/types/stock';

// ... GradeBadge, ChangeCell, ScoreBar, MetricPill, BuySignalBadge, HaltBadge, TickerSymbol, LiveDot 등은 동일

// SectionHeader
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

// EmptyState — 한국어 메시지 기본값
export function EmptyState({ message = '데이터가 없습니다' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-2 opacity-30">📡</div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// LoadingRows, etc. 동일
