import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sampleSalesWeeks } from './best-hours-sample-data'
import { BestHoursView } from './best-hours-view'
import { ItemDetail } from './item-detail'
import { sampleItemDetail } from './item-sample-data'
import { MarketOverview } from './market-overview'
import { sampleMyOrders, sampleRecentSales, sampleWatchlist } from './my-orders-sample-data'
import { MyOrdersView } from './my-orders-view'
import {
  sampleEvents,
  sampleHourlySales,
  sampleItems,
  samplePlayers,
  sampleSalesChangeVsYesterday
} from './sample-data'
import type { MyOrder } from './types'
import { useCurrentHour } from './use-current-hour'

// Gold underline sitting on the bottom border (shadcn puts it 5px below the trigger)
const SUBTAB_CLASSES =
  'px-3 after:bg-wf-gold group-data-[orientation=horizontal]/tabs:after:bottom-[-1px]'

const SECTIONS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'item', label: 'Fiche objet' },
  { id: 'best-hours', label: 'Meilleures heures' },
  { id: 'my-orders', label: 'Mes ordres & suivi' }
] as const

export function MarketTab(): React.JSX.Element {
  const currentHour = useCurrentHour()
  // Generated once: the sample history is anchored on the time the tab opened
  const [itemDetail] = useState(() => sampleItemDetail(new Date()))
  // Kept here so the preview changes of "Mes ordres" survive a sub-tab switch
  const [myOrders, setMyOrders] = useState<readonly MyOrder[]>(sampleMyOrders)
  return (
    <Tabs defaultValue="overview" className="gap-0">
      <div className="border-b px-6">
        {/* Same variant prefix as the shadcn defaults so tailwind-merge replaces them */}
        <TabsList variant="line" className="group-data-[orientation=horizontal]/tabs:h-12">
          {SECTIONS.map(({ id, label }) => (
            <TabsTrigger key={id} value={id} className={SUBTAB_CLASSES}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview">
        <MarketOverview
          items={sampleItems}
          hourlySales={sampleHourlySales}
          currentHour={currentHour}
          players={samplePlayers}
          salesChangeVsYesterday={sampleSalesChangeVsYesterday}
          events={sampleEvents}
        />
      </TabsContent>
      <TabsContent value="item">
        <ItemDetail item={itemDetail} />
      </TabsContent>
      <TabsContent value="best-hours">
        <BestHoursView
          market={sampleSalesWeeks.market}
          item={sampleSalesWeeks.item}
          itemName={itemDetail.name}
        />
      </TabsContent>
      <TabsContent value="my-orders">
        <MyOrdersView
          orders={myOrders}
          onOrdersChange={setMyOrders}
          watchlist={sampleWatchlist}
          recentSales={sampleRecentSales}
          hourlySales={sampleHourlySales}
        />
      </TabsContent>
    </Tabs>
  )
}
