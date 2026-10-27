import { describe, expect, it } from 'vitest'
import {
  bestInGameSell,
  buildItemDetail,
  buildOverview,
  categoryFromTags,
  forRank,
  hourlyProfile,
  summarizeItem,
  tagLabels
} from './market-data'
import type { ApiOrder, CatalogItem, StatPoint } from './schemas'

const NOW = new Date(2026, 9, 26, 21, 30)
const HOUR = 3_600_000

function stat(hoursAgo: number, overrides: Partial<StatPoint> = {}): StatPoint {
  return {
    date: new Date(NOW.getTime() - hoursAgo * HOUR),
    volume: 1,
    min: 60,
    max: 70,
    avg: 65,
    median: 64,
    rank: null,
    ...overrides
  }
}

function day(daysAgo: number, median: number, overrides: Partial<StatPoint> = {}): StatPoint {
  return stat(daysAgo * 24, { median, avg: median, min: median, max: median, ...overrides })
}

function order(overrides: Partial<ApiOrder> = {}): ApiOrder {
  return {
    id: 'o',
    side: 'sell',
    user: 'Seller',
    status: 'ingame',
    reputation: 1,
    price: 60,
    quantity: 1,
    rank: null,
    visible: true,
    ...overrides
  }
}

const ash: CatalogItem = {
  id: 'ash',
  slug: 'ash_prime_set',
  name: 'Ash Prime Set',
  tags: ['set', 'prime', 'warframe'],
  ducats: 170,
  maxRank: null
}

describe('forRank', () => {
  it('keeps everything for items without rank', () => {
    expect(forRank([{ rank: null }, { rank: 3 }], null)).toHaveLength(2)
  })

  it('keeps only the chosen rank for ranked items', () => {
    expect(forRank([{ rank: 0 }, { rank: 5 }, { rank: 5 }], 5)).toEqual([{ rank: 5 }, { rank: 5 }])
  })
})

describe('bestInGameSell', () => {
  it('is the cheapest visible sell order of a player in game', () => {
    expect(
      bestInGameSell([
        order({ price: 55, status: 'online' }),
        order({ price: 58, visible: false }),
        order({ price: 60 }),
        order({ price: 50, side: 'buy' }),
        order({ price: 62 })
      ])
    ).toBe(60)
  })

  it('is null without any seller in game', () => {
    expect(bestInGameSell([order({ status: 'offline' })])).toBeNull()
  })
})

describe('summarizeItem', () => {
  const daily = [100, 100, 101, 103, 104, 106, 108, 110].map((m, i) => day(8 - i, m))

  it('combines the best price, the 7-day trend and the sales of the last 24 hours', () => {
    const hourly = [stat(30, { volume: 9 }), stat(20, { volume: 2 }), stat(1, { volume: 3 })]
    const summary = summarizeItem(ash, { hourly, daily }, [order({ price: 112 })], NOW)
    expect(summary).toMatchObject({
      slug: 'ash_prime_set',
      name: 'Ash Prime Set',
      price: 112,
      sales24h: 5,
      sellersInGame: null,
      history7d: [100, 100, 101, 103, 104, 106, 108, 110]
    })
    expect(summary?.change7d).toBeCloseTo(0.1)
  })

  it('falls back to the latest median price without any seller in game', () => {
    const summary = summarizeItem(ash, { hourly: [], daily }, [], NOW)
    expect(summary?.price).toBe(110)
  })

  it('uses the max rank of ranked items', () => {
    const energize: CatalogItem = { ...ash, slug: 'arcane_energize', maxRank: 5, tags: [] }
    const ranked = [day(2, 10, { rank: 0 }), day(2, 120, { rank: 5 }), day(1, 130, { rank: 5 })]
    const summary = summarizeItem(energize, { hourly: [], daily: ranked }, [], NOW)
    expect(summary?.history7d).toEqual([120, 130])
  })

  it('has no summary without any price at all', () => {
    expect(summarizeItem(ash, { hourly: [], daily: [] }, [], NOW)).toBeNull()
  })

  it('keeps 7 days of history even when some days had no sale', () => {
    const sparse = [day(20, 90), day(6, 100), day(1, 110)]
    const summary = summarizeItem(ash, { hourly: [], daily: sparse }, [], NOW)
    expect(summary?.history7d).toEqual([100, 110])
    expect(summary?.change7d).toBeCloseTo(0.1)
  })
})

