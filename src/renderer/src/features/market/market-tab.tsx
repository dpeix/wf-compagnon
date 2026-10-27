import { useState } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sampleSalesWeeks } from './best-hours-sample-data'
import { BestHoursView } from './best-hours-view'
import { ItemDetail } from './item-detail'
import { describeLoadError } from './live-data'
import { MarketOverview } from './market-overview'
import { ErrorPanel, LoadingPanel, RefreshError } from './market-status'
import { sampleMyOrders, sampleRecentSales, sampleWatchlist } from './my-orders-sample-data'
import { MyOrdersView } from './my-orders-view'
import { sampleHourlySales } from './sample-data'
import type { ItemDetail as ItemDetailData, MarketOverviewData, MyOrder } from './types'
import { useAsync } from './use-async'
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

// Item shown before one is picked in the overview (there is no search yet)
const DEFAULT_ITEM = 'ash_prime_set'

// Stable references: useAsync reloads when the loader changes
const loadOverview = (_key: string, fresh: boolean): Promise<MarketOverviewData> =>
  window.api.market.getOverview(fresh)
const loadItem = (slug: string, fresh: boolean): Promise<ItemDetailData> =>
  window.api.market.getItem(slug, fresh)

/**
 * A screen that throws while rendering (unexpected data) shows an error instead of a blank
 * window. "Réessayer" loads the data again (`reload`) and the screen is rendered again once
 * they arrive (`data` changes); screens without data to load are simply rendered again.
 */
function ScreenBoundary({
  reload,
  data,
  children
}: {
  reload?: () => void
  data?: unknown
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <ErrorBoundary
      resetKey={data}
      fallback={(reset) => (
        <div className="p-6">
          <ErrorPanel
            message="Cet écran n'a pas pu afficher les données reçues."
            onRetry={reload ?? reset}
          />
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

export function MarketTab(): React.JSX.Element {
  const currentHour = useCurrentHour()
  const [section, setSection] = useState<string>('overview')
  const [slug, setSlug] = useState(DEFAULT_ITEM)
  // Kept here so the preview changes of "Mes ordres" survive a sub-tab switch
  const [myOrders, setMyOrders] = useState<readonly MyOrder[]>(sampleMyOrders)
  // Loaded here, not in the sub-tabs, so switching tabs does not reload them
  const overview = useAsync(loadOverview, 'overview')
  // The item screen only loads once it has been opened: its requests would otherwise
  // queue up behind (and slow down) the overview ones at startup
  const [itemOpened, setItemOpened] = useState(false)
  const item = useAsync(loadItem, slug, itemOpened)

  const changeSection = (next: string): void => {
    if (next === 'item') setItemOpened(true)
    setSection(next)
  }
  const openItem = (next: string): void => {
    setSlug(next)
    changeSection('item')
  }

  return (
    <Tabs value={section} onValueChange={changeSection} className="gap-0">
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
        <ScreenBoundary reload={overview.reload} data={overview.state.data}>
          {overview.state.status === 'error' && overview.state.data && (
            <RefreshError error={overview.state.error} />
          )}
          {overview.state.data ? (
            <MarketOverview
              data={overview.state.data}
              currentHour={currentHour}
              refreshing={overview.state.status === 'loading'}
              onRefresh={overview.reload}
              onSelectItem={openItem}
            />
          ) : (
            <div className="p-6">
              {overview.state.status === 'error' ? (
                <ErrorPanel
                  message={describeLoadError(overview.state.error)}
                  onRetry={overview.reload}
                />
              ) : (
                <LoadingPanel label="Chargement des objets suivis depuis warframe.market… (une dizaine de secondes la première fois)" />
              )}
            </div>
          )}
        </ScreenBoundary>
      </TabsContent>
      <TabsContent value="item">
        <ScreenBoundary reload={item.reload} data={item.state.data}>
          {item.state.status === 'error' && item.state.data && (
            <RefreshError error={item.state.error} />
          )}
          {item.state.data ? (
            <ItemDetail
              item={item.state.data}
              refreshing={item.state.status === 'loading'}
              onRefresh={item.reload}
            />
          ) : (
            <div className="p-6">
              {item.state.status === 'error' ? (
                <ErrorPanel message={describeLoadError(item.state.error)} onRetry={item.reload} />
              ) : (
                <LoadingPanel label="Chargement de la fiche depuis warframe.market…" />
              )}
            </div>
          )}
        </ScreenBoundary>
      </TabsContent>
      <TabsContent value="best-hours">
        <ScreenBoundary>
          <BestHoursView
            market={sampleSalesWeeks.market}
            item={sampleSalesWeeks.item}
            itemName="Ash Prime Set"
          />
        </ScreenBoundary>
      </TabsContent>
      <TabsContent value="my-orders">
        <ScreenBoundary>
          <MyOrdersView
            orders={myOrders}
            onOrdersChange={setMyOrders}
            watchlist={sampleWatchlist}
            recentSales={sampleRecentSales}
            hourlySales={sampleHourlySales}
          />
        </ScreenBoundary>
      </TabsContent>
    </Tabs>
  )
}
