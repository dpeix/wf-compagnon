// Pure mapping from validated warframe.market data to what the screens show (src/shared/market.ts).
import type {
  DatedPricePoint,
  ItemDetail,
  MarketItemSummary,
  MarketOrder,
  MarketOverviewData,
  SetPartsPrices
} from '../../shared/market'
import type { ApiOrder, CatalogItem, CatalogItemDetail, StatPoint } from './schemas'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const WEEK = 7 * DAY

interface ItemStats {
  hourly: readonly StatPoint[]
  daily: readonly StatPoint[]
}

/** Entries of one rank for ranked items (mods, arcanes); everything for the other items. */
export function forRank<T extends { rank: number | null }>(
  entries: readonly T[],
  rank: number | null
): T[] {
  return rank === null ? [...entries] : entries.filter((e) => e.rank === rank)
}

/** Cheapest visible sell order of a player in game. */
export function bestInGameSell(orders: readonly ApiOrder[]): number | null {
  const prices = orders
    .filter((o) => o.side === 'sell' && o.status === 'ingame' && o.visible)
    .map((o) => o.price)
  return prices.length === 0 ? null : Math.min(...prices)
}

/**
 * End of the latest finished hour sent by the API. Each hourly point is labelled by the start
 * of its hour, and the API only sends finished hours (an hour or more behind `now`, older
 * when cached): the 24-hour windows end there, not at `now`, so that they hold 24 full hours.
 */
function hoursEnd(points: readonly StatPoint[], now: Date): number {
  const starts = points.map((p) => p.date.getTime()).filter((t) => t <= now.getTime())
  return starts.length === 0 ? now.getTime() : Math.max(...starts) + HOUR
}

/** Sales and platinum of the points starting in [from, to). */
function totals(
  points: readonly StatPoint[],
  from: number,
  to: number
): { volume: number; platinum: number } {
  const inRange = points.filter((p) => p.date.getTime() >= from && p.date.getTime() < to)
  return {
    volume: inRange.reduce((sum, p) => sum + p.volume, 0),
    platinum: inRange.reduce((sum, p) => sum + p.volume * p.avg, 0)
  }
}

const changeRatio = (current: number, previous: number): number | null =>
  previous > 0 ? current / previous - 1 : null

/** Daily points (oldest first) of the last 7 days (8 points at most), up to the latest one. */
function lastWeek(daily: readonly StatPoint[]): StatPoint[] {
  const latest = daily.at(-1)
  return latest ? daily.filter((p) => p.date.getTime() >= latest.date.getTime() - WEEK) : []
}

/** `windowEnd`: end of the 24 hours counted in `sales24h` (see hoursEnd). */
export function summarizeItem(
  item: CatalogItem,
  stats: ItemStats,
  top: readonly ApiOrder[],
  windowEnd: Date
): MarketItemSummary | null {
  const rank = item.maxRank
  const history7d = lastWeek(forRank(stats.daily, rank)).map((p) => p.median)
  const first = history7d[0]
  const last = history7d.at(-1)
  const price = bestInGameSell(forRank(top, rank)) ?? last ?? null
  if (price === null) return null
  const end = windowEnd.getTime()
  return {
    slug: item.slug,
    name: item.name,
    price,
    change7d: first !== undefined && last !== undefined && first > 0 ? last / first - 1 : 0,
    sales24h: totals(forRank(stats.hourly, rank), end - DAY, end).volume,
    // The best-orders endpoint only returns 5 sellers: the real count is unknown
    sellersInGame: null,
    history7d
  }
}

/** Average sales of each local hour of the day over the 48 hours before `end`. */
export function hourlyProfile(points: readonly StatPoint[], end: Date): number[] {
  const profile = Array.from({ length: 24 }, () => 0)
  const to = end.getTime()
  for (const p of points) {
    if (p.date.getTime() < to - 2 * DAY || p.date.getTime() >= to) continue
    const hour = p.date.getHours()
    profile[hour] = (profile[hour] ?? 0) + p.volume / 2
  }
  return profile
}

