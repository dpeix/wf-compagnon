import { useState } from 'react'
import { Store, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  bestCompetitorPrice,
  formatRank,
  orderRank,
  rankTone,
  suggestAdjustment
} from './my-orders'
import type { MyOrder } from './types'

interface MyOrdersTableProps {
  orders: readonly MyOrder[]
  onChangePrice: (orderId: string, price: number) => void
}

const TONE_CLASSES = {
  good: 'bg-success/15 text-success',
  medium: 'bg-wf-gold/15 text-wf-gold',
  bad: 'bg-destructive/15 text-destructive'
} as const

export function MyOrdersTable({ orders, onChangePrice }: MyOrdersTableProps): React.JSX.Element {
  const [side, setSide] = useState<MyOrder['side']>('sell')
  const visible = orders.filter((o) => o.side === side)
  const count = (s: MyOrder['side']): number => orders.filter((o) => o.side === s).length

  return (
    <ListCard
      title={side === 'sell' ? 'Mes ordres de vente' : "Mes ordres d'achat"}
      description="Comparés aux joueurs en jeu sur le même objet"
      icon={Store}
      contentClassName="px-4"
      action={
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={side}
          onValueChange={(value) => {
            // Ignore the empty value Radix sends when the active side is clicked again
            if (value === 'sell' || value === 'buy') setSide(value)
          }}
          aria-label="Type d'ordres"
        >
          <ToggleGroupItem value="sell" className="px-3">
            Vente · {formatCount(count('sell'))}
          </ToggleGroupItem>
          <ToggleGroupItem value="buy" className="px-3">
            Achat · {formatCount(count('buy'))}
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {side === 'sell' ? 'Aucun ordre de vente.' : "Aucun ordre d'achat."}
        </p>
      ) : (
        <Table aria-label={side === 'sell' ? 'Mes ordres de vente' : "Mes ordres d'achat"}>
          <TableHeader>
            <TableRow>
              <TableHead>Objet</TableHead>
              <TableHead className="text-right">Mon prix</TableHead>
              <TableHead className="text-right">Meilleur concurrent</TableHead>
              <TableHead>Rang</TableHead>
              <TableHead className="text-right">
                <abbr title="Quantité" className="no-underline">
                  Qté
                </abbr>
              </TableHead>
              <TableHead>Visibilité</TableHead>
              <TableHead>
                <span className="sr-only">Suggestion</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((order) => {
              const rank = orderRank(order)
              const suggestion = suggestAdjustment(order)
              const best = bestCompetitorPrice(order)
              return (
                <TableRow key={order.id} className={cn(!order.visible && 'opacity-60')}>
                  <TableCell className="font-medium">{order.itemName}</TableCell>
                  <TableCell className="text-right font-medium text-wf-gold tabular-nums">
                    {formatPlatinum(order.price)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {best === null ? '—' : formatPlatinum(best)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={TONE_CLASSES[rankTone(rank)]}>
                      {formatRank(rank)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    <span aria-hidden="true">×{order.quantity}</span>
                    <span className="sr-only">{order.quantity}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.visible ? 'outline' : 'secondary'}>
                      {order.visible ? 'Visible' : 'Masqué'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {suggestion && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onChangePrice(order.id, suggestion.price)
                        }}
                      >
                        <Zap aria-hidden="true" />
                        Passer à {formatPlatinum(suggestion.price)}
                        <span className="sr-only"> pour {order.itemName}</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </ListCard>
  )
}
