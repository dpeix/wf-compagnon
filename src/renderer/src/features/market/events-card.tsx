import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListCard } from './list-card'
import type { MarketEvent } from './types'

interface EventsCardProps {
  events: readonly MarketEvent[]
}

const TONE_CLASSES: Record<MarketEvent['tone'], string> = {
  danger: 'bg-destructive/15 text-destructive',
  gold: 'bg-wf-gold/15 text-wf-gold',
  neutral: ''
}

export function EventsCard({ events }: EventsCardProps): React.JSX.Element {
  return (
    <ListCard
      title="Ce qui fait bouger les prix"
      description="Événements du jeu, récents et à venir"
      icon={Clock}
    >
      <ul className="space-y-1">
        {events.map((event) => (
          <li key={event.id} className="flex items-center gap-3 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.description}</p>
            </div>
            <Badge variant="secondary" className={TONE_CLASSES[event.tone]}>
              {event.when}
            </Badge>
          </li>
        ))}
      </ul>
    </ListCard>
  )
}