export function buildOverview(
  entries: readonly { item: CatalogItem; stats: ItemStats; top: readonly ApiOrder[] }[],
  failed: readonly string[],
  now: Date,
  fetchedAt: Date
): MarketOverviewData {
  const hourly = entries.flatMap(({ item, stats }) => forRank(stats.hourly, item.maxRank))
  const end = hoursEnd(hourly, now)
  const today = totals(hourly, end - DAY, end)
  const yesterday = totals(hourly, end - 2 * DAY, end - DAY)
  const summaries = entries.map((entry) => ({
    name: entry.item.name,
    summary: summarizeItem(entry.item, entry.stats, entry.top, new Date(end))
  }))
  return {
    items: summaries.flatMap((s) => s.summary ?? []),
    hourlySales: hourlyProfile(hourly, new Date(end)),
    sales24h: today.volume,
    salesChange: changeRatio(today.volume, yesterday.volume),
    platinum24h: Math.round(today.platinum),
    platinumChange: changeRatio(today.platinum, yesterday.platinum),
    // An item without any price (no seller in game, no recent sale) cannot be listed either
    failed: [...failed, ...summaries.filter((s) => s.summary === null).map((s) => s.name)],
    fetchedAt
  }
}

/** French category shown in the breadcrumb. */
export function categoryFromTags(tags: readonly string[]): string {
  const has = (tag: string): boolean => tags.includes(tag)
  const weapon = ['weapon', 'primary', 'secondary', 'melee'].some(has)
  if (has('set') && has('warframe')) return 'Sets de Warframe'
  if (has('set') && weapon) return "Sets d'armes"
  if (has('set')) return 'Sets'
  if (has('arcane_enhancement')) return 'Arcanes'
  if (has('mod')) return 'Mods'
  if (has('relic')) return 'Reliques'
  if (has('warframe')) return 'Pièces de Warframe'
  if (weapon) return "Pièces d'armes"
  return 'Objets'
}

const TAG_LABELS: Record<string, string> = {
  set: 'Set',
  prime: 'Prime',
  warframe: 'Warframe',
  weapon: 'Arme',
  primary: 'Principale',
  secondary: 'Secondaire',
  melee: 'Mêlée',
  mod: 'Mod',
  arcane_enhancement: 'Arcane',
  relic: 'Relique',
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  legendary: 'Légendaire'
}

/** French labels of the tags the app knows; the others are left out. */
export function tagLabels(tags: readonly string[]): string[] {
  return tags.flatMap((tag) => TAG_LABELS[tag] ?? [])
}

// A single troll trade (1 p, or 3× the price) would flatten the whole chart: the min–max
// band is kept within this share of the average price. The average itself is untouched.
const BAND_LIMIT = 0.5

function toPricePoint(p: StatPoint): DatedPricePoint {
  return {
    date: p.date,
    avg: p.avg,
    min: Math.max(p.min, p.avg * (1 - BAND_LIMIT)),
    max: Math.min(p.max, p.avg * (1 + BAND_LIMIT)),
    volume: p.volume
  }
}

function toMarketOrder(o: ApiOrder): MarketOrder {
  return {
    id: o.id,
    side: o.side,
    user: o.user,
    status: o.status,
    reputation: o.reputation,
    price: o.price,
    quantity: o.quantity
  }
}

export interface PartPrice {
  name: string
  /** How many of this part the set needs */
  quantity: number
  /** Best sell price in game of one part; null without any seller in game */
  price: number | null
}

/** `parts`: the parts of the set with their price, or null when they could not be loaded. */
function setPartsPrices(
  item: CatalogItemDetail,
  parts: readonly PartPrice[] | null
): SetPartsPrices {
  // A part of a set also lists the ids of its set: only the set itself is compared
  const expected = item.setParts.filter((id) => id !== item.id).length
  if (!item.setRoot || expected === 0) return { status: 'not-a-set' }
  // A set is only worth comparing with all of its parts, each with a price
  const priced = (parts ?? []).flatMap((p) =>
    p.price === null ? [] : [{ name: p.name, quantity: p.quantity, price: p.price }]
  )
  return parts?.length === expected && priced.length === expected
    ? { status: 'ok', parts: priced }
    : { status: 'unavailable' }
}

export function buildItemDetail(
  item: CatalogItemDetail,
  orders: readonly ApiOrder[],
  stats: ItemStats,
  parts: readonly PartPrice[] | null,
  fetchedAt: Date
): ItemDetail {
  const rank = item.maxRank
  return {
    slug: item.slug,
    name: item.name,
    category: categoryFromTags(item.tags),
    ducats: item.ducats,
    rank,
    tags: tagLabels(item.tags),
    orders: forRank(orders, rank)
      .filter((o) => o.visible)
      .map(toMarketOrder),
    hourly: forRank(stats.hourly, rank).map(toPricePoint),
    daily: forRank(stats.daily, rank).map(toPricePoint),
    parts: setPartsPrices(item, parts),
    fetchedAt
  }
}
