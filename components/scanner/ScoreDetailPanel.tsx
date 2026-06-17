'use client';

import type { MonsterStock } from '@/types/stock';
import { fmt, cn, changeColor, GRADE_STYLES } from '@/lib/utils/format';
import { GradeBadge, BuySignalBadge, MetricPill } from '@/components/ui/atoms';

interface ScoreRowProps {
  label: string;
  value: number;
  max: number;
  positive?: boolean;
}

function ScoreRow({ label, value, max, positive = true }: ScoreRowProps) {
  const pct = Math.abs(value / max) * 100;
  const isNeg = value < 0;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-muted-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', isNeg ? 'bg-bear/70' : 'bg-primary/70')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={cn('text-[10px] font-mono w-10 text-right tabular-nums font-semibold', isNeg ? 'text-bear' : 'text-bull')}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  );
}

export function ScoreDetailPanel({ stock }: { stock: MonsterStock }) {
  const { score, derived, buySignal, sellTargets } = stock;

  return (
    <div className="space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono font-bold text-base text-foreground">{stock.ticker}</p>
          <p className="text-muted-foreground text-[10px] truncate max-w-[160px]">{stock.companyName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <GradeBadge grade={stock.grade} />
          <span className="text-2xl font-mono font-black text-primary">{fmt.score(score.total)}</span>
        </div>
      </div>

      {/* Buy signal */}
      {buySignal.active && (
        <div className="p-2 rounded bg-bull/10 border border-bull/30">
          <BuySignalBadge active />
          <ul className="mt-1 space-y-0.5">
            {buySignal.reasons.map((r) => (
              <li key={r} className="text-[10px] text-bull/80 flex items-center gap-1">
                <span className="text-bull">✓</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sell targets */}
      {buySignal.active && (
        <div className="p-2 rounded bg-muted/40 border border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">EXIT TARGETS</p>
          <div className="space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">T1 (+10%)</span>
              <span className="text-bull font-bold">{fmt.price(sellTargets.target1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">T2 (+20%)</span>
              <span className="text-bull font-bold">{fmt.price(sellTargets.target2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">T3</span>
              <span className="text-warn text-[10px]">{sellTargets.target3Label}</span>
            </div>
          </div>
        </div>
      )}

      {/* Score breakdown */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Score Breakdown</p>
        <div className="space-y-0.5">
          <ScoreRow label="Float Rotation (35%)" value={score.floatRotation} max={35} />
          <ScoreRow label="RVOL (20%)" value={score.rvol} max={20} />
          <ScoreRow label="VWAP Strength (15%)" value={score.vwapStrength} max={15} />
          <ScoreRow label="ORB (10%)" value={score.orb} max={10} />
          <ScoreRow label="Gap Strength (10%)" value={score.gapStrength} max={10} />
          <ScoreRow label="Short Interest (10%)" value={score.shortInterest} max={10} />
        </div>
      </div>

      {/* Bonuses */}
      {Object.values(score.bonuses).some((v) => v > 0) && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bonuses</p>
          <div className="space-y-0.5">
            {score.bonuses.halt > 0 && <ScoreRow label="Trading Halt" value={score.bonuses.halt} max={20} />}
            {score.bonuses.fiftyTwoWeekHigh > 0 && <ScoreRow label="52-Week High" value={score.bonuses.fiftyTwoWeekHigh} max={10} />}
            {score.bonuses.priorHighBreak > 0 && <ScoreRow label="Prior High Break" value={score.bonuses.priorHighBreak} max={5} />}
            {score.bonuses.sectorStrength > 0 && <ScoreRow label="Sector Strength" value={score.bonuses.sectorStrength} max={10} />}
            {score.bonuses.relativeStrength > 0 && <ScoreRow label="RS vs SPY" value={score.bonuses.relativeStrength} max={10} />}
          </div>
        </div>
      )}

      {/* Penalties */}
      {Object.values(score.penalties).some((v) => v < 0) && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Penalties</p>
          <div className="space-y-0.5">
            {score.penalties.vwapBreakdown < 0 && <ScoreRow label="VWAP Breakdown" value={score.penalties.vwapBreakdown} max={15} />}
            {score.penalties.pullbackFromHigh < 0 && <ScoreRow label="Pullback from HOD" value={score.penalties.pullbackFromHigh} max={20} />}
            {score.penalties.volumeDecline < 0 && <ScoreRow label="Volume Decline" value={score.penalties.volumeDecline} max={10} />}
            {score.penalties.dilutionRisk < 0 && <ScoreRow label="Dilution Risk" value={score.penalties.dilutionRisk} max={10} />}
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Key Metrics</p>
        <div className="flex flex-wrap gap-1">
          <MetricPill label="RVOL" value={fmt.multiplier(derived.rvol)} highlight={derived.rvol >= 5} />
          <MetricPill label="FloatRot" value={fmt.multiplier(derived.floatRotation)} highlight={derived.floatRotation >= 3} />
          <MetricPill label="Gap" value={fmt.pct(derived.gapPercent * 100)} highlight={derived.gapPercent > 0.1} />
          <MetricPill label="VWAP%" value={`${derived.vwapHoldPercent.toFixed(0)}%`} highlight={derived.vwapHoldPercent >= 70} />
          <MetricPill label="Float" value={fmt.float(stock.floatShares)} />
          <MetricPill label="SI%" value={stock.shortInterest != null ? `${stock.shortInterest.toFixed(1)}%` : '—'} highlight={(stock.shortInterest ?? 0) >= 15} />
          <MetricPill label="ΔVsSPY" value={`${derived.relativeStrengthVsSpy > 0 ? '+' : ''}${derived.relativeStrengthVsSpy.toFixed(1)}%`} highlight={derived.relativeStrengthVsSpy > 5} />
        </div>
      </div>
    </div>
  );
}
