import { Bell, ExternalLink, Package, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCount } from './format'
import type { ItemDetail } from './types'

interface ItemHeaderProps {
  item: ItemDetail
}

// Alerts and order creation need features of later sprints (plan.md)
const LATER = 'Disponible dans une prochaine version'

export function ItemHeader({ item }: ItemHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-wf-gold bg-wf-gold/15">
        <Package className="size-7 text-wf-gold" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {item.rank !== null && (
            <Badge variant="secondary" className="bg-wf-gold/15 text-wf-gold">
              Prix au rang {item.rank}
            </Badge>
          )}
          {item.ducats !== null && (
            <Badge variant="outline">{formatCount(item.ducats)} ducats</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span title={LATER}>
          <Button variant="outline" size="sm" disabled>
            <Bell aria-hidden="true" />
            Alerte de prix
            <span className="sr-only"> ({LATER.toLowerCase()})</span>
          </Button>
        </span>
        <Button variant="ghost" size="sm" asChild>
          {/* Opens in the default browser: the main process only lets https links out */}
          <a
            href={`https://warframe.market/items/${encodeURIComponent(item.slug)}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden="true" />
            Ouvrir sur warframe.market
          </a>
        </Button>
        <span title={LATER}>
          <Button size="sm" className="bg-wf-gold text-primary-foreground" disabled>
            <Zap aria-hidden="true" />
            Créer un ordre de vente
            <span className="sr-only"> ({LATER.toLowerCase()})</span>
          </Button>
        </span>
      </div>
    </div>
  )
}
