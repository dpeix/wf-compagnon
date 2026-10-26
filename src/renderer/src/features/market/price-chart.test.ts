import { describe, expect, it } from 'vitest'
import {
  evenIndices,
  formatAxisValue,
  niceScale,
  periodStats,
  priceChartPaths,
  volumeBars
} from './price-chart'

describe('formatAxisValue', () => {
  it('writes axis values the French way', () => {
    expect(formatAxisValue(99.5)).toBe('99,5')
    expect(formatAxisValue(1250)).toBe('1 250')
  })
})

describe('volumeBars', () => {
  it('centres each bar on its point of the price curve', () => {
    expect(volumeBars([10, 20], 100, 50)).toEqual([
      { x: -35, width: 70, height: 25 },
      { x: 65, width: 70, height: 50 }
    ])
  })

  it('draws a single bar in the middle', () => {
    expect(volumeBars([10], 100, 50)).toEqual([{ x: 15, width: 70, height: 50 }])
  })

  it('returns no bars for an empty series', () => {
    expect(volumeBars([], 100, 50)).toEqual([])
  })

  it('rejects negative volumes', () => {
    expect(() => volumeBars([5, -1], 100, 50)).toThrow(RangeError)
  })
})

describe('niceScale', () => {
  it('rounds the range out to round ticks, with at most the requested number', () => {
    expect(niceScale(189, 268, 5)).toEqual({ min: 175, max: 275, ticks: [175, 200, 225, 250, 275] })
  })

  it('uses plain steps when they fit', () => {
    expect(niceScale(0, 100, 6)).toEqual({ min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] })
  })

  it('opens up a range around a flat series', () => {
    expect(niceScale(100, 100, 5)).toEqual({
      min: 99,
      max: 101,
      ticks: [99, 99.5, 100, 100.5, 101]
    })
  })

  it('keeps evenly spaced ticks for very small values', () => {
    expect(niceScale(1e-9, 2e-9, 5).ticks).toEqual([1e-9, 1.25e-9, 1.5e-9, 1.75e-9, 2e-9])
  })

  it('handles a range around zero', () => {
    expect(niceScale(0, 0, 3)).toEqual({ min: -1, max: 1, ticks: [-1, 0, 1] })
  })

  it('rejects an inverted or invalid range', () => {
    expect(() => niceScale(10, 5, 5)).toThrow(RangeError)
    expect(() => niceScale(Number.NaN, 5, 5)).toThrow(RangeError)
  })

  it('needs at least 3 ticks', () => {
    expect(() => niceScale(0, 10, 2)).toThrow(RangeError)
  })
})

describe('priceChartPaths', () => {
  const scale = { min: 0, max: 40 }

  it('draws the average as a line and min–max as a closed band', () => {
    const points = [
      { avg: 20, min: 10, max: 30 },
      { avg: 30, min: 20, max: 40 }
    ]
    expect(priceChartPaths(points, 100, 100, scale)).toEqual({
      line: 'M0 50 L100 25',
      band: 'M0 25 L100 0 L100 50 L0 75 Z',
      last: { x: 100, y: 25 }
    })
  })

  it('places a single point in the middle', () => {
    expect(priceChartPaths([{ avg: 20, min: 20, max: 20 }], 100, 100, scale).last).toEqual({
      x: 50,
      y: 50
    })
  })

  it('returns nothing to draw for an empty series', () => {
    expect(priceChartPaths([], 100, 100, scale)).toEqual({ line: '', band: '', last: null })
  })

  it('rejects a point whose average is outside its min–max', () => {
    expect(() => priceChartPaths([{ avg: 50, min: 10, max: 30 }], 100, 100, scale)).toThrow(
      RangeError
    )
  })

  it('rejects an empty scale', () => {
    expect(() => priceChartPaths([], 100, 100, { min: 5, max: 5 })).toThrow(RangeError)
  })
})

describe('periodStats', () => {
  it('reports high, low, average and change over the period', () => {
    const stats = periodStats([
      { avg: 100, min: 90, max: 110 },
      { avg: 110, min: 100, max: 130 },
      { avg: 90, min: 80, max: 95 }
    ])
    expect(stats).toMatchObject({ high: 130, low: 80, average: 100 })
    expect(stats.change).toBeCloseTo(-0.1)
  })

  it.each([
    ['low', [100, 101, 99], 'faible'],
    ['medium', [100, 105, 95], 'moyenne'],
    ['high', [100, 110, 90], 'forte']
  ])('rates %s volatility from how much the average price moves', (_label, avgs, expected) => {
    const points = avgs.map((avg) => ({ avg, min: avg, max: avg }))
    expect(periodStats(points).volatility).toBe(expected)
  })

  it('reports no change when the period starts at zero', () => {
    const stats = periodStats([
      { avg: 0, min: 0, max: 0 },
      { avg: 10, min: 5, max: 12 }
    ])
    expect(stats.change).toBe(0)
  })

  it('rejects an empty period', () => {
    expect(() => periodStats([])).toThrow(RangeError)
  })
})

describe('evenIndices', () => {
  it('spreads indices from the first to the last item', () => {
    expect(evenIndices(5, 3)).toEqual([0, 2, 4])
    expect(evenIndices(90, 7)).toEqual([0, 15, 30, 45, 59, 74, 89])
  })

  it('returns every index when there are fewer items than requested', () => {
    expect(evenIndices(3, 7)).toEqual([0, 1, 2])
  })

  it('returns nothing for an empty list', () => {
    expect(evenIndices(0, 4)).toEqual([])
  })

  it('rejects fewer than two labels', () => {
    expect(() => evenIndices(10, 1)).toThrow(RangeError)
  })
})
