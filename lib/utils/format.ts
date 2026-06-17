import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Grade } from '@/types/stock';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Number formatters — always use these in the UI for consistent display
// ---------------------------------------------------------------------------

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const USD2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PCT = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NUM = new Intl.NumberFormat('en-US');
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

export const fmt = {
  price: (n: number) => USD2.format(n),
  pricePrecise: (n: number) => USD.format(n),
  pct: (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%',
  pctRaw: (n: number) => PCT.format(n / 100),
  vol: (n: number) => COMPACT.format(n),
  compact: (n: number) => COMPACT.format(n),
  num: (n: number) => NUM.format(n),
  multiplier: (n: number) => n.toFixed(1) + 'x',
  score: (n: number) => n.toFixed(1),
  float: (n: number | null) => (n == null ? '—' : COMPACT.format(n)),
};

// ---------------------------------------------------------------------------
// Color helpers — returns Tailwind class names
// ---------------------------------------------------------------------------

export function changeColor(value: number): string {
  if (value > 0) return 'text-bull';
  if (value < 0) return 'text-bear';
  return 'text-muted-foreground';
}

export function changeBgColor(value: number): string {
  if (value > 0) return 'bg-bull/10 text-bull';
  if (value < 0) return 'bg-bear/10 text-bear';
  return 'bg-muted/50 text-muted-foreground';
}

export function scoreColor(score: number): string {
  if (score >= 95) return 'text-grade-sss';
  if (score >= 90) return 'text-grade-ss';
  if (score >= 85) return 'text-grade-s';
  if (score >= 75) return 'text-grade-a';
  if (score >= 65) return 'text-grade-b';
  return 'text-grade-c';
}

export const GRADE_STYLES: Record<Grade, string> = {
  SSS: 'bg-[hsl(280_90%_65%/0.15)] text-[hsl(var(--grade-sss))] border-[hsl(var(--grade-sss)/0.5)]',
  SS:  'bg-[hsl(0_78%_58%/0.15)] text-[hsl(var(--grade-ss))] border-[hsl(var(--grade-ss)/0.5)]',
  S:   'bg-[hsl(38_92%_50%/0.15)] text-[hsl(var(--grade-s))] border-[hsl(var(--grade-s)/0.5)]',
  A:   'bg-[hsl(199_89%_48%/0.15)] text-[hsl(var(--grade-a))] border-[hsl(var(--grade-a)/0.5)]',
  B:   'bg-[hsl(142_60%_45%/0.15)] text-[hsl(var(--grade-b))] border-[hsl(var(--grade-b)/0.5)]',
  C:   'bg-muted/50 text-muted-foreground border-border',
};

// ---------------------------------------------------------------------------
// Market status helpers (Eastern Time)
// ---------------------------------------------------------------------------

export function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to Eastern Time
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const day = et.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = et.getHours();
  const m = et.getMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

export function isPremarket(): boolean {
  const now = new Date();
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const h = et.getHours();
  const m = et.getMinutes();
  const mins = h * 60 + m;
  return mins >= 4 * 60 && mins < 9 * 60 + 30;
}

export function marketStatusLabel(): { label: string; color: string } {
  if (isMarketOpen()) return { label: 'MARKET OPEN', color: 'text-bull' };
  if (isPremarket()) return { label: 'PRE-MARKET', color: 'text-warn' };
  return { label: 'MARKET CLOSED', color: 'text-muted-foreground' };
}

export function formatEasternTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
