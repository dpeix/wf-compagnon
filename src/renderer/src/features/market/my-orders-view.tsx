import { useState } from 'react'
import { Activity, Eye, EyeOff, Info, Store, Trophy, TrendingUp, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdviceCard } from './advice-card'
import { bestWindow, formatDuration } from './best-hours'
import { formatCount, formatPlatinum } from './format'
import { KpiCard } from './kpi-card'
import { formatCountWord, portfolioSummary, salesSummary } from './my-orders'
import { MyOrdersTable } from './my-orders-table'
import type { CompletedSale, MyOrder, WatchItem } from './types'
import { WatchlistCard } from './watchlist-card'

interface MyOrdersViewProps {
  /** Owned by the market tab, so preview changes survive a sub-tab switch */
  orders: readonly MyOrder[]
  onOrdersChange: (update: (orders: readonly MyOrder[]) => readonly MyOrder[]) => void
  watchlist: readonly WatchItem[]
  recentSales: readonly CompletedSale[]
  /** Usual sales per hour, to find the evening peak */
  hourlySales: readonly number[]
}

export function MyOrdersView({
  orders,
  onOrdersChange,
  watchlist,
  recentSales,
  hourlySales
}: MyOrdersViewProps): React.JSX.Element {
  // Last change, announced to screen readers (the button that was used may disappear)
  const [announcement, setAnnouncement] = useState('')
  const summary = portfolioSummary(orders)
  const sales = salesSummary(recentSales)
  const peakHour = bestWindow(hourlySales, 1).start
  const allHidden = orders.length > 0 && orders.every((o) => !o.visible)

  const update = (orderId: string, change: Partial<MyOrder>, message: string): void => {
    onOrdersChange((current) => current.map((o) => (o.id === orderId ? { ...o, ...change } : o)))
    setAnnouncement(message)
  }
  const nameOf = (orderId: string): string => orders.find((o) => o.id === orderId)?.itemName ?? ''
  const changePrice = (orderId: string, price: number): void => {
    update(orderId, { price }, `${nameOf(orderId)} passé à ${formatPlatinum(price)}.`)
  }
  const show = (orderId: string): void => {
    update(orderId, { visible: true }, `${nameOf(orderId)} est de nouveau visible.`)
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Mes ordres &amp; suivi</h1>
          <p className="text-sm text-muted-foreground">
            Vos ordres warframe.market comparés aux joueurs en jeu · données d&apos;exemple
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={orders.length === 0}
          onClick={() => {
            onOrdersChange((current) => current.map((o) => ({ ...o, visible: allHidden })))
            setAnnouncement(
              allHidden ? 'Tous les ordres sont visibles.' : 'Tous les ordres sont masqués.'
            )
          }}
        >
          {allHidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          {allHidden ? 'Tout afficher' : 'Tout masquer'}
        </Button>
        <span title="Disponible avec la connexion warframe.market">
          <Button size="sm" className="bg-wf-gold text-primary-foreground" disabled>
            <Zap aria-hidden="true" />
            Nouvel ordre
            <span className="sr-only"> (disponible avec la connexion warframe.market)</span>
          </Button>
        </span>
      </div>

      <p
        className="flex items-start gap-2 rounded-md border border-info/40 bg-info/10 px-3 py-2.5 text-xs text-info"
        role="note"
      >
        <Info className="size-4 shrink-0" aria-hidden="true" />
        Aperçu : les boutons modifient vos ordres ici seulement. Rien n&apos;est envoyé à
        warframe.market tant que la connexion n&apos;existe pas.
      </p>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Ordres de vente actifs"
          value={formatCount(summary.visibleSell)}
          icon={Store}
          change={
            summary.hiddenSell > 0 ? (
              <Badge variant="secondary">{formatCountWord(summary.hiddenSell, 'masqué')}</Badge>
            ) : null
          }
          detail="visibles par les acheteurs"
        />
        <KpiCard
          label="Valeur en vente"
          value={formatPlatinum(summary.sellValue)}
          icon={Activity}
          detail="ordres visibles, quantités comprises"
        />
        <KpiCard
          label="En tête du marché"
          value={`${formatCount(summary.leading)} / ${formatCount(summary.visibleSell)}`}
          icon={Trophy}
          change={
            summary.toAdjust > 0 ? (
              <Badge variant="secondary" className="bg-wf-gold/15 text-wf-gold">
                {formatCount(summary.toAdjust)} à ajuster
              </Badge>
            ) : null
          }
          detail="ordres de vente visibles"
        />
        <KpiCard
          label="Vendu sur 7 jours"
          value={formatPlatinum(sales.platinum)}
          icon={TrendingUp}
          change={
            <Badge variant="secondary" className="bg-success/15 text-success">
              {formatCountWord(sales.count, 'vente')}
            </Badge>
          }
          detail={
            sales.averageDelay === null
              ? 'aucune vente'
              : `délai moyen ${formatDuration(sales.averageDelay)}`
          }
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <MyOrdersTable orders={orders} onChangePrice={changePrice} />
          <WatchlistCard items={watchlist} />
        </div>
        <AdviceCard orders={orders} peakHour={peakHour} onChangePrice={changePrice} onShow={show} />
      </div>
    </div>
  )
}
