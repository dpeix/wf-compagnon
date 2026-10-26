import { Lightbulb, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCount, formatPlatinum } from './format'
import { sellingTrend } from './item-insights'
import { ListCard } from './list-card'
import { bestPrice, countAtBestPrice, countInGame, suggestSellPrice } from './orders'
import type { MarketOrder } from './types'

interface SaleAdviceCardProps {
  orders: readonly MarketOrder[]
  /** Price change over the last 7 days, as a ratio */
  weekChange: number
  bestHours: string
}

const TREND_ADVICE = {
  falling: { text: 'En baisse : ne pas attendre', className: 'text-destructive' },
  rising: { text: 'En hausse : vous pouvez attendre', className: 'text-success' },
  stable: { text: 'Stable', className: '' }
} as const

export function SaleAdviceCard({
  orders,
  weekChange,
  bestHours
}: SaleAdviceCardProps): React.JSX.Element {
  const suggested = suggestSellPrice(orders)
  const bestBuy = bestPrice(orders, 'buy')
  // suggestSellPrice returns the buy price itself when a buyer already pays enough
  const sellToBuyer = suggested !== null && suggested === bestBuy
  const trend = TREND_ADVICE[sellingTrend(weekChange)]

  return (
    <ListCard
      title="Recommandation de vente"
      description="D'après les vendeurs en jeu et la tendance sur 7 jours"
      icon={Lightbulb}
      className="border-wf-gold/60"
      contentClassName="space-y-3 px-4"
    >
      {suggested === null ? (
        <p className="text-sm text-muted-foreground">
          Aucun vendeur en jeu : pas assez d&apos;informations pour proposer un prix.
        </p>
      ) : (
        <>
          <div className="rounded-md bg-wf-gold/15 px-3 py-3">
            <p className="text-xs font-medium text-wf-gold">Prix conseillé pour vendre vite</p>
            <p className="text-2xl font-semibold tabular-nums">{formatPlatinum(suggested)}</p>
            <p className="text-xs text-muted-foreground">
              {sellToBuyer
                ? 'Un acheteur en jeu paie déjà ce prix : vendez-lui directement.'
                : "1 platine sous le vendeur en jeu le moins cher, sans descendre au prix d'un acheteur."}
            </p>
          </div>
          <dl className="space-y-2 text-xs">
            {[
              { label: 'Meilleur créneau', value: bestHours, className: '' },
              {
                label: 'Concurrence',
                value: `${formatCount(countInGame(orders, 'sell'))} vendeurs en jeu, ${formatCount(countAtBestPrice(orders, 'sell'))} au plus bas`,
                className: ''
              },
              { label: 'Tendance (7 j)', value: trend.text, className: trend.className }
            ].map(({ label, value, className }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={cn('text-right font-medium', className)}>{value}</dd>
              </div>
            ))}
          </dl>
          {/* Creating orders needs the warframe.market login (plan.md, sprint 4) */}
          <span title="Disponible avec la connexion warframe.market" className="block">
            <Button className="w-full bg-wf-gold text-primary-foreground" disabled>
              <Zap aria-hidden="true" />
              Créer l&apos;ordre à {formatPlatinum(suggested)}
              <span className="sr-only"> (disponible avec la connexion warframe.market)</span>
            </Button>
          </span>
        </>
      )}
    </ListCard>
  )
}
