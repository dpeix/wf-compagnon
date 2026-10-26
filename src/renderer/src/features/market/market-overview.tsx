import { Activity, Flame, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { ActivityCard } from './activity-card'
import { ChangeBadge } from './change-badge'
import { EventsCard } from './events-card'
import { formatCount } from './format'
import { ItemList } from './item-list'
import { KpiCard } from './kpi-card'
import { ListCard } from './list-card'
import { mostTraded, summarizeMarket, topMovers } from './overview-data'
import type { MarketEvent, MarketItemSummary, PlayersSummary } from './types'

interface MarketOverviewProps {
  items: readonly MarketItemSummary[]
  hourlySales: readonly number[]
  currentHour: number
  players: PlayersSummary
  salesChangeVsYesterday: number
  events: readonly MarketEvent[]
}

const NBSP = ' '
const LIST_SIZE = 5

const sellersSubtitle = (item: MarketItemSummary): string =>
  `${formatCount(item.sellersInGame)} vendeurs en jeu`
const salesSubtitle = (item: MarketItemSummary): string => `${formatCount(item.sales24h)} ventes`

export function MarketOverview({
  items,
  hourlySales,
  currentHour,
  players,
  salesChangeVsYesterday,
  events
}: MarketOverviewProps): React.JSX.Element {
  const summary = summarizeMarket(items)
  const tracked = `sur ${formatCount(items.length)} objets suivis`

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble du marché</h1>
        <p className="text-sm text-muted-foreground">
          Tendances, volumes et activité de warframe.market · données d&apos;exemple
        </p>
      </div>

      <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label={`Ventes conclues (24${NBSP}h)`}
          value={formatCount(summary.sales24h)}
          icon={Activity}
          change={<ChangeBadge ratio={salesChangeVsYesterday} />}
          detail="vs hier"
        />
        <KpiCard
          label="Joueurs en jeu"
          value={formatCount(players.inGame)}
          icon={Users}
          change={<ChangeBadge ratio={players.changeVsYesterday} />}
          detail="vs même heure hier"
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
          <ItemList items={topMovers(items, 'up', LIST_SIZE)} subtitle={sellersSubtitle} />
        </ListCard>
        <ListCard
          title="Plus fortes baisses"
          description="Prix médian sur 7 jours"
          icon={TrendingDown}
        >
          <ItemList items={topMovers(items, 'down', LIST_SIZE)} subtitle={sellersSubtitle} />
        </ListCard>
        <ListCard
          title="Les plus échangés"
          description={`Nombre de ventes sur 24${NBSP}h`}
          icon={Flame}
        >
          <ItemList items={mostTraded(items, LIST_SIZE)} subtitle={salesSubtitle} />
        </ListCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <ActivityCard hourlySales={hourlySales} currentHour={currentHour} />
        <EventsCard events={events} />
      </div>
    </div>
  )
}
