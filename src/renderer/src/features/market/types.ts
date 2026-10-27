// Types of the warframe.market data come from the main process (src/shared/market.ts);
// the ones below only exist in the renderer.
export type {
  DatedPricePoint,
  ItemDetail,
  MarketItemSummary,
  MarketOrder,
  MarketOverviewData,
  PricePoint
} from '../../../../shared/market'

export interface ActivityDescription {
  level: 'faible' | 'normale' | 'forte'
  /** Current hour compared to the daily average, as a ratio */
  changeVsAverage: number
  /** Hour (0–23) with the most sales; the first one on ties */
  peakHour: number
}

/** What the "Meilleures heures" screen knows about one scope (whole market or one item). */
export interface SalesWeek {
  /** Average sales per hour: 7 days (Monday first) × 24 hours */
  sales: readonly (readonly number[])[]
  /** Median time to sell, in minutes, for each hour of the day */
  medianDelay: readonly number[]
  /** Average number of sellers in game, for each hour of the day */
  sellersInGame: readonly number[]
  /** Days of snapshots recorded so far, and how many make the map reliable */
  daysCollected: number
  daysNeeded: number
}

/** One of my warframe.market orders, with the prices of the other players in game on its side. */
export interface MyOrder {
  id: string
  itemName: string
  side: 'sell' | 'buy'
  price: number
  quantity: number
  visible: boolean
  /** Prices of the other players in game with an order on the same side */
  competitors: readonly number[]
  /** Best price in game on the other side (highest buyer for a sale, cheapest seller for a purchase) */
  opposite: number | null
}

export interface WatchRule {
  /** 'below': alert when the price drops to the threshold; 'above': when it climbs to it */
  direction: 'below' | 'above'
  threshold: number
}

export interface WatchItem {
  id: string
  itemName: string
  /** Current best sell price in game */
  price: number
  rule: WatchRule
}

export interface CompletedSale {
  price: number
  quantity: number
  /** Time between publishing the order and the sale */
  delayMinutes: number
}
