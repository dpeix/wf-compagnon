import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DAY_NAMES,
  DAY_SHORT_NAMES,
  averageLabel,
  bestSlots,
  dayPeaks,
  heatLevels
} from './best-hours'
import { formatCount } from './format'
import { ListCard } from './list-card'

interface HeatmapCardProps {
  /** Average sales per hour: 7 days (Monday first) × 24 hours */
  sales: readonly (readonly number[])[]
  daysCollected: number
}

const NBSP = ' '
// One class per level: Tailwind needs the full class names in the source
const LEVEL_CLASSES = [
  'bg-wf-gold/5',
  'bg-wf-gold/20',
  'bg-wf-gold/40',
  'bg-wf-gold/65',
  'bg-wf-gold'
] as const
const HOUR_LABEL_STEP = 3

const atHour = (hour: number): string => `${String(hour)}${NBSP}h`

/** Day × hour heat map. Needs at least one sale in the week (checked by the screen). */
export function HeatmapCard({ sales, daysCollected }: HeatmapCardProps): React.JSX.Element {
  const levels = heatLevels(sales)
  const peak = bestSlots(sales, 1, 1)[0]

  return (
    <ListCard
      title="Activité de vente par jour et par heure"
      description={`Ventes conclues par heure, ${averageLabel(daysCollected)}`}
      icon={Flame}
      contentClassName="space-y-3 px-4"
    >
      {/* The grid is visual only: the same information, as text, for screen readers */}
      <ul className="sr-only">
        {peak && (
          <li>
            Pic de la semaine : {DAY_NAMES[peak.day]?.toLowerCase()} vers {atHour(peak.start)}.
          </li>
        )}
        {dayPeaks(sales).map(({ day, peakHour, total }) => (
          <li key={day}>
            {DAY_NAMES[day]} : {formatCount(Math.round(total))} ventes, pic vers {atHour(peakHour)}.
          </li>
        ))}
      </ul>
      <div className="space-y-1" aria-hidden="true">
        {levels.map((row, day) => (
          <div key={DAY_NAMES[day]} className="flex items-center gap-1">
            <span className="w-9 shrink-0 text-xs font-medium text-muted-foreground">
              {DAY_SHORT_NAMES[day]}
            </span>
            {row.map((level, hour) => (
              <span
                key={hour}
                title={`${DAY_NAMES[day] ?? ''} ${atHour(hour)} : ${formatCount(Math.round(sales[day]?.[hour] ?? 0))} ventes`}
                className={cn('h-5 flex-1 rounded-sm', LEVEL_CLASSES[level])}
              />
            ))}
          </div>
        ))}
        <div className="flex gap-1 font-mono text-xs text-muted-foreground">
          <span className="w-9 shrink-0" />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="flex-1">
              {hour % HOUR_LABEL_STEP === 0 ? hour : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          Calme
          {LEVEL_CLASSES.map((className) => (
            <span key={className} className={cn('h-3 w-4 rounded-sm', className)} />
          ))}
          Pic d&apos;activité
        </span>
        <span className="ml-auto" aria-hidden="true">
          Survolez une case pour voir le nombre de ventes.
        </span>
      </div>
    </ListCard>
  )
}
