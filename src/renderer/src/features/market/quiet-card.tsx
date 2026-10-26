import { TrendingDown } from 'lucide-react'
import { formatHourRange, formatPeakRatio, quietPeriods } from './best-hours'
import { ListCard } from './list-card'

interface QuietCardProps {
  /** Average sales of each hour of the day */
  profile: readonly number[]
}

// An hour is quiet below half of the average hour
const QUIET_RATIO = 0.5
const MAX_PERIODS = 3

export function QuietCard({ profile }: QuietCardProps): React.JSX.Element {
  const periods = quietPeriods(profile, QUIET_RATIO).slice(0, MAX_PERIODS)

  return (
    <ListCard
      title="Créneaux à éviter"
      description="Peu d'acheteurs : les ordres restent en attente"
      icon={TrendingDown}
      contentClassName="px-4"
    >
      {periods.length === 0 ? (
        <p className="text-sm text-muted-foreground">Pas de creux marqué dans la journée.</p>
      ) : (
        <ul className="space-y-3">
          {periods.map(({ start, end, ratioToPeak }) => (
            <li key={start} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">
                  Tous les jours · {formatHourRange(start, end)}
                </p>
                <p className="text-xs text-muted-foreground">{formatPeakRatio(ratioToPeak)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  )
}
