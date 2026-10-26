import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPlatinum } from './format'
import { chanceLevel, formatShare } from './item-insights'
import { ListCard } from './list-card'
import type { ItemDetail } from './types'

interface SaleChanceCardProps {
  chances: ItemDetail['saleChances']
}

const LEVEL_COLORS = {
  high: { bar: 'bg-success', text: 'text-success' },
  medium: { bar: 'bg-wf-gold', text: 'text-wf-gold' },
  low: { bar: 'bg-destructive', text: 'text-destructive' }
} as const

export function SaleChanceCard({ chances }: SaleChanceCardProps): React.JSX.Element {
  return (
    <ListCard
      title="Chance de vendre selon le prix"
      description="Estimation sur 24 h, d'après les ventes conclues"
      icon={Activity}
      contentClassName="space-y-3 px-4"
    >
      <ul className="space-y-3">
        {chances.map(({ price, chance, delay }) => {
          const color = LEVEL_COLORS[chanceLevel(chance)]
          return (
            <li key={price} className="space-y-1.5">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium tabular-nums">{formatPlatinum(price)}</span>
                <span className="flex-1 text-xs text-muted-foreground">{delay}</span>
                <span className={cn('text-xs font-medium tabular-nums', color.text)}>
                  {formatShare(chance)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className={cn('h-full rounded-full', color.bar)}
                  style={{ width: `${String(Math.round(chance * 100))}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </ListCard>
  )
}
