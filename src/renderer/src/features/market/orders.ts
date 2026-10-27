import type { MarketOrder } from './types'

const STATUS_RANK: Record<MarketOrder['status'], number> = { ingame: 0, online: 1, offline: 2 }

/** Orders of one side: players in game first, then the best price for me (lowest sell, highest buy). */
export function sortOrders(
  orders: readonly MarketOrder[],
  side: MarketOrder['side'],
  inGameOnly: boolean
): MarketOrder[] {
  const direction = side === 'sell' ? 1 : -1
  return orders
    .filter((o) => o.side === side && (!inGameOnly || o.status === 'ingame'))
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.price - b.price) * direction ||
        b.reputation - a.reputation
    )
}

/** Best price among players in game: lowest sell price or highest buy price. */
export function bestPrice(
  orders: readonly MarketOrder[],
  side: MarketOrder['side']
): number | null {
  const prices = orders.filter((o) => o.side === side && o.status === 'ingame').map((o) => o.price)
  if (prices.length === 0) return null
  return side === 'sell' ? Math.min(...prices) : Math.max(...prices)
}

export function countInGame(orders: readonly MarketOrder[], side: MarketOrder['side']): number {
  return orders.filter((o) => o.side === side && o.status === 'ingame').length
}

/** How many players in game share the best price of a side. */
export function countAtBestPrice(
  orders: readonly MarketOrder[],
  side: MarketOrder['side']
): number {
  const best = bestPrice(orders, side)
  return orders.filter((o) => o.side === side && o.status === 'ingame' && o.price === best).length
}

/**
 * Price to sell fast: 1 platinum under the cheapest seller in game,
 * but never at or under what a buyer in game already offers.
 * When a buyer pays at least the cheapest sell price, selling to that buyer is faster.
 */
export function suggestSellPrice(orders: readonly MarketOrder[]): number | null {
  const lowestSell = bestPrice(orders, 'sell')
  if (lowestSell === null) return null
  const highestBuy = bestPrice(orders, 'buy')
  if (highestBuy !== null && highestBuy >= lowestSell) return highestBuy
  const floor = highestBuy === null ? 1 : highestBuy + 1
  return Math.max(lowestSell - 1, floor, 1)
}

/** Gap between the best sell and buy prices; the ratio is relative to the buy price. */
export function priceSpread(
  bestSell: number | null,
  bestBuy: number | null
): { amount: number; ratio: number } | null {
  if (bestSell === null || bestBuy === null || bestBuy <= 0) return null
  const amount = bestSell - bestBuy
  return { amount, ratio: amount / bestBuy }
}

/** In-game whisper in the format warframe.market uses, ready to paste in the chat. */
export function whisperMessage(order: MarketOrder, itemName: string): string {
  const action = order.side === 'sell' ? 'buy' : 'sell'
  return `/w ${order.user} Hi! I want to ${action}: "${itemName}" for ${String(order.price)} platinum. (warframe.market)`
}