describe('hourlyProfile', () => {
  it('averages the sales of each local hour over the last 48 hours', () => {
    const at = (h: number, daysAgo: number, volume: number): StatPoint => ({
      ...stat(0, { volume }),
      date: new Date(2026, 9, 26 - daysAgo, h)
    })
    const profile = hourlyProfile([at(20, 0, 6), at(20, 1, 4), at(9, 1, 2), at(9, 3, 50)], NOW)
    expect(profile).toHaveLength(24)
    expect(profile[20]).toBe(5)
    // The point 3 days old is outside the 48 hours
    expect(profile[9]).toBe(1)
    expect(profile[0]).toBe(0)
  })
})

describe('buildOverview', () => {
  const FETCHED = new Date(2026, 9, 26, 21, 0)

  it('adds up the tracked items and compares with the previous 24 hours', () => {
    const hourly = [stat(30, { volume: 4, avg: 50 }), stat(2, { volume: 6, avg: 50 })]
    const daily = [day(8, 100), day(1, 110)]
    const overview = buildOverview(
      [{ item: ash, stats: { hourly, daily }, top: [order({ price: 111 })] }],
      ['Missing Item'],
      NOW,
      FETCHED
    )
    expect(overview).toMatchObject({
      sales24h: 6,
      salesChange: 0.5,
      platinum24h: 300,
      platinumChange: 0.5,
      failed: ['Missing Item'],
      fetchedAt: FETCHED
    })
    expect(overview.items.map((i) => i.slug)).toEqual(['ash_prime_set'])
    expect(overview.hourlySales).toHaveLength(24)
  })

  it('compares 24 full hours with the 24 before, ending with the latest hour of the API', () => {
    // The API labels each hour by its start and only sends finished hours: at 21:30 the
    // latest one is 20:00–21:00. 48 hours with one sale each (real hours: the summer time
    // change of 25 October must not matter).
    const hourly = Array.from({ length: 48 }, (_, i) => stat(i + 1.5))
    const overview = buildOverview(
      [{ item: ash, stats: { hourly, daily: [day(1, 100)] }, top: [] }],
      [],
      NOW,
      FETCHED
    )
    expect(overview.sales24h).toBe(24)
    expect(overview.salesChange).toBe(0)
    expect(overview.hourlySales.reduce((sum, v) => sum + v, 0)).toBe(24)
  })

  it('ignores hours in the future', () => {
    const hourly = [stat(2, { volume: 3 }), stat(-2, { volume: 100 })]
    const overview = buildOverview(
      [{ item: ash, stats: { hourly, daily: [day(1, 100)] }, top: [] }],
      [],
      NOW,
      FETCHED
    )
    expect(overview.sales24h).toBe(3)
  })

  it('lists a tracked item without any price with the failed ones', () => {
    const unpriced: CatalogItem = { ...ash, slug: 'rare_thing', name: 'Rare Thing' }
    const overview = buildOverview(
      [
        { item: ash, stats: { hourly: [], daily: [day(1, 100)] }, top: [] },
        { item: unpriced, stats: { hourly: [], daily: [] }, top: [] }
      ],
      ['Gone'],
      NOW,
      FETCHED
    )
    expect(overview.items.map((i) => i.slug)).toEqual(['ash_prime_set'])
    expect(overview.failed).toEqual(['Gone', 'Rare Thing'])
  })

  it('has no change to show without sales the day before', () => {
    const overview = buildOverview(
      [{ item: ash, stats: { hourly: [stat(2)], daily: [day(1, 100)] }, top: [] }],
      [],
      NOW,
      FETCHED
    )
    expect(overview.salesChange).toBeNull()
  })
})

describe('categoryFromTags and tagLabels', () => {
  it('names the category of an item', () => {
    expect(categoryFromTags(['set', 'prime', 'warframe'])).toBe('Sets de Warframe')
    expect(categoryFromTags(['set', 'prime', 'primary', 'weapon'])).toBe("Sets d'armes")
    expect(categoryFromTags(['legendary', 'arcane_enhancement'])).toBe('Arcanes')
    expect(categoryFromTags(['mod', 'rare'])).toBe('Mods')
    expect(categoryFromTags(['something_new'])).toBe('Objets')
  })

  it('translates the tags it knows and drops the others', () => {
    expect(tagLabels(['set', 'prime', 'warframe', 'blueprint_v2'])).toEqual([
      'Set',
      'Prime',
      'Warframe'
    ])
  })
})

