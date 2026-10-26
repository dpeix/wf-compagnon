// Logic of the "Mes ordres & suivi" screen.
import { formatDuration } from './best-hours'
import { formatCount, formatPlatinum } from './format'
import type { CompletedSale, MyOrder, WatchRule } from './types'

const NBSP = ' '

function assertPrice(value: number, what: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`Invalid ${what}: ${String(value)}`)
  }
}

function assertOrder(order: MyOrder): void {
  assertPrice(order.price, 'price')
  order.competitors.forEach((p) => {
    assertPrice(p, 'competitor price')
  })
  if (order.opposite !== null) assertPrice(order.opposite, 'opposite price')
  if (!Number.isInteger(order.quantity) || order.quantity < 1) {
    throw new RangeError(`Invalid quantity: ${String(order.quantity)}`)
  }
}

export interface OrderRank {
  /** 1 = best price of its side */
  position: number
  /** Other players at exactly my price */
  tied: number
  /** Players in game on this side, me included */
  total: number
}

/** My place among the players in game: cheapest first for a sale, highest first for a purchase. */
export function orderRank(order: MyOrder): OrderRank {
  assertOrder(order)
  const better = order.competitors.filter((p) =>
    order.side === 'sell' ? p < order.price : p > order.price
  ).length
  return {
    position: better + 1,
    tied: order.competitors.filter((p) => p === order.price).length,
    total: order.competitors.length + 1
  }
}

/** Best price of the other players in game: lowest for a sale, highest for a purchase. */
export function bestCompetitorPrice(order: MyOrder): number | null {
  if (order.competitors.length === 0) return null
  return order.side === 'sell' ? Math.min(...order.competitors) : Math.max(...order.competitors)
}

/** { 1, tied } → "1er ex æquo", { 4 of 13 } → "4e sur 13" */
export function formatRank({ position, tied, total }: OrderRank): string {
  if (!Number.isInteger(position) || position < 1 || position > total) {
    throw new RangeError(`Invalid rank: ${String(position)} of ${String(total)}`)
  }
  const ordinal = position === 1 ? '1er' : `${String(position)}e`
  const tie = tied > 0 ? ' ex æquo' : ''
  const among = position > 1 ? ` sur ${formatCount(total)}` : ''
  return `${ordinal}${tie}${among}`
}

export function rankTone({ position }: OrderRank): 'good' | 'medium' | 'bad' {
  if (position === 1) return 'good'
  if (position <= 3) return 'medium'
  return 'bad'
}

/**
 * Price that puts the order alone at the top of its side, with the same rules as the item screen
 * (suggestSellPrice): 1 platinum better than the best other player, but never crossing the other
 * side of the market; when the other side already offers a better deal, take it directly.
 * Null when the order is already there (or level with the best) or has no competition.
 */
export function suggestAdjustment(
  order: MyOrder
): { kind: 'lower' | 'raise'; price: number } | null {
  assertOrder(order)
  const best = bestCompetitorPrice(order)
  if (best === null) return null
  const { opposite } = order

  let target: number
  let behind: boolean
  if (order.side === 'sell') {
    // A buyer already pays at least the cheapest seller: sell to that buyer
    target =
      opposite !== null && opposite >= best
        ? opposite
        : Math.max(1, best - 1, opposite === null ? 1 : opposite + 1)
    behind = order.price > best
  } else {
    // A seller already asks no more than the best buyer: buy from that seller
    target = opposite !== null && opposite <= best ? opposite : best + 1
    if (opposite !== null && opposite > best) target = Math.min(target, opposite - 1)
    behind = order.price < best
  }

  // Not leading, or leading with room to spare (sell under the target, buy over it)
  const room = order.side === 'sell' ? order.price < target : order.price > target
  if ((!behind && !room) || target === order.price) return null
  return { kind: target < order.price ? 'lower' : 'raise', price: target }
}

/** Counts for the summary tiles; leading and to-adjust only look at visible sell orders. */
export function portfolioSummary(orders: readonly MyOrder[]): {
  visibleSell: number
  hiddenSell: number
  sellValue: number
  leading: number
  toAdjust: number
} {
  const sells = orders.filter((o) => o.side === 'sell')
  const visible = sells.filter((o) => o.visible)
  return {
    visibleSell: visible.length,
    hiddenSell: sells.length - visible.length,
    sellValue: visible.reduce((sum, o) => sum + o.price * o.quantity, 0),
    leading: visible.filter((o) => orderRank(o).position === 1).length,
    toAdjust: visible.filter((o) => suggestAdjustment(o) !== null).length
  }
}

export function watchStatus(rule: WatchRule, price: number): 'reached' | 'waiting' {
  assertPrice(rule.threshold, 'threshold')
  assertPrice(price, 'price')
  const reached = rule.direction === 'below' ? price <= rule.threshold : price >= rule.threshold
  return reached ? 'reached' : 'waiting'
}

/** { below, 30 } → "Alerte si ≤ 30 p" */
export function formatWatchRule(rule: WatchRule): string {
  assertPrice(rule.threshold, 'threshold')
  return `Alerte si ${rule.direction === 'below' ? '≤' : '≥'} ${formatPlatinum(rule.threshold)}`
}

