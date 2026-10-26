import { Clock, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ListCard } from './list-card'
import { adviceList, formatCountWord, peakReminder } from './my-orders'
import type { MyOrder } from './types'
import { useNow } from './use-now'

interface AdviceCardProps {
  orders: readonly MyOrder[]
  /** Hour of the day with the most sales */
  peakHour: number
  onChangePrice: (orderId: string, price: number) => void
  onShow: (orderId: string) => void
}

const MAX_ADVICE = 4
const MINUTE = 60_000
const TONE_DOTS = { bad: 'bg-destructive', medium: 'bg-wf-gold', neutral: 'bg-muted-foreground' }

export function AdviceCard({
  orders,
  peakHour,
  onChangePrice,
  onShow
}: AdviceCardProps): React.JSX.Element {
  // Only this card needs the clock: the rest of the screen does not re-render every minute
  const now = useNow(MINUTE)
  const { items, more } = adviceList(orders, MAX_ADVICE)

  return (
    <ListCard
      title="Suggestions"
      description="Ce que je ferais à votre place"
      icon={Lightbulb}
      className="border-wf-gold/60"
      contentClassName="space-y-3 px-4"
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tous vos ordres sont bien placés.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((advice) => (
            <li key={advice.orderId} className="space-y-1.5 rounded-md bg-muted px-3 py-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span
                  className={cn('size-2 shrink-0 rounded-full', TONE_DOTS[advice.tone])}
                  aria-hidden="true"
                />
                {advice.title}
              </p>
              <p className="text-xs text-muted-foreground">{advice.description}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (advice.action.kind === 'price') {
                    onChangePrice(advice.orderId, advice.action.price)
                  } else {
                    onShow(advice.orderId)
                  }
                }}
              >
                {advice.action.label}
                <span className="sr-only"> pour {advice.itemName}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <p className="text-xs text-muted-foreground">
          +{' '}
          {formatCountWord(
            more,
            'autre suggestion moins urgente',
            'autres suggestions moins urgentes'
          )}
        </p>
      )}
      <p className="flex items-start gap-2 rounded-md bg-wf-gold/15 px-3 py-2.5 text-xs font-medium text-wf-gold">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        {peakReminder(now, peakHour)}
      </p>
    </ListCard>
  )
}
