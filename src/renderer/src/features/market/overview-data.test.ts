import { describe, expect, it } from 'vitest'
import { describeActivity, mostTraded, summarizeMarket, topMovers } from './overview-data'
import type { MarketItemSummary } from './types'

function item(name: string, change7d: number, sales24h = 10): MarketItemSummary {
  return {
    slug: name.toLowerCase().replaceAll(' ', '_'),
    name,
    price: 100,
    change7d,
    sales24h,
    sellersInGame: 5,
    history7d: [100, 100, 100, 100, 100, 100, 100]
  }
}

const items = [
  item('Flat', 0, 50),
  item('Small rise', 0.02, 300),
  item('Big rise', 0.18, 20),
  item('Big drop', -0.12, 200),
  item('Small drop', -0.03, 5),
  item('Medium rise', 0.09, 120)
]

describe('topMovers', () => {
  it('lists the biggest rises first, without stable or falling items', () => {
    expect(topMovers(items, 'up', 5).map((i) => i.name)).toEqual([
      'Big rise',
      'Medium rise',
      'Small rise'
    ])
  })

  it('lists the biggest drops first, without stable or rising items', () => {
    expect(topMovers(items, 'down', 5).map((i) => i.name)).toEqual(['Big drop', 'Small drop'])
  })

  it('keeps only the requested number of items', () => {
    expect(topMovers(items, 'up', 1).map((i) => i.name)).toEqual(['Big rise'])
  })

  it('returns an empty list when nothing moves', () => {
    expect(topMovers([item('Flat', 0)], 'up', 5)).toEqual([])
  })

  it('does not reorder the list it receives', () => {
    const copy = [...items]
    topMovers(items, 'down', 5)
    expect(items).toEqual(copy)
  })

  it('rejects a limit that is not a positive integer', () => {
    expect(() => topMovers(items, 'up', 0)).toThrow(RangeError)
    expect(() => topMovers(items, 'up', 1.5)).toThrow(RangeError)
  })
})

describe('mostTraded', () => {
  it('lists the items with the most sales first', () => {
    expect(mostTraded(items, 3).map((i) => i.name)).toEqual([
      'Small rise',
      'Big drop',
      'Medium rise'
    ])
  })

  it('rejects a limit that is not a positive integer', () => {
    expect(() => mostTraded(items, -1)).toThrow(RangeError)
  })
})

describe('summarizeMarket', () => {
  it('counts rising and falling items and adds up the sales', () => {
    expect(summarizeMarket(items)).toEqual({ rising: 3, falling: 2, sales24h: 695 })
  })

  it('returns zeros for an empty market', () => {
    expect(summarizeMarket([])).toEqual({ rising: 0, falling: 0, sales24h: 0 })
  })
})

describe('describeActivity', () => {
  // 24 hourly values summing to 1200 (average 50), with a single peak at 21 h
  const hourly = [
    40, 30, 25, 20, 20, 20, 25, 30, 35, 40, 45, 45, 50, 50, 50, 55, 55, 60, 70, 85, 95, 100, 90, 65
  ]

  it('rates the current hour against the daily average', () => {
    expect(describeActivity(hourly, 21)).toEqual({
      level: 'forte',
      changeVsAverage: 1,
      peakHour: 21
    })
  })

  it('rates a quiet hour as low activity', () => {
    expect(describeActivity(hourly, 3)).toEqual({
      level: 'faible',
      changeVsAverage: -0.6,
      peakHour: 21
    })
  })

  it('rates an hour within 25 % of the average as normal', () => {
    expect(describeActivity(hourly, 17)).toEqual({
      level: 'normale',
      changeVsAverage: 0.2,
      peakHour: 21
    })
  })

  it('treats exactly ±25 % as strong or low activity', () => {
    // Average of 100: 125 + 75 + 22 × 100 = 2400
    const boundaries = [125, 75, ...Array.from({ length: 22 }, () => 100)]
    expect(describeActivity(boundaries, 0).level).toBe('forte')
    expect(describeActivity(boundaries, 1).level).toBe('faible')
  })

  it('reports the first peak when several hours share the highest value', () => {
    const twoPeaks = [...Array.from({ length: 22 }, () => 10), 90, 90]
    expect(describeActivity(twoPeaks, 0).peakHour).toBe(22)
  })

  it('rejects a series that does not cover 24 hours', () => {
    expect(() => describeActivity([1, 2, 3], 1)).toThrow(RangeError)
  })

  it('rejects an hour outside 0–23', () => {
    expect(() => describeActivity(hourly, 24)).toThrow(RangeError)
    expect(() => describeActivity(hourly, -1)).toThrow(RangeError)
  })

  it('rejects hourly values that are negative or not finite', () => {
    expect(() => describeActivity([...hourly.slice(0, 23), Number.NaN], 1)).toThrow(RangeError)
    expect(() => describeActivity([...hourly.slice(0, 23), -5], 1)).toThrow(RangeError)
  })

  it('rejects a day without any activity', () => {
    expect(() =>
      describeActivity(
        Array.from({ length: 24 }, () => 0),
        12
      )
    ).toThrow(RangeError)
  })
})
