import { describe, expect, it, vi } from 'vitest'
import {
  MarketDataError,
  parseCatalog,
  parseItem,
  parseItemSet,
  parseOrders,
  parseStatistics,
  parseTopOrders
} from './schemas'

// Trimmed copies of real warframe.market responses (October 2026)
const ashInList = {
  id: '56783f24cbfa8f0432dd898f',
  slug: 'ash_prime_set',
  gameRef: '/Lotus/Powersuits/Ninja/AshPrime',
  tags: ['set', 'prime', 'warframe'],
  ducats: 170,
  i18n: { en: { name: 'Ash Prime Set', icon: 'items/a.png', thumb: 'items/t.png' } }
}
const energizeInList = {
  id: '566751295dcbc186f0536bd1',
  slug: 'arcane_energize',
  tags: ['legendary', 'arcane_enhancement'],
  maxRank: 5,
  i18n: { en: { name: 'Arcane Energize' } }
}

function order(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '6adf778c9703a8846cd291ce',
    type: 'sell',
    platinum: 60,
    quantity: 1,
    perTrade: 1,
    visible: true,
    itemId: '56783f24cbfa8f0432dd898f',
    user: { ingameName: 'Kaze_Tenno', reputation: 12, status: 'ingame', platform: 'pc' },
    ...overrides
  }
}

function stat(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    datetime: '2026-10-25T21:00:00+02:00',
    volume: 4,
    min_price: 62,
    max_price: 65,
    avg_price: 63.5,
    median: 63,
    moving_avg: 63.4,
    id: 'x',
    ...overrides
  }
}

describe('parseCatalog', () => {
  it('keeps what the app needs from the item list', () => {
    expect(
      parseCatalog({ apiVersion: '0.25.0', data: [ashInList, energizeInList], error: null })
    ).toEqual([
      {
        id: '56783f24cbfa8f0432dd898f',
        slug: 'ash_prime_set',
        name: 'Ash Prime Set',
        tags: ['set', 'prime', 'warframe'],
        ducats: 170,
        maxRank: null
      },
      {
        id: '566751295dcbc186f0536bd1',
        slug: 'arcane_energize',
        name: 'Arcane Energize',
        tags: ['legendary', 'arcane_enhancement'],
        ducats: null,
        maxRank: 5
      }
    ])
  })

  it('rejects a list whose only item has no English name', () => {
    expect(() => parseCatalog({ data: [{ ...ashInList, i18n: {} }] })).toThrow(MarketDataError)
  })

  it('leaves out an invalid item among valid ones, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const items = parseCatalog({ data: [ashInList, { slug: 'broken' }, energizeInList] })
      expect(items.map((i) => i.slug)).toEqual(['ash_prime_set', 'arcane_energize'])
      expect(warn).toHaveBeenCalledOnce()
      expect(String(warn.mock.calls[0]?.[0])).toMatch(/1 invalid entries, first at 1\./)
    } finally {
      warn.mockRestore()
    }
  })

  it('accepts an empty list', () => {
    expect(parseCatalog({ data: [] })).toEqual([])
  })

  it('rejects a response that is not an item list', () => {
    expect(() => parseCatalog({ error: 'maintenance' })).toThrow(MarketDataError)
    expect(() => parseCatalog('<html>')).toThrow(MarketDataError)
  })
})

describe('parseItem', () => {
  it('adds the parts of a set', () => {
    const item = parseItem({ data: { ...ashInList, setRoot: true, setParts: ['a', 'b'] } })
    expect(item).toMatchObject({ slug: 'ash_prime_set', setRoot: true, setParts: ['a', 'b'] })
  })

  it('has no parts for an item that is not a set', () => {
    expect(parseItem({ data: energizeInList })).toMatchObject({ setRoot: false, setParts: [] })
  })

  it('tells a part of a set from the set (both list the ids of the set)', () => {
    const blade = { ...ashInList, slug: 'ash_prime_blueprint', setRoot: false, setParts: ['a'] }
    expect(parseItem({ data: blade })).toMatchObject({ setRoot: false, setParts: ['a'] })
  })
})

