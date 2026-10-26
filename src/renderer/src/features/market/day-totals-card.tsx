import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAY_NAMES, averageLabel, dayTotals } from './best-hours'
import { formatCount } from './format'
import { ListCard } from './list-card'

interface DayTotalsCardProps {
  sales: readonly (readonly number[])[]
  daysCollected: number
}

export function DayTotalsCard({ sales, daysCollected }: DayTotalsCardProps): React.JSX.Element {
  const totals = dayTotals(sales)
  const max = Math.max(...totals)

  return (
    <ListCard
      title="Ventes par jour de la semaine"
      description={`Total des ventes conclues, ${averageLabel(daysCollected)}`}
      icon={CalendarDays}
      contentClassName="px-4"
    >
      <dl className="space-y-2">
        {totals.map((total, day) => {
          const best = total === max && max > 0
          return (
            <div key={DAY_NAMES[day]} className="flex items-center gap-3 text-xs">
              <dt className="w-20 shrink-0 font-medium text-muted-foreground">{DAY_NAMES[day]}</dt>
              <dd className="flex flex-1 items-center gap-3">
                <span
                  className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      best ? 'bg-wf-gold' : 'bg-wf-gold/55'
                    )}
                    style={{ width: `${String(max > 0 ? (total / max) * 100 : 0)}%` }}
                  />
                </span>
                <span
                  className={cn(
                    'w-14 text-right font-medium tabular-nums',
                    best ? 'text-wf-gold' : 'text-foreground'
                  )}
                >
                  {formatCount(Math.round(total))}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
    </ListCard>
  )
}
