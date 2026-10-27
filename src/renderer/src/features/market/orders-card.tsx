import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { formatCount, formatPlatinum } from './format'
import { ListCard } from './list-card'
import { countInGame, sortOrders, whisperMessage } from './orders'
import type { MarketOrder } from './types'

interface OrdersCardProps {
  itemName: string
  orders: readonly MarketOrder[]
}

const MAX_ROWS = 8
const FEEDBACK_MS = 2000

const STATUS = {
  ingame: { label: 'En jeu', dot: 'bg-success' },
  online: { label: 'En ligne', dot: 'bg-info' },
  offline: { label: 'Hors ligne', dot: 'bg-muted-foreground' }
} as const

type CopyState = { orderId: string; result: 'copied' | 'failed' } | null

/** Copies a whisper and remembers, for a short while, which row it came from. */
function useCopyFeedback(): [CopyState, (orderId: string, text: string) => void] {
  const [state, setState] = useState<CopyState>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    []
  )

  const show = (next: CopyState): void => {
    setState(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setState(null)
    }, FEEDBACK_MS)
  }

  const copy = (orderId: string, text: string): void => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        show({ orderId, result: 'copied' })
      })
      .catch((error: unknown) => {
        console.error('Failed to copy the whisper message', error)
        show({ orderId, result: 'failed' })
      })
  }

  return [state, copy]
}

export function OrdersCard({ itemName, orders }: OrdersCardProps): React.JSX.Element {
  const [side, setSide] = useState<MarketOrder['side']>('sell')
  const [inGameOnly, setInGameOnly] = useState(true)
  const [copyState, copy] = useCopyFeedback()

  const visible = sortOrders(orders, side, inGameOnly)
  const hidden = visible.length - MAX_ROWS
  // The counters follow the switch, like the table
  const count = (s: MarketOrder['side']): number =>
    inGameOnly ? countInGame(orders, s) : orders.filter((o) => o.side === s).length
  const copiedUser = orders.find((o) => o.id === copyState?.orderId)?.user

  return (
    <ListCard
      title="Ordres en cours"
      description="Joueurs en jeu en premier, puis par meilleur prix"
      icon={Users}
      contentClassName="space-y-3 px-4"
      action={
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={inGameOnly} onCheckedChange={setInGameOnly} />
            En jeu uniquement
          </label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={side}
            onValueChange={(value) => {
              // Ignore the empty value Radix sends when the active side is clicked again
              if (value === 'sell' || value === 'buy') setSide(value)
            }}
            aria-label="Côté des ordres"
          >
            <ToggleGroupItem value="sell" className="px-3">
              Vendeurs · {formatCount(count('sell'))}
            </ToggleGroupItem>
            <ToggleGroupItem value="buy" className="px-3">
              Acheteurs · {formatCount(count('buy'))}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    >
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {side === 'sell' ? 'Aucun vendeur' : 'Aucun acheteur'}
          {inGameOnly ? ' en jeu' : ''} pour le moment.
        </p>
      ) : (
        <Table aria-label={side === 'sell' ? 'Ordres de vente' : "Ordres d'achat"}>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Réputation</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead>
                <span className="sr-only">Message</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.slice(0, MAX_ROWS).map((order) => {
              const feedback = copyState?.orderId === order.id ? copyState.result : null
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.user}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={cn('size-2 rounded-full', STATUS[order.status].dot)}
                        aria-hidden="true"
                      />
                      {STATUS[order.status].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {formatCount(order.reputation)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-wf-gold tabular-nums">
                    {formatPlatinum(order.price)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    ×{order.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        copy(order.id, whisperMessage(order, itemName))
                      }}
                    >
                      {feedback === 'copied' ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <Copy aria-hidden="true" />
                      )}
                      {feedback === 'copied'
                        ? 'Copié'
                        : feedback === 'failed'
                          ? 'Échec'
                          : 'Message'}
                      <span className="sr-only"> pour {order.user}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {hidden > 0 && (
        <p className="text-xs text-muted-foreground">
          + {formatCount(hidden)} autres ordres, moins bien placés
        </p>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {copyState?.result === 'failed'
          ? "Impossible d'accéder au presse-papiers."
          : copyState?.result === 'copied' && copiedUser
            ? `Message pour ${copiedUser} copié : collez-le dans le chat du jeu.`
            : 'Le bouton copie le message de whisper à coller dans le chat du jeu.'}
      </p>
    </ListCard>
  )
}
