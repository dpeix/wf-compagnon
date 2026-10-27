import { describe, expect, it } from 'vitest'
import { changeTrend, formatChange, formatCount, formatPlatinum } from './format'

// French typography: non-breaking space before units, narrow no-break space between thousands
// (what Intl fr-FR produces), true minus sign for negative values
const NBSP = ' '
const NNBSP = ' '
const MINUS = '−'

describe('formatPlatinum', () => {
  it('appends the platinum unit after a non-breaking space', () => {
    expect(formatPlatinum(52)).toBe(`52${NBSP}p`)
  })

  it('groups thousands the French way', () => {
    expect(formatPlatinum(1245)).toBe(`1${NNBSP}245${NBSP}p`)
  })

  it('rounds to whole platinum', () => {
    expect(formatPlatinum(52.6)).toBe(`53${NBSP}p`)
    expect(formatPlatinum(0)).toBe(`0${NBSP}p`)
  })

  it.each([
    ['a negative amount', -1],
    ['NaN', Number.NaN],
    ['infinity', Number.POSITIVE_INFINITY]
  ])('rejects %s', (_label, value) => {
    expect(() => formatPlatinum(value)).toThrow(RangeError)
  })
})

describe('formatCount', () => {
  it('groups thousands the French way', () => {
    expect(formatCount(18420)).toBe(`18${NNBSP}420`)
  })

  it('keeps small counts as they are', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(842)).toBe('842')
  })

  it.each([
    ['a negative count', -3],
    ['a fractional count', 2.5],
    ['NaN', Number.NaN]
  ])('rejects %s', (_label, value) => {
    expect(() => formatCount(value)).toThrow(RangeError)
  })
})

describe('formatChange', () => {
  it('shows a rise with a plus sign and one decimal', () => {
    expect(formatChange(0.114)).toBe(`+11,4${NBSP}%`)
  })

  it('shows a drop with a true minus sign', () => {
    expect(formatChange(-0.125)).toBe(`${MINUS}12,5${NBSP}%`)
  })

  it('drops a useless trailing zero', () => {
    expect(formatChange(0.12)).toBe(`+12${NBSP}%`)
  })

  it('shows no sign when there is no change, even after rounding', () => {
    expect(formatChange(0)).toBe(`0${NBSP}%`)
    expect(formatChange(-0.00004)).toBe(`0${NBSP}%`)
    expect(formatChange(0.00004)).toBe(`0${NBSP}%`)
  })

  it('rounds rises and drops of the same size the same way', () => {
    expect(formatChange(0.0005)).toBe(`+0,1${NBSP}%`)
    expect(formatChange(-0.0005)).toBe(`${MINUS}0,1${NBSP}%`)
    expect(formatChange(0.1245)).toBe(`+12,5${NBSP}%`)
    expect(formatChange(-0.1245)).toBe(`${MINUS}12,5${NBSP}%`)
  })

  it.each([
    ['NaN', Number.NaN],
    ['infinity', Number.NEGATIVE_INFINITY]
  ])('rejects %s', (_label, value) => {
    expect(() => formatChange(value)).toThrow(RangeError)
  })
})

describe('changeTrend', () => {
  it('follows the sign of the change', () => {
    expect(changeTrend(0.114)).toBe('up')
    expect(changeTrend(-0.125)).toBe('down')
    expect(changeTrend(0)).toBe('flat')
  })

  it('agrees with the displayed percentage for tiny changes', () => {
    // Shown as "0 %", so neither green nor red
    expect(changeTrend(0.0004)).toBe('flat')
    expect(changeTrend(-0.0004)).toBe('flat')
    // Shown as "+0,1 %" and "−0,1 %"
    expect(changeTrend(0.0005)).toBe('up')
    expect(changeTrend(-0.0005)).toBe('down')
  })

  it('rejects a change that is not a finite number', () => {
    expect(() => changeTrend(Number.NaN)).toThrow(RangeError)
  })
})
