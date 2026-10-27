// Validation of warframe.market responses: everything coming from the API goes through here
// before use (CLAUDE.md). Unknown extra fields are ignored; missing or wrong ones are errors.
import { z } from 'zod'

export class MarketDataError extends Error {
  override name = 'MarketDataError'
}

function parse<T>(schema: z.ZodType<T>, json: unknown, what: string): T {
  const result = schema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue ? issue.path.join('.') : ''
    throw new MarketDataError(
      `Unexpected warframe.market answer for ${what}${where ? ` at ${where}` : ''}: ${issue?.message ?? 'invalid'}`
    )
  }
  return result.data
}

/**
 * Valid entries of a list. One odd entry among thousands (items, orders) must not take
 * the whole screen down: invalid entries are left out and counted in a warning. The list
 * is rejected when none of its entries is valid.
 */
function parseEntries<T>(schema: z.ZodType<T>, entries: readonly unknown[], what: string): T[] {
  const valid: T[] = []
  let firstIssue: { index: number; issue: z.core.$ZodIssue | undefined } | null = null
  for (const [index, entry] of entries.entries()) {
    const result = schema.safeParse(entry)
    if (result.success) valid.push(result.data)
    else firstIssue ??= { index, issue: result.error.issues[0] }
  }
  if (firstIssue === null) return valid

  const { index, issue } = firstIssue
  const where = [index, ...(issue?.path ?? [])].map(String).join('.')
  const detail = `${String(entries.length - valid.length)} invalid entries, first at ${where}: ${issue?.message ?? 'invalid'}`
  if (valid.length === 0) {
    throw new MarketDataError(`Unexpected warframe.market answer for ${what}: ${detail}`)
  }
  console.warn(`warframe.market: left out of ${what}: ${detail}`)
  return valid
}

const list = z.array(z.unknown())

// zod 4 numbers are finite: NaN and Infinity are rejected
const price = z.number().nonnegative()
const count = z.number().int().nonnegative()

const catalogEntry = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  tags: z.array(z.string()).default([]),
  ducats: count.optional(),
  maxRank: count.optional(),
  i18n: z.object({ en: z.object({ name: z.string().min(1) }) })
})

export interface CatalogItem {
  id: string
  slug: string
  name: string
  tags: string[]
  ducats: number | null
  maxRank: number | null
}

function toCatalogItem(entry: z.infer<typeof catalogEntry>): CatalogItem {
  return {
    id: entry.id,
    slug: entry.slug,
    name: entry.i18n.en.name,
    tags: entry.tags,
    ducats: entry.ducats ?? null,
    maxRank: entry.maxRank ?? null
  }
}

/** GET /v2/items */
export function parseCatalog(json: unknown): CatalogItem[] {
  const { data } = parse(z.object({ data: list }), json, 'the item list')
  return parseEntries(catalogEntry, data, 'the item list').map(toCatalogItem)
}

export interface CatalogItemDetail extends CatalogItem {
  /** The item is a set (its parts also list the ids of the set in `setParts`) */
  setRoot: boolean
  /** Ids of the items of the set (the set itself included); empty for other items */
  setParts: string[]
}

/** GET /v2/item/{slug} */
export function parseItem(json: unknown): CatalogItemDetail {
  const schema = z.object({
    data: catalogEntry.extend({
      setRoot: z.boolean().default(false),
      setParts: z.array(z.string()).default([])
    })
  })
  const { data } = parse(schema, json, 'an item')
  return { ...toCatalogItem(data), setRoot: data.setRoot, setParts: data.setParts }
}

export interface SetItem extends CatalogItem {
  /** The set itself, as opposed to one of its parts */
  setRoot: boolean
  /** How many of this part a set needs (2 blades for Dual Kamas Prime) */
  quantityInSet: number
}

/**
 * GET /v2/item/{slug}/set: the set and its parts (the item alone when it is not a set).
 * Validated as a whole: a set compared without one of its parts would show a wrong total.
 */
