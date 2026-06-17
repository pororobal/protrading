'use client';

import { useState, useMemo } from 'react';
import type { MonsterStock } from '@/types/stock';
import { fmt, changeColor, cn } from '@/lib/utils/format';
import {
  GradeBadge,
  ChangeCell,
  ScoreBar,
  MetricPill,
  BuySignalBadge,
  HaltBadge,
  TickerSymbol,
  LoadingRows,
  EmptyState,
} from '@/components/ui/atoms';
import { useWatchlistStore } from '@/lib/store/watchlist';
import { Star, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export type ColumnKey =
  | 'rank'
  | 'ticker'
  | 'price'
  | 'change'
  | 'score'
  | 'grade'
  | 'rvol'
  | 'floatRotation'
  | 'float'
  | 'volume'
  | 'dollarVolume'
  | 'gap'
  | 'vwap'
  | 'vwapHold'
  | 'orb'
  | 'shortInterest'
  | 'marketCap'
  | 'premarket'
  | 'halt'
  | 'signal'
  | 'watchlist';

interface ColDef {
  key: ColumnKey;
  label: string;
  sortKey?: keyof MonsterStock | string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export const ALL_COLUMNS: ColDef[] = [
  { key: 'rank', label: '#', align: 'center', width: 'w-8' },
  { key: 'ticker', label: 'Ticker', sortKey: 'ticker', align: 'left', width: 'min-w-[100px]' },
  { key: 'price', label: 'Price', sortKey: 'price', align: 'right' },
  { key: 'change', label: 'Chg%', sortKey: 'changePercent', align: 'right' },
  { key: 'score', label: 'Monster Score', align: 'right', width: 'min-w-[140px]' },
  { key: 'grade', label: 'Grade', align: 'center' },
  { key: 'rvol', label: 'RVOL', align: 'right' },
  { key: 'floatRotation', label: 'Float Rot.', align: 'right' },
  { key: 'float', label: 'Float', align: 'right' },
  { key: 'volume', label: 'Volume', align: 'right' },
  { key: 'dollarVolume', label: '$ Vol', align: 'right' },
  { key: 'gap', label: 'Gap%', align: 'right' },
  { key: 'vwap', label: 'VWAP', align: 'right' },
  { key: 'vwapHold', label: 'VWAP Hold%', align: 'right' },
  { key: 'orb', label: 'ORB', align: 'center' },
  { key: 'shortInterest', label: 'SI%', align: 'right' },
  { key: 'marketCap', label: 'Mkt Cap', align: 'right' },
  { key: 'premarket', label: 'PM Chg%', align: 'right' },
  { key: 'halt', label: 'Halts', align: 'center' },
  { key: 'signal', label: 'Signal', align: 'center' },
  { key: 'watchlist', label: '★', align: 'center', width: 'w-8' },
];

type SortDir = 'asc' | 'desc';

function sortStocks(stocks: MonsterStock[], key: string, dir: SortDir): MonsterStock[] {
  return [...stocks].sort((a, b) => {
    let av = 0, bv = 0;
    switch (key) {
      case 'ticker': return dir === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      case 'price': av = a.price; bv = b.price; break;
      case 'changePercent': av = a.changePercent; bv = b.changePercent; break;
      case 'score': av = a.score.total; bv = b.score.total; break;
      case 'rvol': av = a.derived.rvol; bv = b.derived.rvol; break;
      case 'floatRotation': av = a.derived.floatRotation; bv = b.derived.floatRotation; break;
      case 'floatShares': av = a.floatShares ?? 0; bv = b.floatShares ?? 0; break;
      case 'volume': av = a.volume; bv = b.volume; break;
      case 'dollarVolume': av = a.derived.dollarVolume; bv = b.derived.dollarVolume; break;
      case 'gap': av = a.derived.gapPercent; bv = b.derived.gapPercent; break;
      case 'shortInterest': av = a.shortInterest ?? 0; bv = b.shortInterest ?? 0; break;
      case 'marketCap': av = a.marketCap; bv = b.marketCap; break;
      case 'premarket': av = Math.abs(a.premarketChange ?? 0); bv = Math.abs(b.premarketChange ?? 0); break;
      case 'vwapHold': av = a.derived.vwapHoldPercent; bv = b.derived.vwapHoldPercent; break;
      default: av = 0; bv = 0;
    }
    return dir === 'asc' ? av - bv : bv - av;
  });
}

// ---------------------------------------------------------------------------
// ORB cell
// ---------------------------------------------------------------------------
function OrbCell({ derived }: { derived: MonsterStock['derived'] }) {
  const badges = [];
  if (derived.orb5Breakout) badges.push('5m');
  if (derived.orb15Breakout) badges.push('15m');
  if (derived.orb30Breakout) badges.push('30m');
  if (badges.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>;
  return (
    <div className="flex gap-0.5 justify-center">
      {badges.map((b) => (
        <span key={b} className="px-1 py-0.5 text-[9px] font-mono font-bold rounded bg-primary/15 text-primary border border-primary/30">
          {b}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------
function renderCell(col: ColDef, stock: MonsterStock, rank: number, onWatchlist: boolean, toggleWatch: () => void): React.ReactNode {
  switch (col.key) {
    case 'rank':
      return <span className="text-xs font-mono text-muted-foreground">{rank}</span>;
    case 'ticker':
      return (
        <div className="flex flex-col gap-0.5">
          <TickerSymbol ticker={stock.ticker} exchange={stock.exchange} />
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {stock.buySignal.active && <BuySignalBadge active />}
            {stock.derived.haltCount > 0 && <HaltBadge count={stock.derived.haltCount} />}
          </div>
        </div>
      );
    case 'price':
      return <span className="font-mono tabular-nums text-xs font-semibold">{fmt.price(stock.price)}</span>;
    case 'change':
      return <ChangeCell value={stock.changePercent} />;
    case 'score':
      return (
        <div className="w-full min-w-[120px]">
          <ScoreBar score={stock.score.total} />
        </div>
      );
    case 'grade':
      return <GradeBadge grade={stock.grade} />;
    case 'rvol':
      return (
        <span className={cn('font-mono text-xs tabular-nums', stock.derived.rvol >= 5 ? 'text-bull font-bold' : 'text-foreground')}>
          {fmt.multiplier(stock.derived.rvol)}
        </span>
      );
    case 'floatRotation':
      return (
        <span className={cn('font-mono text-xs tabular-nums', stock.derived.floatRotation >= 3 ? 'text-bull font-bold' : 'text-foreground')}>
          {fmt.multiplier(stock.derived.floatRotation)}
        </span>
      );
    case 'float':
      return <span className="font-mono text-xs tabular-nums text-muted-foreground">{fmt.float(stock.floatShares)}</span>;
    case 'volume':
      return <span className="font-mono text-xs tabular-nums">{fmt.vol(stock.volume)}</span>;
    case 'dollarVolume':
      return <span className="font-mono text-xs tabular-nums">{fmt.compact(stock.derived.dollarVolume)}</span>;
    case 'gap':
      return <ChangeCell value={stock.derived.gapPercent * 100} />;
    case 'vwap':
      return (
        <span className={cn('font-mono text-xs tabular-nums', stock.derived.distanceFromVwap > 0 ? 'text-bull' : 'text-bear')}>
          {stock.vwap ? fmt.price(stock.vwap) : '—'}
        </span>
      );
    case 'vwapHold':
      return (
        <span className={cn(
          'font-mono text-xs tabular-nums',
          stock.derived.vwapHoldPercent >= 70 ? 'text-bull' : stock.derived.vwapHoldPercent < 30 ? 'text-bear' : 'text-foreground'
        )}>
          {stock.derived.vwapHoldPercent.toFixed(0)}%
        </span>
      );
    case 'orb':
      return <OrbCell derived={stock.derived} />;
    case 'shortInterest':
      return (
        <span className={cn('font-mono text-xs tabular-nums', (stock.shortInterest ?? 0) >= 25 ? 'text-warn' : 'text-foreground')}>
          {stock.shortInterest != null ? `${stock.shortInterest.toFixed(1)}%` : '—'}
        </span>
      );
    case 'marketCap':
      return <span className="font-mono text-xs tabular-nums text-muted-foreground">{fmt.compact(stock.marketCap)}</span>;
    case 'premarket':
      return stock.premarketChange != null
        ? <ChangeCell value={stock.premarketChange} />
        : <span className="text-muted-foreground/40 text-xs">—</span>;
    case 'halt':
      return stock.derived.haltCount > 0
        ? <span className="font-mono text-xs text-bear font-bold">{stock.derived.haltCount}</span>
        : <span className="text-muted-foreground/40 text-xs">—</span>;
    case 'signal':
      return <BuySignalBadge active={stock.buySignal.active} />;
    case 'watchlist':
      return (
        <button
          onClick={toggleWatch}
          className={cn(
            'transition-colors',
            onWatchlist ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
          )}
          aria-label={onWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star size={14} fill={onWatchlist ? 'currentColor' : 'none'} />
        </button>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// SortHeader
// ---------------------------------------------------------------------------
function SortHeader({
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  col: ColDef;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (k: string) => void;
}) {
  const active = sortKey === col.sortKey;
  const Icon = active ? (sortDir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown;
  return (
    <th
      className={cn(
        'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap select-none border-b border-border',
        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
        col.sortKey ? 'cursor-pointer hover:text-foreground' : '',
        active ? 'text-primary' : 'text-muted-foreground',
        col.width ?? ''
      )}
      onClick={() => col.sortKey && onSort(col.sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {col.label}
        {col.sortKey && <Icon size={10} />}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Main ScannerTable
// ---------------------------------------------------------------------------
export interface ScannerTableProps {
  stocks: MonsterStock[];
  isLoading?: boolean;
  columns?: ColumnKey[];
  defaultSort?: string;
  filterFn?: (s: MonsterStock) => boolean;
  showSearch?: boolean;
}

const DEFAULT_COLUMNS: ColumnKey[] = [
  'rank', 'ticker', 'price', 'change', 'score', 'grade',
  'rvol', 'floatRotation', 'float', 'volume', 'gap', 'orb', 'signal', 'watchlist',
];

export function ScannerTable({
  stocks,
  isLoading = false,
  columns = DEFAULT_COLUMNS,
  defaultSort = 'score',
  filterFn,
  showSearch = true,
}: ScannerTableProps) {
  const [sortKey, setSortKey] = useState<string>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const { has, toggle } = useWatchlistStore();

  const cols = ALL_COLUMNS.filter((c) => columns.includes(c.key));

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const processed = useMemo(() => {
    let list = stocks;
    if (filterFn) list = list.filter(filterFn);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((s) => s.ticker.includes(q) || s.companyName.toUpperCase().includes(q));
    }
    return sortStocks(list, sortKey, sortDir);
  }, [stocks, filterFn, search, sortKey, sortDir]);

  return (
    <div className="flex flex-col gap-2">
      {showSearch && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search ticker or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs bg-muted/50 border border-border rounded outline-none focus:border-primary/50 w-full max-w-xs placeholder:text-muted-foreground font-mono"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{processed.length} results</span>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin rounded border border-border/50">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-muted/30">
            <tr>
              {cols.map((col) => (
                <SortHeader key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows rows={8} cols={cols.length} />
            ) : processed.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="py-8 text-center text-muted-foreground text-xs">
                  No stocks match the current filters
                </td>
              </tr>
            ) : (
              processed.map((stock, idx) => (
                <tr
                  key={stock.ticker}
                  className={cn(
                    'border-b border-border/30 transition-colors hover:bg-muted/20',
                    stock.buySignal.active && 'bg-bull/5 hover:bg-bull/10'
                  )}
                >
                  {cols.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-2.5',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.width ?? ''
                      )}
                    >
                      {renderCell(col, stock, idx + 1, has(stock.ticker), () => toggle(stock.ticker))}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