describe('parseItemSet', () => {
  const blade = {
    id: '561536deb66f836f8bbaca47',
    slug: 'dual_kamas_prime_blade',
    tags: ['component', 'prime', 'weapon'],
    setRoot: false,
    quantityInSet: 2,
    ducats: 15,
    i18n: { en: { name: 'Dual Kamas Prime Blade' } }
  }
  const set = {
    id: '56783f24cbfa8f0432dd8999',
    slug: 'dual_kamas_prime_set',
    tags: ['weapon', 'prime', 'set', 'melee'],
    setRoot: true,
    setParts: ['56783f24cbfa8f0432dd8999', '561536deb66f836f8bbaca47'],
    i18n: { en: { name: 'Dual Kamas Prime Set' } }
  }

  it('reads the set and its parts with the quantity of each part', () => {
    const items = parseItemSet({ data: { id: set.id, items: [set, blade] } })
    expect(items.map((i) => [i.slug, i.setRoot, i.quantityInSet])).toEqual([
      ['dual_kamas_prime_set', true, 1],
      ['dual_kamas_prime_blade', false, 2]
    ])
  })

  it('rejects the whole set when one part is invalid', () => {
    expect(() =>
      parseItemSet({ data: { id: set.id, items: [set, { ...blade, quantityInSet: 0 }] } })
    ).toThrow(MarketDataError)
  })
})

describe('parseOrders', () => {
  it('maps orders to the app format', () => {
    expect(parseOrders({ data: [order({ rank: 5 })] })).toEqual([
      {
        id: '6adf778c9703a8846cd291ce',
        side: 'sell',
        user: 'Kaze_Tenno',
        status: 'ingame',
        reputation: 12,
        price: 60,
        quantity: 1,
        rank: 5,
        visible: true
      }
    ])
  })

  it('treats an unknown player status as offline', () => {
    const [parsed] = parseOrders({
      data: [order({ user: { ingameName: 'X', reputation: 0, status: 'invisible' } })]
    })
    expect(parsed?.status).toBe('offline')
  })

  it('rejects a negative price or an unknown order type', () => {
    expect(() => parseOrders({ data: [order({ platinum: -5 })] })).toThrow(MarketDataError)
    expect(() => parseOrders({ data: [order({ type: 'trade' })] })).toThrow(MarketDataError)
  })

  it('keeps the valid orders when one of them is invalid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const parsed = parseOrders({ data: [order({ platinum: -5 }), order({ id: 'ok' })] })
      expect(parsed.map((o) => o.id)).toEqual(['ok'])
      expect(warn).toHaveBeenCalledOnce()
    } finally {
      warn.mockRestore()
    }
  })
})

describe('parseTopOrders', () => {
  it('joins the best sell and buy orders', () => {
    const parsed = parseTopOrders({
      data: { sell: [order()], buy: [order({ id: 'b1', type: 'buy', platinum: 50 })] }
    })
    expect(parsed.map((o) => `${o.side}:${String(o.price)}`)).toEqual(['sell:60', 'buy:50'])
  })
})

describe('parseStatistics', () => {
  it('reads the hourly and daily closed statistics', () => {
    const parsed = parseStatistics({
      payload: {
        statistics_closed: {
          '48hours': [stat()],
          '90days': [stat({ datetime: '2026-10-25T02:00:00+02:00' })]
        },
        statistics_live: {}
      }
    })
    expect(parsed.hourly).toEqual([
      {
        date: new Date('2026-10-25T21:00:00+02:00'),
        volume: 4,
        min: 62,
        max: 65,
        avg: 63.5,
        median: 63,
        rank: null
      }
    ])
    expect(parsed.daily).toHaveLength(1)
  })

  it('sorts the points oldest first', () => {
    const parsed = parseStatistics({
      payload: {
        statistics_closed: {
          '48hours': [],
          '90days': [
            stat({ datetime: '2026-10-25T00:00:00+00:00' }),
            stat({ datetime: '2026-10-23T00:00:00+00:00' })
          ]
        }
      }
    })
    expect(parsed.daily.map((p) => p.date.toISOString().slice(0, 10))).toEqual([
      '2026-10-23',
      '2026-10-25'
    ])
  })

  it('keeps the rank of ranked items', () => {
    const parsed = parseStatistics({
      payload: { statistics_closed: { '48hours': [stat({ mod_rank: 5 })], '90days': [] } }
    })
    expect(parsed.hourly[0]?.rank).toBe(5)
  })

  it('widens min and max so they always surround the average and the median', () => {
    const parsed = parseStatistics({
      payload: {
        statistics_closed: {
          '48hours': [stat({ min_price: 64, max_price: 63, avg_price: 63.5, median: 66 })],
          '90days': []
        }
      }
    })
    // min_price and max_price are swapped here: the band goes from the lowest to the highest value
    expect(parsed.hourly[0]).toMatchObject({ min: 63, max: 66 })
  })

  it('rejects an invalid date or a negative volume', () => {
    const wrap = (s: Record<string, unknown>): unknown => ({
      payload: { statistics_closed: { '48hours': [s], '90days': [] } }
    })
    expect(() => parseStatistics(wrap(stat({ datetime: 'yesterday' })))).toThrow(MarketDataError)
    expect(() => parseStatistics(wrap(stat({ volume: -1 })))).toThrow(MarketDataError)
  })
})
