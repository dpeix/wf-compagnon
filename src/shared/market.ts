// Types and IPC channels shared by the main process (warframe.market client) and the renderer.
// Dates cross the IPC boundary as Date objects (Electron uses the structured clone algorithm).

/** Price of an item over one time bucket (an hour or a day), in platinum. */
export interface PricePoint {
  avg: number
  min: number
  max: number
}

export interface DatedPricePoint extends PricePoint {
  date: Date
  /** Number of sales in the bucket */
  volume: number
}

/** One tradable item as shown in the market overview lists. */
export interface MarketItemSummary {
  slug: string
  name: string
  /** Best sell price in game, or the latest median price when nobody sells in game */
  price: number
  /** Price change over 7 days, as a ratio: 0.114 means +11.4 % */
  change7d: number
  sales24h: number
  /** Sellers in game, when known */
  sellersInGame: number | null
  /** Daily median prices, oldest first */
  history7d: readonly number[]
}

export interface MarketOrder {
  id: string
  /** 'sell': a player sells the item; 'buy': a player wants to buy it */
  side: 'sell' | 'buy'
  user: string
  status: 'ingame' | 'online' | 'offline'
  reputation: number
  price: number
  quantity: number
}

/** Price of a set compared with its parts, on the item screen. */
export type SetPartsPrices =
  | { status: 'not-a-set' }
  /** A part has no seller in game among its best orders, or its price could not be loaded */
  | { status: 'unavailable' }
  /** Best sell price in game of one of each part, and how many of it the set needs */
  | { status: 'ok'; parts: readonly { name: string; quantity: number; price: number }[] }

/** Everything the item screen shows about one item. */
export interface ItemDetail {
  slug: string
  name: string
  category: string
  /** Ducat value when known */
  ducats: number | null
  /** Rank the prices refer to, for mods and arcanes (their max rank); null otherwise */
  rank: number | null
  tags: readonly string[]
  orders: readonly MarketOrder[]
  /** One point per hour with sales over the last 48 hours, oldest first */
  hourly: readonly DatedPricePoint[]
  /** One point per day over the last 90 days, oldest first */
  daily: readonly DatedPricePoint[]
  parts: SetPartsPrices
  /** When the oldest of the prices and history shown was received from warframe.market */
  fetchedAt: Date
}

export interface MarketOverviewData {
  items: readonly MarketItemSummary[]
  /** Average sales per hour of the day (local time), over the last 48 hours, all tracked items */
  hourlySales: readonly number[]
  sales24h: number
  /** Compared with the 24 hours before; null when there was nothing to compare with */
  salesChange: number | null
  platinum24h: number
  platinumChange: number | null
  /** Names of the tracked items that could not be loaded or have no price at all */
  failed: readonly string[]
  /** When the oldest of the prices and statistics shown was received from warframe.market */
  fetchedAt: Date
}

/** API exposed by the preload as window.api.market. `fresh` skips the cache (Actualiser). */
export interface MarketApi {
  getOverview: (fresh?: boolean) => Promise<MarketOverviewData>
  getItem: (slug: string, fresh?: boolean) => Promise<ItemDetail>
}

export const MARKET_CHANNELS = {
  overview: 'market:get-overview',
  item: 'market:get-item'
} as const

/** warframe.market item slugs: lowercase letters, digits and underscores. */
export const ITEM_SLUG_PATTERN = /^[a-z0-9_]{1,100}$/
