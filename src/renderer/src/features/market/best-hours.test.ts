import { describe, expect, it } from 'vitest'
import {
  averageLabel,
  bestSlots,
  bestWindow,
  collectionProgress,
  dayPeaks,
  dayTotals,
  delaySummary,
  formatDuration,
  formatHourRange,
  formatPeakRatio,
  hasSales,
  heatLevels,
  hourlyProfile,
  quietPeriods,
  rangeAverage,
  slotSummaries
} from './best-hours'

const NBSP = ' '

/** 7 days (Monday first) × 24 hours, every cell set to `fill`. */
function week(fill: number): number[][] {
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => fill))
}

function set(matrix: number[][], day: number, hours: number[], value: number): number[][] {
  const row = matrix[day]
  if (!row) throw new Error(`No day ${String(day)}`)
  for (const h of hours) row[h] = value
  return matrix
}

describe('heatLevels', () => {
  it('rates each cell from 0 (calm) to 4 (peak) against the busiest hour', () => {
    const m = set(
      set(set(set(set(week(0), 0, [0], 19), 0, [1], 20), 0, [2], 59), 0, [3], 80),
      0,
      [4],
      100
    )
    expect(heatLevels(m)[0]?.slice(0, 6)).toEqual([0, 1, 2, 4, 4, 0])
  })

  it('leaves a week without sales calm everywhere', () => {
    expect(
      heatLevels(week(0))
        .flat()
        .every((level) => level === 0)
    ).toBe(true)
  })

  it('rejects a grid that is not 7 days × 24 hours', () => {
    expect(() => heatLevels(week(1).slice(0, 6))).toThrow(RangeError)
    expect(() => heatLevels([...week(1).slice(0, 6), Array.from({ length: 23 }, () => 1)])).toThrow(
      RangeError
    )
  })

  it('rejects negative or non-finite sales', () => {
    expect(() => heatLevels(set(week(1), 2, [5], -1))).toThrow(RangeError)
    expect(() => heatLevels(set(week(1), 2, [5], Number.NaN))).toThrow(RangeError)
  })
})

describe('hourlyProfile and dayTotals', () => {
  // Day d sells d items every hour
  const byDay = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, () => d))

  it('averages each hour over the 7 days', () => {
    expect(hourlyProfile(byDay)).toEqual(Array.from({ length: 24 }, () => 3))
  })

  it('adds up the sales of each day', () => {
    expect(dayTotals(byDay)).toEqual([0, 24, 48, 72, 96, 120, 144])
  })
})

describe('bestSlots', () => {
  const m = set(set(set(week(10), 6, [20, 21], 100), 5, [15, 16], 60), 0, [8, 9], 30)

  it('keeps the best window of each of the busiest days', () => {
    const slots = bestSlots(m, 2, 3)
    expect(slots.map(({ day, start, end, average }) => ({ day, start, end, average }))).toEqual([
      { day: 6, start: 20, end: 22, average: 100 },
      { day: 5, start: 15, end: 17, average: 60 },
      { day: 0, start: 8, end: 10, average: 30 }
    ])
  })

  it('compares each slot with the average hour of the week', () => {
    // 168 cells at 10, plus 2 × 90, 2 × 50 and 2 × 20 on top: 2000 sales over 168 hours
    expect(bestSlots(m, 2, 1)[0]?.vsAverage).toBeCloseTo(100 / (2000 / 168) - 1)
  })

  it('takes the earliest window when several are equal', () => {
    expect(bestSlots(week(5), 3, 1)[0]).toMatchObject({ day: 0, start: 0, end: 3 })
  })

  it('rejects a week without any sale', () => {
    expect(() => bestSlots(week(0), 2, 3)).toThrow(RangeError)
  })

  it('rejects an invalid window length or count', () => {
    expect(() => bestSlots(m, 0, 3)).toThrow(RangeError)
    expect(() => bestSlots(m, 25, 3)).toThrow(RangeError)
    expect(() => bestSlots(m, 2, 0)).toThrow(RangeError)
  })
})

describe('bestWindow', () => {
  it('finds the busiest run of hours in a day', () => {
    const profile = Array.from({ length: 24 }, (_, h) => (h >= 19 && h <= 21 ? 90 : 10))
    expect(bestWindow(profile, 3)).toEqual({ start: 19, end: 22, average: 90 })
  })

  it('rejects a profile that is not 24 hours long', () => {
    expect(() => bestWindow([1, 2, 3], 2)).toThrow(RangeError)
  })
})

describe('rangeAverage', () => {
  it('averages the values of a range of hours, end excluded', () => {
    expect(rangeAverage([1, 2, 3, 4], 1, 3)).toBe(2.5)
  })

  it('rejects an empty or out-of-bounds range', () => {
    expect(() => rangeAverage([1, 2, 3], 2, 2)).toThrow(RangeError)
    expect(() => rangeAverage([1, 2, 3], 1, 5)).toThrow(RangeError)
  })
})

