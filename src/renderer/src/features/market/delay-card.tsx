import { Clock, Zap } from 'lucide-react'
import { delaySummary, formatDuration, formatHourRange } from './best-hours'
import { sparklinePoints } from './chart'
import { ListCard } from './list-card'

interface DelayCardProps {
  /** Median time to sell, in minutes, for each hour */
  medianDelay: readonly number[]
  /** Average sales of each hour, used to find the best window */
  profile: readonly number[]
  /** Same window length as the top slots, so both cards agree */
  windowHours: number
}

const NBSP = ' '
const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 120
const AXIS_LABELS = [0, 6, 12, 18, 23].map((h) => `${String(h)}${NBSP}h`)

// x of an hour on the curve (0 h at the left edge, 23 h at the right edge), kept inside the chart
const hourX = (h: number): number => Math.min(VIEW_WIDTH, Math.max(0, (h / 23) * VIEW_WIDTH))

export function DelayCard({
  medianDelay,
  profile,
  windowHours
}: DelayCardProps): React.JSX.Element {
  const {
    window: best,
    windowDelay,
    slowest,
    slowestHour
  } = delaySummary(medianDelay, profile, windowHours)
  const points = sparklinePoints(medianDelay, VIEW_WIDTH, VIEW_HEIGHT)
  // Half an hour on each side, so a one-hour window still has a width
  const bandStart = hourX(best.start - 0.5)
  const bandEnd = hourX(best.end - 0.5)

  return (
    <ListCard
      title="Délai de vente médian"
      description="Temps entre la publication d'un ordre et la vente, selon l'heure"
      icon={Clock}
      contentClassName="space-y-2 px-4"
    >
      <svg
        viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)}`}
        preserveAspectRatio="none"
        className="w-full overflow-visible"
        style={{ height: VIEW_HEIGHT }}
        role="img"
        aria-label={`Délai de vente médian : ${formatDuration(windowDelay)} sur le créneau ${formatHourRange(best.start, best.end)}, jusqu'à ${formatDuration(slowest)} à ${String(slowestHour)}${NBSP}h`}
      >
        <rect
          x={bandStart}
          width={bandEnd - bandStart}
          y={0}
          height={VIEW_HEIGHT}
          className="fill-wf-gold"
          opacity={0.16}
        />
        <polygon
          points={`0,${String(VIEW_HEIGHT)} ${points} ${String(VIEW_WIDTH)},${String(VIEW_HEIGHT)}`}
          className="fill-muted-foreground"
          opacity={0.12}
        />
        <polyline
          points={points}
          fill="none"
          className="stroke-foreground"
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="flex justify-between font-mono text-xs text-muted-foreground"
        aria-hidden="true"
      >
        {AXIS_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <p className="flex items-start gap-2 rounded-md bg-wf-gold/15 px-3 py-2.5 text-xs font-medium text-wf-gold">
        <Zap className="size-4 shrink-0" aria-hidden="true" />
        Sur le créneau {formatHourRange(best.start, best.end)}, un ordre au bon prix part en{' '}
        {formatDuration(windowDelay)} en moyenne, contre {formatDuration(slowest)} à {slowestHour}
        {NBSP}h.
      </p>
    </ListCard>
  )
}
