import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { changeTrend, formatChange, formatPlatinum } from './format'
import { formatDay, formatHourLabel } from './item-insights'
import { ListCard } from './list-card'
import {
  evenIndices,
  formatAxisValue,
  niceScale,
  periodStats,
  priceChartPaths,
  volumeBars
} from './price-chart'
import type { DatedPricePoint } from './types'

interface PriceChartCardProps {
  hourly: readonly DatedPricePoint[]
  daily: readonly DatedPricePoint[]
}

const NBSP = ' '
const PERIODS = [
  { value: '48h', label: `48${NBSP}h`, days: 0 },
  { value: '7d', label: `7${NBSP}j`, days: 7 },
  { value: '30d', label: `30${NBSP}j`, days: 30 },
  { value: '90d', label: `90${NBSP}j`, days: 90 }
] as const
type Period = (typeof PERIODS)[number]

// SVG user units; the chart stretches to the card width
const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 200
const VOLUME_HEIGHT = 48
const X_LABELS = 7

const VOLATILITY_LABELS = { faible: 'Faible', moyenne: 'Moyenne', forte: 'Forte' } as const
const TREND_COLORS = { up: 'text-success', down: 'text-destructive', flat: '' } as const

function findPeriod(value: string): Period | undefined {
  return PERIODS.find((p) => p.value === value)
}

export function PriceChartCard({ hourly, daily }: PriceChartCardProps): React.JSX.Element {
  const [period, setPeriod] = useState<Period>(PERIODS[3])
  // N days of change need N + 1 daily points (the day before the period is the baseline)
  const points = period.days === 0 ? hourly : daily.slice(-(period.days + 1))
  const formatLabel = period.days === 0 ? formatHourLabel : formatDay

  const periodToggle = (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={period.value}
      onValueChange={(value) => {
        // Radix sends an empty string when the active item is clicked again: keep the period
        const next = findPeriod(value)
        if (next) setPeriod(next)
      }}
      aria-label="Période du graphique"
    >
      {PERIODS.map((p) => (
        <ToggleGroupItem key={p.value} value={p.value} className="px-3">
          {p.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )

  if (points.length === 0) {
    return (
      <ListCard
        title="Évolution du prix"
        description="Pas encore de ventes enregistrées sur cette période"
        icon={TrendingUp}
        action={periodToggle}
      >
        <p className="px-2 py-8 text-center text-sm text-muted-foreground">Aucune donnée.</p>
      </ListCard>
    )
  }

  const scale = niceScale(
    Math.min(...points.map((p) => p.min)),
    Math.max(...points.map((p) => p.max)),
    5
  )
  const { line, band, last } = priceChartPaths(points, VIEW_WIDTH, VIEW_HEIGHT, scale)
  const stats = periodStats(points)
  const volumes = volumeBars(
    points.map((p) => p.volume),
    VIEW_WIDTH,
    VOLUME_HEIGHT
  )
  const gridStep = VIEW_HEIGHT / (scale.ticks.length - 1)

  return (
    <ListCard
      title="Évolution du prix"
      description="Prix moyen des ventes conclues, fourchette min–max et volume"
      icon={TrendingUp}
      contentClassName="space-y-4 px-4"
      action={periodToggle}
    >
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full bg-wf-gold" />
          Prix moyen
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm bg-wf-gold/25" />
          Fourchette min–max
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm bg-muted-foreground/40" />
          Volume (ventes)
        </span>
      </div>

      <div className="flex gap-2">
        <div
          className="relative w-10 shrink-0 font-mono text-xs leading-none text-muted-foreground"
          style={{ height: VIEW_HEIGHT }}
          aria-hidden="true"
        >
          {scale.ticks.map((tick, i) => (
            // Centred on its grid line
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${String(100 - (i / (scale.ticks.length - 1)) * 100)}%` }}
            >
              {formatAxisValue(tick)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="relative" style={{ height: VIEW_HEIGHT }}>
            <svg
              viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)}`}
              preserveAspectRatio="none"
              className="size-full overflow-visible text-wf-gold"
              role="img"
              aria-label={`Prix moyen de ${formatPlatinum(points[0]?.avg ?? 0)} à ${formatPlatinum(points.at(-1)?.avg ?? 0)} sur la période, entre ${formatPlatinum(stats.low)} et ${formatPlatinum(stats.high)}`}
            >
              {scale.ticks.map((tick, i) => (
                <line
                  key={tick}
                  x1={0}
                  x2={VIEW_WIDTH}
                  y1={VIEW_HEIGHT - i * gridStep}
                  y2={VIEW_HEIGHT - i * gridStep}
                  className="text-border"
                  stroke="currentColor"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={band} fill="currentColor" opacity={0.16} />
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {last && (
              // HTML dot: an SVG circle would be squashed by preserveAspectRatio="none"
              <span
                className="absolute size-2 -translate-1/2 rounded-full bg-wf-gold"
                style={{
                  left: `${String((last.x / VIEW_WIDTH) * 100)}%`,
                  top: `${String((last.y / VIEW_HEIGHT) * 100)}%`
                }}
                aria-hidden="true"
              />
            )}
          </div>
          <svg
            viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VOLUME_HEIGHT)}`}
            preserveAspectRatio="none"
            className="w-full overflow-visible text-muted-foreground"
            style={{ height: VOLUME_HEIGHT }}
            aria-hidden="true"
          >
            {volumes.map((bar, i) => (
              <rect
                key={points[i]?.date.getTime() ?? i}
                x={bar.x}
                y={VOLUME_HEIGHT - bar.height}
                width={bar.width}
                height={bar.height}
                fill="currentColor"
                opacity={i === volumes.length - 1 ? 0.9 : 0.35}
              />
            ))}
          </svg>
          <div className="relative h-4 font-mono text-xs text-muted-foreground" aria-hidden="true">
            {evenIndices(points.length, X_LABELS).map((i) => {
              const p = points[i]
              const share = points.length > 1 ? i / (points.length - 1) : 0.5
              // Under its point; the first and last labels stay inside the chart edges
              return p ? (
                <span
                  key={i}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: `${String(share * 100)}%`,
                    transform: `translateX(${String(-share * 100)}%)`
                  }}
                >
                  {formatLabel(p.date)}
                </span>
              ) : null
            })}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: 'Plus haut', value: formatPlatinum(stats.high) },
          { label: 'Plus bas', value: formatPlatinum(stats.low) },
          { label: 'Moyenne', value: formatPlatinum(stats.average) },
          {
            label: 'Tendance',
            value: formatChange(stats.change),
            className: TREND_COLORS[changeTrend(stats.change)]
          },
          {
            label: 'Volatilité',
            value: VOLATILITY_LABELS[stats.volatility],
            className: 'text-wf-gold'
          }
        ].map(({ label, value, className }) => (
          <div key={label} className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">
              {label} ({period.label})
            </dt>
            <dd className={cn('text-sm font-medium tabular-nums', className)}>{value}</dd>
          </div>
        ))}
      </dl>
    </ListCard>
  )
}
