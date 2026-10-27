import { describe, expect, it, vi } from 'vitest'
import type { Fetched, MarketClient } from './client'
import type { ApiOrder, CatalogItem, StatPoint } from './schemas'
import { createMarketService } from './service'

const NOW = new Date(2026, 9, 26, 21, 30)
// Answers come from the cache with their own date; the statistics are the oldest
const ORDERS_AT = new Date(2026, 9, 26, 21, 28)
const STATS_AT = new Date(2026, 9, 26, 21, 5)

function item(slug: string, id = slug, extra: Partial<CatalogItem> = {}): CatalogItem {
  return { id, slug, name: slug, tags: [], ducats: null, maxRank: null, ...extra }
}

const dailyPoint: StatPoint = {
  date: new Date(2026, 9, 25),
  volume: 3,
  min: 50,
  max: 60,
  avg: 55,
  median: 55,
  rank: null
}

function sell(price: number): ApiOrder {
  return {
    id: `s${String(price)}`,
    side: 'sell',
    user: 'Seller',
    status: 'ingame',
    reputation: 1,
    price,
    quantity: 1,
    rank: null,
    visible: true
  }
}

function at<T>(data: T, fetchedAt: Date): Promise<Fetched<T>> {
  return Promise.resolve({ data, fetchedAt })
}

/** Fake client: answers for the slugs it knows, fails for `broken`, has no daily point for `unsold`. */
function fakeClient(
  catalog: CatalogItem[],
  { broken = [], unsold = [] }: { broken?: string[]; unsold?: string[] } = {}
): MarketClient & { topCalls: string[]; freshCalls: boolean[] } {
  const topCalls: string[] = []
  const freshCalls: boolean[] = []
  const fail = (slug: string): Promise<never> => Promise.reject(new Error(`down: ${slug}`))
  return {
    topCalls,
    freshCalls,
    catalog: () => at(catalog, NOW),
    item: (slug) => {
      const found = catalog.find((i) => i.slug === slug)
      if (!found || broken.includes(slug)) return fail(slug)
      // Like the real API, the parts of a set also list the ids of the set
      const inSet = ['set', 'part_a', 'part_b'].includes(slug)
      return at(
        { ...found, setRoot: slug === 'set', setParts: inSet ? ['set', 'part_a', 'part_b'] : [] },
        NOW
      )
    },
    // The set needs 1 part_a and 2 part_b
    itemSet: () =>
      at(
        catalog
          .filter((i) => ['set', 'part_a', 'part_b'].includes(i.slug))
          .map((i) => ({
            ...i,
            setRoot: i.slug === 'set',
            quantityInSet: i.slug === 'part_b' ? 2 : 1
          })),
        NOW
      ),
    orders: (slug, options) => {
      freshCalls.push(options?.fresh ?? false)
      return broken.includes(slug) ? fail(slug) : at([sell(60)], ORDERS_AT)
    },
    topOrders: (slug, _rank, options) => {
      topCalls.push(slug)
      freshCalls.push(options?.fresh ?? false)
      if (broken.includes(slug)) return fail(slug)
      if (unsold.includes(slug)) return at([], ORDERS_AT)
      return at([sell(slug === 'part_a' ? 20 : 30)], ORDERS_AT)
    },
    statistics: (slug, options) => {
      freshCalls.push(options?.fresh ?? false)
      if (broken.includes(slug)) return fail(slug)
      return at({ hourly: [], daily: unsold.includes(slug) ? [] : [dailyPoint] }, STATS_AT)
    }
  }
}

function quietly<T>(run: () => Promise<T>): Promise<T> {
  // Failed items are logged on purpose: keep the test output clean
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  return run().finally(() => {
    warn.mockRestore()
  })
}