describe('buildItemDetail', () => {
  const detail = { ...ash, setRoot: true, setParts: ['ash', 'bp'] }

  it('keeps visible orders of the chosen rank and converts the history', () => {
    const result = buildItemDetail(
      detail,
      [order({ id: 'a' }), order({ id: 'b', visible: false })],
      { hourly: [stat(1)], daily: [day(1, 64)] },
      [{ name: 'Ash Prime Blueprint', quantity: 1, price: 20 }],
      NOW
    )
    expect(result).toMatchObject({
      slug: 'ash_prime_set',
      name: 'Ash Prime Set',
      category: 'Sets de Warframe',
      ducats: 170,
      rank: null,
      tags: ['Set', 'Prime', 'Warframe'],
      parts: { status: 'ok', parts: [{ name: 'Ash Prime Blueprint', quantity: 1, price: 20 }] },
      fetchedAt: NOW
    })
    expect(result.orders.map((o) => o.id)).toEqual(['a'])
    expect(result.hourly[0]).toEqual({
      date: new Date(NOW.getTime() - HOUR),
      avg: 65,
      min: 60,
      max: 70,
      volume: 1
    })
  })

  it('clips the min–max band to ±50 % of the average price (outlier trades)', () => {
    const result = buildItemDetail(
      detail,
      [],
      { hourly: [], daily: [day(1, 70, { min: 1, max: 150, avg: 70 })] },
      [],
      NOW
    )
    expect(result.daily[0]).toMatchObject({ avg: 70, min: 35, max: 105 })
  })

  it('keeps a band that is already within ±50 %', () => {
    const result = buildItemDetail(
      detail,
      [],
      { hourly: [stat(1, { min: 60, max: 70, avg: 65 })], daily: [] },
      [],
      NOW
    )
    expect(result.hourly[0]).toMatchObject({ min: 60, max: 70 })
  })

  const kamas = { ...ash, id: 'set', setRoot: true, setParts: ['set', 'blade', 'handle', 'bp'] }

  it('keeps how many of each part the set needs', () => {
    const result = buildItemDetail(
      kamas,
      [],
      { hourly: [], daily: [] },
      [
        { name: 'Blade', quantity: 2, price: 15 },
        { name: 'Handle', quantity: 2, price: 5 },
        { name: 'Blueprint', quantity: 1, price: 10 }
      ],
      NOW
    )
    expect(result.parts).toEqual({
      status: 'ok',
      parts: [
        { name: 'Blade', quantity: 2, price: 15 },
        { name: 'Handle', quantity: 2, price: 5 },
        { name: 'Blueprint', quantity: 1, price: 10 }
      ]
    })
  })

  it('says the parts are unavailable when one of them has no price', () => {
    const result = buildItemDetail(
      kamas,
      [],
      { hourly: [], daily: [] },
      [
        { name: 'Blade', quantity: 2, price: 15 },
        { name: 'Handle', quantity: 2, price: null },
        { name: 'Blueprint', quantity: 1, price: 10 }
      ],
      NOW
    )
    expect(result.parts).toEqual({ status: 'unavailable' })
  })

  it('says the parts are unavailable when one of them is missing', () => {
    const result = buildItemDetail(
      kamas,
      [],
      { hourly: [], daily: [] },
      [
        { name: 'Blade', quantity: 2, price: 15 },
        { name: 'Blueprint', quantity: 1, price: 10 }
      ],
      NOW
    )
    expect(result.parts).toEqual({ status: 'unavailable' })
  })

  it('says the parts are unavailable when they could not be loaded', () => {
    const result = buildItemDetail(detail, [], { hourly: [], daily: [] }, null, NOW)
    expect(result.parts).toEqual({ status: 'unavailable' })
  })

  it('has no parts to compare on the screen of a part of a set', () => {
    const blade = { ...kamas, id: 'blade', setRoot: false }
    const result = buildItemDetail(blade, [], { hourly: [], daily: [] }, [], NOW)
    expect(result.parts).toEqual({ status: 'not-a-set' })
  })

  it('has no parts to compare for an item that is not a set', () => {
    const energize = { ...ash, slug: 'arcane_energize', setRoot: false, setParts: [] }
    const result = buildItemDetail(energize, [], { hourly: [], daily: [] }, [], NOW)
    expect(result.parts).toEqual({ status: 'not-a-set' })
  })
})