describe('delaySummary', () => {
  const profile = Array.from({ length: 24 }, (_, h) => (h >= 19 && h <= 21 ? 90 : 10))
  const delays = Array.from({ length: 24 }, (_, h) =>
    h >= 19 && h <= 21 ? 15 + h - 19 : h === 5 ? 80 : 40
  )

  it('gives the median delay during the busiest window and the slowest hour', () => {
    expect(delaySummary(delays, profile, 3)).toEqual({
      window: { start: 19, end: 22, average: 90 },
      windowDelay: 16,
      slowest: 80,
      slowestHour: 5
    })
  })

  it('rejects delays that do not cover 24 hours', () => {
    expect(() => delaySummary([10, 20], profile, 3)).toThrow(RangeError)
  })
})

describe('quietPeriods', () => {
  // Average 1100 / 24 ≈ 45.8: hours under half of it are quiet
  const profile = Array.from({ length: 24 }, (_, h) =>
    h === 23 || h <= 4 ? 10 : h === 13 ? 20 : 60
  )

  it('lists the quiet runs, the quietest first, joining runs across midnight', () => {
    expect(quietPeriods(profile, 0.5)).toEqual([
      { start: 23, end: 5, ratioToPeak: 6 },
      { start: 13, end: 14, ratioToPeak: 3 }
    ])
  })

  it('finds nothing to avoid in a flat day', () => {
    expect(
      quietPeriods(
        Array.from({ length: 24 }, () => 40),
        0.5
      )
    ).toEqual([])
  })

  it('rejects a profile that is not 24 hours long or a ratio outside 0–1', () => {
    expect(() => quietPeriods([1, 2], 0.5)).toThrow(RangeError)
    expect(() => quietPeriods(profile, 1.5)).toThrow(RangeError)
  })
})

describe('formatDuration', () => {
  it('shows minutes under an hour', () => {
    expect(formatDuration(18)).toBe(`18${NBSP}min`)
    expect(formatDuration(0)).toBe(`0${NBSP}min`)
  })

  it('shows hours and minutes from one hour', () => {
    expect(formatDuration(80)).toBe(`1${NBSP}h${NBSP}20`)
    expect(formatDuration(120)).toBe(`2${NBSP}h`)
  })

  it('rounds to the minute first', () => {
    expect(formatDuration(59.6)).toBe(`1${NBSP}h`)
    expect(formatDuration(65.04)).toBe(`1${NBSP}h${NBSP}05`)
  })

  it('rejects a negative or non-finite duration', () => {
    expect(() => formatDuration(-1)).toThrow(RangeError)
    expect(() => formatDuration(Number.NaN)).toThrow(RangeError)
  })
})

describe('formatHourRange', () => {
  it('shows a range of hours', () => {
    expect(formatHourRange(20, 22)).toBe(`20${NBSP}h – 22${NBSP}h`)
  })

  it('shows midnight as 0 h, also for a range that crosses it', () => {
    expect(formatHourRange(22, 24)).toBe(`22${NBSP}h – 0${NBSP}h`)
    expect(formatHourRange(23, 5)).toBe(`23${NBSP}h – 5${NBSP}h`)
  })

  it('rejects hours outside 0–24', () => {
    expect(() => formatHourRange(-1, 3)).toThrow(RangeError)
    expect(() => formatHourRange(3, 25)).toThrow(RangeError)
  })
})

describe('week checks', () => {
  it('rejects an invalid week in every week function', () => {
    const bad = week(1).slice(0, 5)
    expect(() => hourlyProfile(bad)).toThrow(RangeError)
    expect(() => dayTotals(bad)).toThrow(RangeError)
    expect(() => dayPeaks(bad)).toThrow(RangeError)
    expect(() => hasSales(bad)).toThrow(RangeError)
  })

  it('handles a week without sales', () => {
    expect(hourlyProfile(week(0))).toEqual(Array.from({ length: 24 }, () => 0))
    expect(dayTotals(week(0))).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(hasSales(week(0))).toBe(false)
    expect(hasSales(set(week(0), 4, [12], 1))).toBe(true)
  })
})

describe('bestSlots, more cases', () => {
  it('ranks days by their best window, not by their total', () => {
    // Monday sells 50 every hour (1200 in total); Tuesday only has a 100 spike at 20–22 h
    const m = set(week(0), 1, [20, 21], 100)
    const monday = m[0]
    if (!monday) throw new Error('No Monday')
    monday.fill(50)
    expect(bestSlots(m, 2, 2).map((s) => s.day)).toEqual([1, 0])
  })

  it('can end a window at midnight', () => {
    expect(bestSlots(set(week(1), 3, [22, 23], 50), 2, 1)[0]).toMatchObject({
      day: 3,
      start: 22,
      end: 24
    })
  })

  it('returns at most one slot per day', () => {
    expect(bestSlots(week(1), 2, 10)).toHaveLength(7)
  })

  it('rejects a fractional window length', () => {
    expect(() =>
      bestWindow(
        Array.from({ length: 24 }, () => 1),
        1.5
      )
    ).toThrow(RangeError)
  })
})