describe('getOverview', () => {
  it('summarizes the tracked items and names those that failed, do not exist or have no price', async () => {
    const catalog = [item('a'), item('b', 'b', { name: 'Item B' }), item('c', 'c', { name: 'C' })]
    const client = fakeClient(catalog, { broken: ['b'], unsold: ['c'] })
    const service = createMarketService({
      client,
      trackedSlugs: ['a', 'b', 'gone', 'c'],
      now: () => NOW
    })
    const overview = await quietly(() => service.getOverview(false))
    expect(overview.items.map((i) => i.slug)).toEqual(['a'])
    expect(overview.failed).toEqual(['Item B', 'gone', 'C'])
  })

  it('dates the overview with its oldest data and passes the refresh on', async () => {
    const client = fakeClient([item('a')])
    const service = createMarketService({ client, trackedSlugs: ['a'], now: () => NOW })
    const overview = await service.getOverview(true)
    expect(overview.fetchedAt).toEqual(STATS_AT)
    expect(client.freshCalls).toEqual([true, true])
  })

  it('fails when no tracked item could be loaded', async () => {
    const client = fakeClient([item('a')], { broken: ['a'] })
    const service = createMarketService({ client, trackedSlugs: ['a'], now: () => NOW })
    await expect(quietly(() => service.getOverview(false))).rejects.toThrow(/Aucun objet suivi/)
  })
})

describe('getItemDetail', () => {
  const catalog = [
    item('set', 'set', { name: 'Ash Prime Set', tags: ['set', 'warframe'] }),
    item('part_a', 'part_a', { name: 'Part A' }),
    item('part_b', 'part_b', { name: 'Part B' })
  ]

  it('loads the item, its orders, its history and the best price of each part', async () => {
    const client = fakeClient(catalog)
    const service = createMarketService({ client, trackedSlugs: [], now: () => NOW })
    const detail = await service.getItemDetail('set', false)
    expect(detail).toMatchObject({
      slug: 'set',
      name: 'Ash Prime Set',
      category: 'Sets de Warframe',
      fetchedAt: STATS_AT
    })
    expect(detail.orders).toHaveLength(1)
    expect(detail.daily).toHaveLength(1)
    expect(detail.parts).toEqual({
      status: 'ok',
      parts: [
        { name: 'Part A', quantity: 1, price: 20 },
        { name: 'Part B', quantity: 2, price: 30 }
      ]
    })
    // The set itself is not one of its parts
    expect(client.topCalls).toEqual(['part_a', 'part_b'])
    expect(client.freshCalls.every((fresh) => !fresh)).toBe(true)
  })

  it('passes the refresh on to the orders, the history and the parts', async () => {
    const client = fakeClient(catalog)
    const service = createMarketService({ client, trackedSlugs: [], now: () => NOW })
    await service.getItemDetail('set', true)
    expect(client.freshCalls).toEqual([true, true, true, true])
  })

  it('does not ask for parts on the screen of a part of a set', async () => {
    const client = fakeClient(catalog)
    const service = createMarketService({ client, trackedSlugs: [], now: () => NOW })
    await expect(service.getItemDetail('part_a', false)).resolves.toMatchObject({
      parts: { status: 'not-a-set' }
    })
    expect(client.topCalls).toEqual([])
  })

  it('still shows the item when a part cannot be loaded, saying the parts are unavailable', async () => {
    const client = fakeClient(catalog, { broken: ['part_b'] })
    const service = createMarketService({ client, trackedSlugs: [], now: () => NOW })
    await expect(quietly(() => service.getItemDetail('set', false))).resolves.toMatchObject({
      parts: { status: 'unavailable' }
    })
  })

  it('says the parts are unavailable when one of them has no seller in game', async () => {
    const client = fakeClient(catalog, { unsold: ['part_a'] })
    const service = createMarketService({ client, trackedSlugs: [], now: () => NOW })
    await expect(service.getItemDetail('set', false)).resolves.toMatchObject({
      parts: { status: 'unavailable' }
    })
  })

  it('fails when the item itself cannot be loaded', async () => {
    const client = fakeClient(catalog, { broken: ['set'] })
    const service = createMarketService({ client, trackedSlugs: [], now: () => NOW })
    await expect(service.getItemDetail('set', false)).rejects.toThrow('down: set')
  })
})
