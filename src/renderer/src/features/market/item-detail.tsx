import { Activity, Coins, ShoppingCart, Store } from 'lucide-react'
import { ChangeBadge } from './change-badge'
import { formatCount, formatPlatinum } from './format'
import { formatShare } from './item-insights'
import { ItemHeader } from './item-header'
import { KpiCard } from './kpi-card'
import { bestHoursFromHistory, lastDays } from './live-data'
import { SourceBar } from './market-status'
import { OrdersCard } from './orders-card'
import { bestPrice, countInGame, priceSpread } from './orders'
import { periodStats } from './price-chart'
import { PriceChartCard } from './price-chart-card'
import { SaleAdviceCard } from './sale-advice-card'
import { SetPartsCard } from './set-parts-card'
import type { ItemDetail as ItemDetailData } from './types'

interface ItemDetailProps {
  item: ItemDetailData
  refreshing: boolean
  onRefresh: () => void
}

const NBSP = ' '
const NO_VALUE = '—'

export function ItemDetail({ item, refreshing, onRefresh }: ItemDetailProps): React.JSX.Element {
  const bestSell = bestPrice(item.orders, 'sell')
  const bestBuy = bestPrice(item.orders, 'buy')
  const spread = priceSpread(bestSell, bestBuy)
  const inGame = (side: 'sell' | 'buy'): number => countInGame(item.orders, side)
  const quarter = item.daily.length > 0 ? periodStats(item.daily) : null
  const week = item.daily.length > 0 ? periodStats(lastDays(item.daily, 7)) : null
  const recent = item.hourly.length > 0 ? periodStats(item.hourly) : null

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Fil d'Ariane">
          <ol className="flex items-center gap-2 text-xs text-muted-foreground">
            <li>Marché</li>
            <li aria-hidden="true">/</li>
            <li>{item.category}</li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {item.name}
            </li>
          </ol>
        </nav>
        <SourceBar fetchedAt={item.fetchedAt} loading={refreshing} onRefresh={onRefresh} />
      </div>

      <ItemHeader item={item} />

      <section aria-label="Prix" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Meilleur prix de vente"
          value={bestSell === null ? NO_VALUE : formatPlatinum(bestSell)}
          icon={Store}
          detail={`${formatCount(inGame('sell'))} vendeurs en jeu`}
        />
        <KpiCard
          label="Meilleur prix d'achat"
          value={bestBuy === null ? NO_VALUE : formatPlatinum(bestBuy)}
          icon={ShoppingCart}
          detail={`${formatCount(inGame('buy'))} acheteurs en jeu`}
        />
        <KpiCard
          label="Écart achat / vente"
          value={spread === null ? NO_VALUE : formatPlatinum(Math.max(0, spread.amount))}
          icon={Activity}
          detail={
            spread === null
              ? 'il manque un vendeur ou un acheteur en jeu'
              : spread.amount < 0
                ? 'un acheteur paie plus que le moins cher des vendeurs'
                : `soit ${formatShare(spread.ratio)} du prix d'achat`
          }
        />
        <KpiCard
          label={`Prix moyen (48${NBSP}h)`}
          value={recent === null ? NO_VALUE : formatPlatinum(recent.average)}
          icon={Coins}
          change={quarter && <ChangeBadge ratio={quarter.change} />}
          detail={quarter ? 'sur 90 jours' : ''}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <PriceChartCard hourly={item.hourly} daily={item.daily} />
          <OrdersCard itemName={item.name} orders={item.orders} />
        </div>
        <div className="flex flex-col gap-4">
          <SaleAdviceCard
            orders={item.orders}
            weekChange={week?.change ?? 0}
            bestHours={bestHoursFromHistory(item.hourly)}
          />
          {item.parts.status !== 'not-a-set' && (
            <SetPartsCard
              setPrice={bestSell}
              parts={item.parts.status === 'ok' ? item.parts.parts : null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
