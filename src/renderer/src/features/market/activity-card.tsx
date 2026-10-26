import { Activity, Lightbulb } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { barHeights } from './chart'
import { formatChange } from './format'
import { describeActivity } from './overview-data'
import type { ActivityDescription } from './types'

interface ActivityCardProps {
  /** Usual sales per hour, index 0 = midnight */
  hourlySales: readonly number[]
  currentHour: number
}

const NBSP = ' '
const CHART_HEIGHT = 112
const AXIS_LABELS = [0, 6, 12, 18, 23].map((h) => `${String(h)}${NBSP}h`)

const LEVEL_LABELS: Record<ActivityDescription['level'], string> = {
  forte: 'Forte',
  normale: 'Normale',
  faible: 'Faible'
}

const atHour = (hour: number): string => `${String(hour)}${NBSP}h`

// The hourly series is the usual pattern of a day: the advice rates the current hour within it
function advice({ level, peakHour }: ActivityDescription, hour: number): string {
  const now = `Il est ${atHour(hour)}`
  if (hour === peakHour) {
    return `${now}${NBSP}: l'heure de la journée où il se vend le plus. Bon moment pour publier vos ordres de vente.`
  }
  const peak = `Le pic est vers ${atHour(peakHour)}.`
  if (level === 'forte') {
    return `${now}${NBSP}: une heure plus active que la moyenne, bon moment pour vendre. ${peak}`
  }
  if (level === 'faible') return `${now}${NBSP}: une heure creuse. ${peak}`
  return `${now}${NBSP}: une heure d'activité moyenne. ${peak}`
}

export function ActivityCard({ hourlySales, currentHour }: ActivityCardProps): React.JSX.Element {
  const activity = describeActivity(hourlySales, currentHour)
  const heights = barHeights(hourlySales, CHART_HEIGHT)

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-wf-gold" aria-hidden="true" />
          <h2 className="text-[15px]">Activité à cette heure</h2>
        </CardTitle>
        <CardDescription className="text-xs">
          Ventes habituelles par heure, comparées à la moyenne de la journée
        </CardDescription>
        <CardAction>
          <Badge
            variant={activity.level === 'faible' ? 'outline' : 'secondary'}
            className={cn(activity.level === 'forte' && 'bg-wf-gold/15 text-wf-gold')}
          >
            {LEVEL_LABELS[activity.level]} · {formatChange(activity.changeVsAverage)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 px-4">
        <div
          role="img"
          aria-label={`Ventes habituelles par heure : pic vers ${atHour(activity.peakHour)}, il est ${atHour(currentHour)}`}
          className="flex items-end gap-1"
          style={{ height: CHART_HEIGHT }}
        >
          {heights.map((height, hour) => (
            <div
              key={hour}
              className={cn(
                'flex-1 rounded-sm',
                hour === currentHour ? 'bg-wf-gold' : 'bg-muted-foreground/25'
              )}
              style={{ height }}
            />
          ))}
        </div>
        <div className="flex justify-between font-mono text-xs text-muted-foreground">
          {AXIS_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-sm bg-wf-gold" aria-hidden="true" />
          Maintenant ({atHour(currentHour)})
        </p>
        <p className="flex items-center gap-2 rounded-md bg-wf-gold/15 px-3 py-2.5 text-xs font-medium text-wf-gold">
          <Lightbulb className="size-4 shrink-0" aria-hidden="true" />
          {advice(activity, currentHour)}
        </p>
      </CardContent>
    </Card>
  )
}
