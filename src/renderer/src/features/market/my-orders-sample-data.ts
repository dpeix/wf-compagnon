import type { CompletedSale, MyOrder, WatchItem } from './types'

// Example data for the "Mes ordres & suivi" screen, until the warframe.market login exists
// (plan.md, sprint 4). Competitor prices are the players in game on the same side; opposite is
// the best price in game on the other side (the Ash Prime Set prices match the item screen).

export const sampleMyOrders: readonly MyOrder[] = [
  {
    id: 'ash',
    itemName: 'Ash Prime Set',
    side: 'sell',
    price: 215,
    quantity: 1,
    visible: true,
    competitors: [210, 210, 212, 218, 220, 220, 225, 230, 235, 240, 245, 250],
    opposite: 195
  },
  {
    id: 'energize',
    itemName: 'Arcane Energize',
    side: 'sell',
    price: 52,
    quantity: 3,
    visible: true,
    competitors: [53, 54, 55, 55, 56, 58, 60],
    opposite: 48
  },
  {
    id: 'shred',
    itemName: 'Primed Shred',
    side: 'sell',
    price: 40,
    quantity: 1,
    visible: true,
    competitors: [38, 39, 40, 41, 42],
    opposite: 35
  },
  {
    id: 'wisp',
    itemName: 'Wisp Prime Set',
    side: 'sell',
    price: 150,
    quantity: 1,
    visible: true,
    competitors: [150, 155, 158, 160],
    opposite: 140
  },
  {
    id: 'khora',
    itemName: 'Khora Prime Set',
    side: 'sell',
    price: 140,
    quantity: 1,
    visible: true,
    competitors: [165, 168, 170],
    opposite: 150
  },
  {
    id: 'aptitude',
    itemName: 'Galvanized Aptitude',
    side: 'sell',
    price: 34,
    quantity: 2,
    visible: false,
    competitors: [33, 34, 35, 36],
    opposite: 30
  },
  {
    id: 'grace',
    itemName: 'Arcane Grace',
    side: 'buy',
    price: 25,
    quantity: 1,
    visible: true,
    competitors: [27, 26, 24, 22],
    opposite: 28
  }
]

export const sampleWatchlist: readonly WatchItem[] = [
  {
    id: 'grace',
    itemName: 'Arcane Grace',
    price: 28,
    rule: { direction: 'below', threshold: 30 }
  },
  {
    id: 'nekros',
    itemName: 'Nekros Prime Set',
    price: 85,
    rule: { direction: 'below', threshold: 80 }
  },
  {
    id: 'saryn',
    itemName: 'Saryn Prime Set',
    price: 118,
    rule: { direction: 'below', threshold: 100 }
  },
  {
    id: 'continuity',
    itemName: 'Primed Continuity',
    price: 26,
    rule: { direction: 'above', threshold: 30 }
  }
]

/** My sales of the last 7 days. */
export const sampleRecentSales: readonly CompletedSale[] = [
  { price: 210, quantity: 1, delayMinutes: 25 },
  { price: 52, quantity: 3, delayMinutes: 18 },
  { price: 38, quantity: 1, delayMinutes: 55 },
  { price: 85, quantity: 1, delayMinutes: 40 },
  { price: 26, quantity: 2, delayMinutes: 12 },
  { price: 150, quantity: 1, delayMinutes: 95 },
  { price: 34, quantity: 1, delayMinutes: 30 },
  { price: 18, quantity: 2, delayMinutes: 22 },
  { price: 62, quantity: 1, delayMinutes: 48 },
  { price: 28, quantity: 1, delayMinutes: 60 },
  { price: 21, quantity: 1, delayMinutes: 35 },
  { price: 34, quantity: 1, delayMinutes: 52 }
]
