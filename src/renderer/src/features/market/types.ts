/** One tradable item as shown in the market overview lists. */
export interface MarketItemSummary {
  slug: string
  name: string
  /** Median sell price, in platinum */
  price: number
  /** Price change over 7 days, as a ratio: 0.114 means +11.4 % */
  change7d: number
  sales24h: number
  sellersInGame: number
  /** Daily median prices over the last 7 days, oldest first */
  history7d: readonly number[]
}

export interface ActivityDescription {
  level: 'faible' | 'normale' | 'forte'
  /** Current hour compared to the daily average, as a ratio */
  changeVsAverage: number
  /** Hour (0–23) with the most sales; the first one on ties */
  peakHour: number
}

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

/** Everything the item screen shows about one item. */
export interface ItemDetail {
  slug: string
  name: string
  category: string
  /** Ducat value when known */
  ducats: number | null
  tags: readonly string[]
  orders: readonly MarketOrder[]
  /** One point per hour, oldest first; 49 points cover 48 hours of change */
  hourly: readonly DatedPricePoint[]
  /** One point per day, oldest first; 91 points cover 90 days of change */
  daily: readonly DatedPricePoint[]
  parts: readonly { name: string; price: number }[]
  /** Estimates shown as is until the app records its own snapshots (plan.md) */
  bestHours: string
  saleChances: readonly { price: number; chance: number; delay: string }[]
}

export interface PlayersSummary {
  inGame: number
  /** Compared with the same hour yesterday, as a ratio */
  changeVsYesterday: number
}

export interface MarketEvent {
  id: string
  title: string
  description: string
  when: string
  tone: 'danger' | 'gold' | 'neutral'
}