export function parseItemSet(json: unknown): SetItem[] {
  const entry = catalogEntry.extend({
    setRoot: z.boolean().default(false),
    quantityInSet: count.min(1).default(1)
  })
  const { data } = parse(z.object({ data: z.object({ items: z.array(entry) }) }), json, 'a set')
  return data.items.map((item) => ({
    ...toCatalogItem(item),
    setRoot: item.setRoot,
    quantityInSet: item.quantityInSet
  }))
}

const orderEntry = z.object({
  id: z.string().min(1),
  type: z.enum(['sell', 'buy']),
  platinum: price,
  quantity: count,
  rank: count.optional(),
  visible: z.boolean().default(true),
  user: z.object({
    ingameName: z.string().min(1),
    reputation: z.number().int().default(0),
    // warframe.market may add statuses: anything else counts as not reachable
    status: z.enum(['ingame', 'online', 'offline']).catch('offline')
  })
})

export interface ApiOrder {
  id: string
  side: 'sell' | 'buy'
  user: string
  status: 'ingame' | 'online' | 'offline'
  reputation: number
  price: number
  quantity: number
  rank: number | null
  visible: boolean
}

function toApiOrder(entry: z.infer<typeof orderEntry>): ApiOrder {
  return {
    id: entry.id,
    side: entry.type,
    user: entry.user.ingameName,
    status: entry.user.status,
    reputation: entry.user.reputation,
    price: entry.platinum,
    quantity: entry.quantity,
    rank: entry.rank ?? null,
    visible: entry.visible
  }
}

/** GET /v2/orders/item/{slug} */
export function parseOrders(json: unknown): ApiOrder[] {
  const { data } = parse(z.object({ data: list }), json, 'the orders')
  return parseEntries(orderEntry, data, 'the orders').map(toApiOrder)
}

/** GET /v2/orders/item/{slug}/top: best sell then best buy orders */
export function parseTopOrders(json: unknown): ApiOrder[] {
  const schema = z.object({ data: z.object({ sell: list, buy: list }) })
  const { data } = parse(schema, json, 'the best orders')
  return [
    ...parseEntries(orderEntry, data.sell, 'the best sell orders'),
    ...parseEntries(orderEntry, data.buy, 'the best buy orders')
  ].map(toApiOrder)
}

const statEntry = z.object({
  datetime: z.iso.datetime({ offset: true }),
  volume: count,
  min_price: price,
  max_price: price,
  avg_price: price,
  median: price,
  mod_rank: count.optional()
})

export interface StatPoint {
  date: Date
  volume: number
  min: number
  max: number
  avg: number
  median: number
  rank: number | null
}

function toStatPoint(entry: z.infer<typeof statEntry>): StatPoint {
  // The API rounds min and max separately: widen them so the chart band always holds the line
  return {
    date: new Date(entry.datetime),
    volume: entry.volume,
    min: Math.min(entry.min_price, entry.max_price, entry.avg_price, entry.median),
    max: Math.max(entry.min_price, entry.max_price, entry.avg_price, entry.median),
    avg: entry.avg_price,
    median: entry.median,
    rank: entry.mod_rank ?? null
  }
}

/** GET /v1/items/{slug}/statistics (closed sales; not available in API v2) */
export function parseStatistics(json: unknown): { hourly: StatPoint[]; daily: StatPoint[] } {
  const schema = z.object({
    payload: z.object({ statistics_closed: z.object({ '48hours': list, '90days': list }) })
  })
  const closed = parse(schema, json, 'the statistics').payload.statistics_closed
  // Oldest first: the screens take the latest point at the end of the list
  const byDate = (a: StatPoint, b: StatPoint): number => a.date.getTime() - b.date.getTime()
  return {
    hourly: parseEntries(statEntry, closed['48hours'], 'the hourly statistics')
      .map(toStatPoint)
      .sort(byDate),
    daily: parseEntries(statEntry, closed['90days'], 'the daily statistics')
      .map(toStatPoint)
      .sort(byDate)
  }
}