describe('rangeAverage, more cases', () => {
  it('rejects a negative or fractional start', () => {
    expect(() => rangeAverage([1, 2, 3], -1, 2)).toThrow(RangeError)
    expect(() => rangeAverage([1, 2, 3], 0.5, 2)).toThrow(RangeError)
  })
})

describe('quietPeriods, more cases', () => {
  it('reports a run without any sale as infinitely quieter than the peak', () => {
    const profile = Array.from({ length: 24 }, (_, h) => (h === 4 ? 0 : 50))
    expect(quietPeriods(profile, 0.5)).toEqual([
      { start: 4, end: 5, ratioToPeak: Number.POSITIVE_INFINITY }
    ])
  })

  it('rejects a ratio that is negative or not a number', () => {
    const profile = Array.from({ length: 24 }, () => 1)
    expect(() => quietPeriods(profile, -0.1)).toThrow(RangeError)
    expect(() => quietPeriods(profile, Number.NaN)).toThrow(RangeError)
  })
})

describe('slotSummaries', () => {
  const m = set(set(week(10), 6, [20, 21], 100), 5, [15, 16], 60)
  // Delay (minutes) equals the hour; sellers are 100 + the hour
  const delays = Array.from({ length: 24 }, (_, h) => h)
  const sellers = Array.from({ length: 24 }, (_, h) => 100 + h)

  it('describes the best slots with their sales, delay and sellers', () => {
    const [first, second] = slotSummaries(m, delays, sellers, 2, 2)
    expect(first).toMatchObject({
      rank: 1,
      day: 6,
      title: `Dimanche · 20${NBSP}h – 22${NBSP}h`,
      salesPerHour: 100,
      delayMinutes: 20.5,
      sellers: 121
    })
    expect(second).toMatchObject({ rank: 2, day: 5, title: `Samedi · 15${NBSP}h – 17${NBSP}h` })
  })

  it('rejects delays or sellers that do not cover 24 hours', () => {
    expect(() => slotSummaries(m, [1, 2], sellers, 2, 2)).toThrow(RangeError)
    expect(() => slotSummaries(m, delays, [1], 2, 2)).toThrow(RangeError)
  })
})

describe('dayPeaks', () => {
  it('gives the busiest hour and the total of each day', () => {
    const m = set(set(week(1), 0, [21], 50), 6, [3, 18], 20)
    const peaks = dayPeaks(m)
    expect(peaks[0]).toEqual({ day: 0, peakHour: 21, total: 23 + 50 })
    // Ties go to the earliest hour
    expect(peaks[6]).toEqual({ day: 6, peakHour: 3, total: 22 + 40 })
  })
})

describe('formatPeakRatio', () => {
  it('rounds how many times fewer sales than at the peak', () => {
    expect(formatPeakRatio(6.4)).toBe("6× moins de ventes qu'au pic")
  })

  it('handles hours without any sale', () => {
    expect(formatPeakRatio(Number.POSITIVE_INFINITY)).toBe('Aucune vente à ces heures')
  })

  it('rejects a ratio under 1 or not a number', () => {
    expect(() => formatPeakRatio(0.5)).toThrow(RangeError)
    expect(() => formatPeakRatio(Number.NaN)).toThrow(RangeError)
  })
})

describe('collectionProgress', () => {
  it('gives the share of days collected and a readable label', () => {
    expect(collectionProgress(9, 28)).toEqual({ ratio: 9 / 28, label: '9 jours sur 28' })
    expect(collectionProgress(1, 28).label).toBe('1 jour sur 28')
  })

  it('stays at 100 % once enough days are collected', () => {
    expect(collectionProgress(40, 28).ratio).toBe(1)
    expect(collectionProgress(0, 0).ratio).toBe(1)
  })

  it('rejects negative or fractional day counts', () => {
    expect(() => collectionProgress(-1, 28)).toThrow(RangeError)
    expect(() => collectionProgress(2.5, 28)).toThrow(RangeError)
  })
})

describe('averageLabel', () => {
  it('names the period the averages come from', () => {
    expect(averageLabel(9)).toBe('moyenne des 9 jours relevés')
    expect(averageLabel(1)).toBe('moyenne du seul jour relevé')
    expect(averageLabel(0)).toBe('aucun jour relevé pour le moment')
  })

  it('rejects a negative or fractional count', () => {
    expect(() => averageLabel(-2)).toThrow(RangeError)
    expect(() => averageLabel(1.5)).toThrow(RangeError)
  })
})
