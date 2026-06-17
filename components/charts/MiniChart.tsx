'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import type { IntradayBar } from '@/types/stock';
import { fmt } from '@/lib/utils/format';

interface Props {
  symbol: string;
  height?: number;
  showTooltip?: boolean;
  color?: string;
}

export function MiniChart({ symbol, height = 60, showTooltip = false, color }: Props) {
  const [bars, setBars] = useState<IntradayBar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/intraday?symbol=${symbol}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data.bars)) setBars(data.bars);
      } catch {
        // silent fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-end gap-px" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 bg-muted/40 rounded-sm animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
        ))}
      </div>
    );
  }

  if (bars.length === 0) return <div style={{ height }} className="flex items-center justify-center text-[10px] text-muted-foreground/40">No data</div>;

  const closes = bars.map((b) => b.close);
  const open = closes[0] ?? 0;
  const isUp = (closes[closes.length - 1] ?? 0) >= open;
  const chartColor = color ?? (isUp ? 'hsl(142 76% 45%)' : 'hsl(0 78% 58%)');

  const chartData = bars.map((b) => ({
    time: b.time,
    close: b.close,
    vwap: b.vwap,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={open} stroke="hsl(215 14% 40%)" strokeDasharray="2 2" strokeWidth={1} />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: 'hsl(220 18% 8%)',
              border: '1px solid hsl(220 14% 16%)',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'monospace',
              color: 'hsl(210 20% 92%)',
              padding: '4px 8px',
            }}
            formatter={(v: number) => [fmt.price(v), 'Price']}
            labelFormatter={() => ''}
          />
        )}
        <Area
          type="monotone"
          dataKey="close"
          stroke={chartColor}
          strokeWidth={1.5}
          fill={`url(#grad-${symbol})`}
          dot={false}
          activeDot={{ r: 2, fill: chartColor }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
