import { describe, expect, it } from 'vitest'
import { barHeights, minRangeFor, sparklinePoints } from './chart'

describe('sparklinePoints', () => {
  it('spreads the values over the width, highest value at the top', () => {
    expect(sparklinePoints([1, 2, 3], 100, 10)).toBe('0,10 50,5 100,0')
  })

  it('draws a flat line in the middle when all values are equal', () => {
    expect(sparklinePoints([5, 5, 5], 100, 10)).toBe('0,5 50,5 100,5')
  })

  it('draws a flat line across the whole width for a single value', () => {
    expect(sparklinePoints([7], 80, 20)).toBe('0,10 80,10')
  })

  it('returns nothing to draw for an empty series', () => {
    expect(sparklinePoints([], 100, 10)).toBe('')
  })

  it('rounds coordinates to one decimal', () => {
    expect(sparklinePoints([0, 1, 3], 10, 10)).toBe('0,10 5,6.7 10,0')
  })

  it('does not blow up small variations below the minimum range', () => {
    // 17 ↔ 18 drawn on a 4-unit scale centred on 17.5: 15.5 at the bottom, 19.5 at the top
    expect(sparklinePoints([17, 18, 17], 100, 8, 4)).toBe('0,5 50,3 100,5')
  })

  it('ignores the minimum range when the values already span more', () => {
    expect(sparklinePoints([1, 2, 3], 100, 10, 1)).toBe('0,10 50,5 100,0')
  })

  it('rejects values that are not finite numbers', () => {
    expect(() => sparklinePoints([1, Number.NaN], 100, 10)).toThrow(RangeError)
  })

  it('rejects a negative minimum range', () => {
    expect(() => sparklinePoints([1, 2], 100, 10, -1)).toThrow(RangeError)
  })

  it('rejects a drawing area without a finite size', () => {
    expect(() => sparklinePoints([1, 2], 0, 10)).toThrow(RangeError)
    expect(() => sparklinePoints([1, 2], 100, -5)).toThrow(RangeError)
    expect(() => sparklinePoints([1, 2], Number.POSITIVE_INFINITY, 10)).toThrow(RangeError)
  })
})

describe('minRangeFor', () => {
  it('is a share of the average value', () => {
    expect(minRangeFor([10, 30], 0.2)).toBe(4)
  })

  it('is zero for an empty series', () => {
    expect(minRangeFor([], 0.2)).toBe(0)
  })

  it('rejects a negative share', () => {
    expect(() => minRangeFor([10], -0.1)).toThrow(RangeError)
  })
})

describe('barHeights', () => {
  it('scales the bars so the largest one fills the height', () => {
    expect(barHeights([50, 100, 25], 80)).toEqual([40, 80, 20])
  })

  it('keeps small non-zero bars visible with a minimum height', () => {
    expect(barHeights([1, 1000], 100)).toEqual([2, 100])
  })

  it('leaves zero values without a bar', () => {
    expect(barHeights([0, 10], 80)).toEqual([0, 80])
    expect(barHeights([0, 0], 80)).toEqual([0, 0])
  })

  it('returns no bars for an empty series', () => {
    expect(barHeights([], 80)).toEqual([])
  })

  it('rejects negative or non-finite values', () => {
    expect(() => barHeights([3, -1], 80)).toThrow(RangeError)
    expect(() => barHeights([3, Number.POSITIVE_INFINITY], 80)).toThrow(RangeError)
  })

  it('rejects a chart height that is not a positive number', () => {
    expect(() => barHeights([1, 2], -10)).toThrow(RangeError)
    expect(() => barHeights([1, 2], Number.NaN)).toThrow(RangeError)
  })
})