export interface Advice {
  tone: 'bad' | 'medium' | 'neutral'
  title: string
  description: string
  action: { kind: 'price'; price: number; label: string } | { kind: 'show'; label: string }
}

/** What I should do about one order, or null when it is fine as it is. */
export function adviceFor(order: MyOrder): Advice | null {
  const isSell = order.side === 'sell'
  if (!order.visible) {
    return {
      tone: 'neutral',
      title: `Ordre masqué : ${order.itemName}`,
      description: isSell
        ? "Personne ne voit cet ordre : il ne peut pas se vendre tant qu'il est masqué."
        : "Personne ne voit cet ordre : aucun vendeur ne peut vous répondre tant qu'il est masqué.",
      action: { kind: 'show', label: 'Rendre visible' }
    }
  }
  const suggestion = suggestAdjustment(order)
  if (suggestion === null) return null
  const rank = orderRank(order)
  const label = `Passer à ${formatPlatinum(suggestion.price)}`

  if (rank.position > 1) {
    const ahead = rank.position - 1
    const plural = ahead > 1
    const players = isSell
      ? plural
        ? 'vendeurs en jeu sont moins chers'
        : 'vendeur en jeu est moins cher'
      : plural
        ? 'acheteurs en jeu offrent plus'
        : 'acheteur en jeu offre plus'
    return {
      tone: rankTone(rank) === 'bad' ? 'bad' : 'medium',
      title: `${order.itemName} : ${String(rank.position)}e place`,
      description: `${formatCount(ahead)} ${players}. À ${formatPlatinum(suggestion.price)}, vous passez en tête.`,
      action: { kind: 'price', price: suggestion.price, label }
    }
  }
  // Already first, but with room to ask for more (sell) or to pay less (buy)
  const gap = formatPlatinum(Math.abs(suggestion.price - order.price))
  return {
    tone: 'medium',
    title: isSell
      ? `${order.itemName} : vous laissez ${gap}`
      : `${order.itemName} : vous payez ${gap} de trop`,
    description: isSell
      ? `Vous êtes en tête avec de la marge : à ${formatPlatinum(suggestion.price)}, vous restez le moins cher.`
      : `Vous payez plus que nécessaire : à ${formatPlatinum(suggestion.price)}, vous restez le plus offrant.`,
    action: { kind: 'price', price: suggestion.price, label }
  }
}

const TONE_ORDER = { bad: 0, medium: 1, neutral: 2 } as const

/**
 * Advice for all my orders, the most urgent first (worst rank first within a tone),
 * cut to `max` items; `more` counts the advice left out.
 */
export function adviceList(
  orders: readonly MyOrder[],
  max: number
): { items: (Advice & { orderId: string; itemName: string })[]; more: number } {
  if (!Number.isInteger(max) || max < 1) {
    throw new RangeError(`Invalid advice limit: ${String(max)}`)
  }
  const all = orders
    .flatMap((order) => {
      const advice = adviceFor(order)
      return advice
        ? [
            {
              item: { ...advice, orderId: order.id, itemName: order.itemName },
              position: orderRank(order).position
            }
          ]
        : []
    })
    .sort((a, b) => TONE_ORDER[a.item.tone] - TONE_ORDER[b.item.tone] || b.position - a.position)
  return {
    items: all.slice(0, max).map((entry) => entry.item),
    more: Math.max(0, all.length - max)
  }
}

/** Sales of the period: count, platinum earned and average time to sell. */
export function salesSummary(sales: readonly CompletedSale[]): {
  count: number
  platinum: number
  averageDelay: number | null
} {
  sales.forEach((s) => {
    assertPrice(s.price, 'sale price')
    assertPrice(s.delayMinutes, 'sale delay')
  })
  return {
    count: sales.length,
    platinum: sales.reduce((sum, s) => sum + s.price * s.quantity, 0),
    averageDelay:
      sales.length === 0 ? null : sales.reduce((sum, s) => sum + s.delayMinutes, 0) / sales.length
  }
}

/** Minutes from `now` until the next time `hour` starts; 0 while that hour is running. */
export function minutesUntilHour(now: Date, hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`Invalid hour: ${String(hour)}`)
  }
  if (now.getHours() === hour) return 0
  let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour)
  if (next.getTime() <= now.getTime()) {
    // Built from the calendar date so a daylight saving change does not shift the hour
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour)
  }
  return Math.round((next.getTime() - now.getTime()) / 60_000)
}

/** Reminder shown under the advice: time left before the evening peak. */
export function peakReminder(now: Date, peakHour: number): string {
  const minutes = minutesUntilHour(now, peakHour)
  if (minutes === 0) {
    return "C'est l'heure de pointe : vos ordres visibles ont le plus de chances de partir."
  }
  return `Pic d'activité dans ${formatDuration(minutes)} : mettez vos prix à jour avant ${String(peakHour)}${NBSP}h.`
}

/** (1, "vente") → "1 vente", (12, "vente") → "12 ventes"; French singular for 0 and 1. */
export function formatCountWord(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(count)} ${count > 1 ? plural : singular}`
}
