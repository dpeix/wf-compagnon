import { Activity, CircleAlert, Coins, Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { ActivityCard } from './activity-card'
import { ChangeBadge } from './change-badge'
import { formatCount, formatPlatinum } from './format'
import { ItemList } from './item-list'
import { KpiCard } from './kpi-card'
import { failedItemsMessage } from './live-data'
import { ListCard } from './list-card'
import { SourceBar } from './market-status'
import { mostTraded, summarizeMarket, topMovers } from './overview-data'
import type { MarketItemSummary, MarketOverviewData } from './types'

interface MarketOverviewProps {
  data: MarketOverviewData
  currentHour: number
  refreshing: boolean
  onRefresh: () => void
  onSelectItem: (slug: string) => void
}

const NBSP = ' '
const LIST_SIZE = 5

const salesSubtitle = (item: MarketItemSummary): string =>
  `${formatCount(item.sales24h)} ventes (24${NBSP}h)`

export function MarketOverview({
  data,
  currentHour,
  refreshing,
  onRefresh,
  onSelectItem
}: MarketOverviewProps): React.JSX.Element {
  const summary = summarizeMarket(data.items)
  const tracked = `sur ${formatCount(data.items.length)} objets suivis`
  const hasHourlySales = data.hourlySales.some((v) => v > 0)
  const failedNotice = failedItemsMessage(data.failed)

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble du marché</h1>
          <p className="text-sm text-muted-foreground">
            Tendances, volumes et activité des objets suivis sur warframe.market
          </p>
        </div>
        <SourceBar fetchedAt={data.fetchedAt} loading={refreshing} onRefresh={onRefresh} />
      </div>

      {failedNotice && (
        <p
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          role="status"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {failedNotice}
        </p>
      )}

      <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label={`Ventes conclues (24${NBSP}h)`}
          value={formatCount(data.sales24h)}
          icon={Activity}
          change={data.salesChange === null ? null : <ChangeBadge ratio={data.salesChange} />}
          detail={data.salesChange === null ? tracked : 'vs les 24 h précédentes'}
        />
        <KpiCard
          label={`Platine échangé (24${NBSP}h)`}
          value={formatPlatinum(data.platinum24h)}
          icon={Coins}
          change={data.platinumChange === null ? null : <ChangeBadge ratio={data.platinumChange} />}
          detail={data.platinumChange === null ? tracked : 'vs les 24 h précédentes'}
        />
        <KpiCard
          label={`Objets en hausse (7${NBSP}j)`}
          value={formatCount(summary.rising)}
          icon={TrendingUp}
          detail={tracked}
        />
        <KpiCard
          label={`Objets en baisse (7${NBSP}j)`}
          value={formatCount(summary.falling)}
          icon={TrendingDown}
          detail={tracked}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard
          title="Plus fortes hausses"
          description="Prix médian sur 7 jours"
          icon={TrendingUp}
        >
          <ItemList
            items={topMovers(data.items, 'up', LIST_SIZE)}
            subtitle={salesSubtitle}
            onSelect={onSelectItem}
          />
        </ListCard>
        <ListCard
          title="Plus fortes baisses"
          description="Prix médian sur 7 jours"
          icon={TrendingDown}
        >
          <ItemList
            items={topMovers(data.items, 'down', LIST_SIZE)}
            subtitle={salesSubtitle}
            onSelect={onSelectItem}
          />
        </ListCard>
        <ListCard
          title="Les plus échangés"
          description={`Nombre de ventes sur 24${NBSP}h`}
          icon={Flame}
        >
          <ItemList
            items={mostTraded(data.items, LIST_SIZE)}
            subtitle={salesSubtitle}
            onSelect={onSelectItem}
          />
        </ListCard>
      </div>

      {hasHourlySales && (
        <ActivityCard
          hourlySales={data.hourlySales}
          currentHour={currentHour}
          description="Ventes par heure des objets suivis, moyenne des 48 dernières heures"
        />
      )}
    </div>
  )
}
