import { describe, expect, it } from 'vitest'
import {
  chanceLevel,
  compareSetAndParts,
  formatDay,
  formatHourLabel,
  formatShare,
  sellingTrend
} from './item-insights'

describe('chanceLevel', () => {
  it('rates a sale chance as high, medium or low', () => {
    expect(chanceLevel(0.96)).toBe('high')
    expect(chanceLevel(0.75)).toBe('high')
    expect(chanceLevel(0.74)).toBe('medium')
    expect(chanceLevel(0.4)).toBe('medium')
    expect(chanceLevel(0.39)).toBe('low')
    expect(chanceLevel(0)).toBe('low')
  })

  it('rejects a chance outside 0–1', () => {
    expect(() => chanceLevel(1.2)).toThrow(RangeError)
    expect(() => chanceLevel(-0.1)).toThrow(RangeError)
  })
})

describe('formatShare', () => {
  it('shows a share as a percentage without sign, one decimal at most', () => {
    expect(formatShare(15 / 195)).toBe('7,7 %')
    expect(formatShare(1)).toBe('100 %')
    expect(formatShare(0)).toBe('0 %')
  })

  it('rejects a negative or non-finite share', () => {
    expect(() => formatShare(-0.05)).toThrow(RangeError)
    expect(() => formatShare(Number.NaN)).toThrow(RangeError)
  })
})

describe('sellingTrend', () => {
  it('reads a price drop of 2 % or more as falling', () => {
    expect(sellingTrend(-0.125)).toBe('falling')
    expect(sellingTrend(-0.02)).toBe('falling')
  })

  it('reads a price rise of 2 % or more as rising', () => {
    expect(sellingTrend(0.02)).toBe('rising')
  })

  it('reads smaller moves as stable', () => {
    expect(sellingTrend(0.019)).toBe('stable')
    expect(sellingTrend(-0.019)).toBe('stable')
    expect(sellingTrend(0)).toBe('stable')
  })

  it('rejects a change that is not a finite number', () => {
    expect(() => sellingTrend(Number.NaN)).toThrow(RangeError)
  })
})

describe('compareSetAndParts', () => {
  const parts = [
    { name: 'Blueprint', price: 28 },
    { name: 'Chassis', price: 52 },
    { name: 'Neuroptics', price: 71 },
    { name: 'Systems', price: 43 }
  ]

  it('recommends the set when it sells for more than its parts', () => {
    expect(compareSetAndParts(210, parts)).toEqual({
      partsTotal: 194,
      difference: 16,
      better: 'set'
    })
  })

  it('recommends the parts when they add up to more', () => {
    expect(compareSetAndParts(180, parts)).toEqual({
      partsTotal: 194,
      difference: -14,
      better: 'parts'
    })
  })

  it('calls it even when both bring the same', () => {
    expect(compareSetAndParts(194, parts).better).toBe('equal')
  })

  it('rejects a set without parts', () => {
    expect(() => compareSetAndParts(210, [])).toThrow(RangeError)
  })
})

describe('date labels', () => {
  it('shows a day with the short French month', () => {
    expect(formatDay(new Date(2026, 6, 28))).toBe('28 juil.')
  })

  it('shows an hour with the short weekday', () => {
    // 26 October 2026 is a Monday
    expect(formatHourLabel(new Date(2026, 9, 26, 14))).toBe('lun. 14 h')
  })

  it('shows midnight as 0 h', () => {
    expect(formatHourLabel(new Date(2026, 9, 26, 0))).toBe('lun. 0 h')
  })

  it('rejects an invalid date', () => {
    expect(() => formatDay(new Date(Number.NaN))).toThrow(RangeError)
    expect(() => formatHourLabel(new Date(Number.NaN))).toThrow(RangeError)
  })
})
