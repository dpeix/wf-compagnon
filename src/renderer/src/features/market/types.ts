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
