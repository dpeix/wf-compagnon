import { Bell, Search, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPlatinum } from './format'
import { ListCard } from './list-card'
import { formatWatchRule, watchStatus } from './my-orders'
import type { WatchItem } from './types'

interface WatchlistCardProps {
  items: readonly WatchItem[]
}

export function WatchlistCard({ items }: WatchlistCardProps): React.JSX.Element {
  return (
    <ListCard
      title="Liste de suivi"
      description="Une alerte s'affiche quand un prix franchit votre seuil"
      icon={Bell}
      contentClassName="px-4"
      action={
        // Adding an item needs the item search (plan.md, sprint 3)
        <span title="Disponible avec la recherche d'objet">
          <Button variant="outline" size="sm" disabled>
            <Search aria-hidden="true" />
            Ajouter un objet
            <span className="sr-only"> (disponible avec la recherche d&apos;objet)</span>
          </Button>
        </span>
      }
    >
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun objet suivi.</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => {
            const reached = watchStatus(item.rule, item.price) === 'reached'
            return (
              <li key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Star
                  className={cn(
                    'size-4 shrink-0',
                    reached ? 'fill-wf-gold text-wf-gold' : 'text-muted-foreground'
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{item.itemName}</span>
                <span className="w-16 text-right font-medium tabular-nums">
                  {formatPlatinum(item.price)}
                </span>
                <span className="w-36 text-xs text-muted-foreground">
                  {formatWatchRule(item.rule)}
                </span>
                <Badge
                  variant="secondary"
                  className={cn('w-28', reached && 'bg-wf-gold/15 text-wf-gold')}
                >
                  {reached ? 'Seuil atteint' : 'En attente'}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </ListCard>
  )
}
