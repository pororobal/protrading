'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/format';
import {
  LayoutDashboard,
  Sun,
  Zap,
  TrendingUp,
  Waves,
  RotateCcw,
  AlertTriangle,
  Star,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
  { href: '/premarket', label: 'Premarket', icon: Sun, shortcut: '2' },
  { href: '/monster', label: 'Monster Score', icon: Zap, shortcut: '3' },
  { href: '/orb', label: 'ORB Scanner', icon: TrendingUp, shortcut: '4' },
  { href: '/vwap', label: 'VWAP Scanner', icon: Waves, shortcut: '5' },
  { href: '/float-rotation', label: 'Float Rotation', icon: RotateCcw, shortcut: '6' },
  { href: '/halts', label: 'Halt Monitor', icon: AlertTriangle, shortcut: '7' },
  { href: '/watchlist', label: 'Watchlist', icon: Star, shortcut: '8' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-14 lg:w-48 shrink-0 flex flex-col border-r border-border/50 bg-card h-full overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border/50">
        <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-primary font-black text-xs">M</span>
        </div>
        <div className="hidden lg:block overflow-hidden">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Monster</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">Scanner</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 mx-1 my-0.5 rounded text-xs transition-all group',
                active
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <item.icon size={14} className="shrink-0" />
              <span className="hidden lg:inline truncate">{item.label}</span>
              <span className="hidden lg:inline ml-auto text-[9px] text-muted-foreground/50 font-mono bg-muted/50 px-1 rounded">
                {item.shortcut}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="hidden lg:block px-3 py-3 border-t border-border/50">
        <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
          ⚠️ For informational purposes only. Not financial advice.
          Past momentum is no guarantee of future returns.
        </p>
      </div>
    </aside>
  );
}
