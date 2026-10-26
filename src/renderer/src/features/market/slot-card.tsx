import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ChangeBadge } from './change-badge'

interface SlotCardProps {
  rank: number
  title: string
  vsAverage: number
  stats: readonly { label: string; value: string }[]
  /** The best slot is highlighted in gold */
  highlighted: boolean
}

export function SlotCard({
  rank,
  title,
  vsAverage,
  stats,
  highlighted
}: SlotCardProps): React.JSX.Element {
  const titleId = useId()
  return (
    <article aria-labelledby={titleId}>
      <Card
        className={cn('h-full gap-3 px-4 py-4', highlighted && 'border-wf-gold/70 bg-wf-gold/10')}
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(highlighted && 'bg-wf-gold/20 text-wf-gold')}
            aria-hidden="true"
          >
            #{rank}
          </Badge>
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            <span className="sr-only">Créneau n°{rank} : </span>
            {title}
          </h2>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChangeBadge ratio={vsAverage} />
            <span>vs moyenne</span>
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </article>
  )
}
