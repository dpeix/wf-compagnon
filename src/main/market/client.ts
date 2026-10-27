// HTTP client for warframe.market: one fixed host, a rate-limited queue, a cache per endpoint,
// retries for transient failures, and validation of every answer (schemas.ts).
import { ITEM_SLUG_PATTERN } from '../../shared/market'
import { createCache, type Cache } from './cache'
import { createRateLimiter } from './rate-limiter'
import {
  parseCatalog,
  parseItem,
  parseItemSet,
  parseOrders,
  parseStatistics,
  parseTopOrders,
  MarketDataError,
  type ApiOrder,
  type CatalogItem,
  type CatalogItemDetail,
  type SetItem,
  type StatPoint
} from './schemas'

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal?: AbortSignal }
) => Promise<Response>

export class MarketApiError extends Error {
  override name = 'MarketApiError'
  constructor(
    message: string,
    /** HTTP status, or null when the server could not be reached */
    readonly status: number | null,
    readonly url: string
  ) {
    super(message)
  }
}

/** An answer of the API and when it was received (cached answers keep their first date). */
export interface Fetched<T> {
  data: T
  fetchedAt: Date
}

interface ReadOptions {
  /** Skip the cache (the "Actualiser" button); the request still waits in the queue */
  fresh?: boolean
}

interface ItemStatistics {
  hourly: StatPoint[]
  daily: StatPoint[]
}

export interface MarketClient {
  catalog: () => Promise<Fetched<CatalogItem[]>>
  item: (slug: string) => Promise<Fetched<CatalogItemDetail>>
  /** The set and its parts with their quantity (the item alone when it is not a set) */
  itemSet: (slug: string) => Promise<Fetched<SetItem[]>>
  /** Every order of an item, all players and ranks */
  orders: (slug: string, options?: ReadOptions) => Promise<Fetched<ApiOrder[]>>
  /** Best 5 sell and 5 buy orders of players online, for one rank of ranked items */
  topOrders: (
    slug: string,
    rank: number | null,
    options?: ReadOptions
  ) => Promise<Fetched<ApiOrder[]>>
  statistics: (slug: string, options?: ReadOptions) => Promise<Fetched<ItemStatistics>>
}

interface ClientOptions {
  fetch: FetchLike
  now: () => number
  sleep: (ms: number) => Promise<void>
}

const API = 'https://api.warframe.market'
const HEADERS = {
  'User-Agent': 'wf-compagnon/1.0 (+https://github.com/dpeix/wf-compagnon)',
  Accept: 'application/json',
  Platform: 'pc',
  Language: 'en'
}

// warframe.market allows about 3 requests per second
const MIN_INTERVAL_MS = 350
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
const TIMEOUT_MS = 20_000
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

const MINUTE = 60_000
const TTL = {
  catalog: 24 * 60 * MINUTE,
  item: 24 * 60 * MINUTE,
  statistics: 60 * MINUTE,
  orders: 2 * MINUTE
}

function assertSlug(slug: string): void {
  if (!ITEM_SLUG_PATTERN.test(slug)) {
    throw new RangeError(`Invalid item slug: ${JSON.stringify(slug)}`)
  }
}

export function createMarketClient({ fetch, now, sleep }: ClientOptions): MarketClient {
  const limiter = createRateLimiter({ minIntervalMs: MIN_INTERVAL_MS, now, sleep })
  const caches = {
    catalog: createCache<CatalogItem[]>(now),
    item: createCache<CatalogItemDetail>(now),
    itemSet: createCache<SetItem[]>(now),
    orders: createCache<ApiOrder[]>(now),
    statistics: createCache<ItemStatistics>(now)
  }

  // GET with retries; every attempt waits for its turn in the rate-limited queue
  async function getJson(url: string): Promise<unknown> {
    for (let attempt = 1; ; attempt++) {
      let response: Response | null = null
      let failure: unknown = null
      try {
        response = await limiter.schedule(() =>
          fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) })
        )
      } catch (error) {
        failure = error
      }

      if (response?.ok) {
        try {
          return await response.json()
        } catch (cause) {
          throw new MarketDataError(`warframe.market sent an answer that is not JSON for ${url}`, {
            cause
          })
        }
      }
      const status = response?.status ?? null
      const retryable = status === null || RETRYABLE_STATUS.has(status)
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        const reason =
          status === null
            ? `unreachable (${failure instanceof Error ? failure.message : String(failure)})`
            : `HTTP ${String(status)}`
        throw new MarketApiError(`warframe.market ${reason} for ${url}`, status, url)
      }
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }

  async function read<T>(
    cache: Cache<T>,
    url: string,
    ttlMs: number,
    parse: (json: unknown) => T
  ): Promise<Fetched<T>> {
    const { value, storedAt } = await cache.get(url, ttlMs, async () => parse(await getJson(url)))
    return { data: value, fetchedAt: new Date(storedAt) }
  }

  const ttl = (lifetime: number, options: ReadOptions | undefined): number =>
    options?.fresh ? 0 : lifetime

  return {
    catalog: () => read(caches.catalog, `${API}/v2/items`, TTL.catalog, parseCatalog),

    item: async (slug) => {
      assertSlug(slug)
      return read(caches.item, `${API}/v2/item/${slug}`, TTL.item, parseItem)
    },

    itemSet: async (slug) => {
      assertSlug(slug)
      return read(caches.itemSet, `${API}/v2/item/${slug}/set`, TTL.item, parseItemSet)
    },

    orders: async (slug, options) => {
      assertSlug(slug)
      const url = `${API}/v2/orders/item/${slug}`
      return read(caches.orders, url, ttl(TTL.orders, options), parseOrders)
    },

    topOrders: async (slug, rank, options) => {
      assertSlug(slug)
      if (rank !== null && (!Number.isInteger(rank) || rank < 0)) {
        throw new RangeError(`Invalid rank: ${String(rank)}`)
      }
      const url = `${API}/v2/orders/item/${slug}/top${rank === null ? '' : `?rank=${String(rank)}`}`
      return read(caches.orders, url, ttl(TTL.orders, options), parseTopOrders)
    },

    statistics: async (slug, options) => {
      assertSlug(slug)
      // Price history only exists in API v1
      const url = `${API}/v1/items/${slug}/statistics`
      return read(caches.statistics, url, ttl(TTL.statistics, options), parseStatistics)
    }
  }
}
