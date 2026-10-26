import { sampleHourlySales } from './sample-data'
import type { SalesWeek } from './types'

// Example data for the "Meilleures heures" screen, until the app records its own snapshots
// (plan.md): the hourly shape of the overview, busier on weekend afternoons.
// Scales match the other screens: about 1 900 market sales and 190 Ash Prime Set sales a day.

// Monday first
const DAY_FACTORS = [0.92, 0.86, 0.9, 0.88, 1.0, 1.08, 1.12]
const WEEKEND = new Set([5, 6])

// Weekend boost peaking at 16:30 and fading out over 4 hours on each side (no sharp edge)
const AFTERNOON_PEAK = 16.5
const AFTERNOON_SPAN = 4
const AFTERNOON_BOOST = 0.25

function weekendBoost(hour: number): number {
  const closeness = Math.max(0, 1 - Math.abs(hour - AFTERNOON_PEAK) / AFTERNOON_SPAN)
  return 1 + AFTERNOON_BOOST * closeness
}

function salesWeek(scale: number): number[][] {
  return DAY_FACTORS.map((factor, day) =>
    sampleHourlySales.map((shape, hour) => {
      const boost = WEEKEND.has(day) ? weekendBoost(hour) : 1
      return Math.round(shape * factor * boost * scale)
    })
  )
}

const peak = Math.max(...sampleHourlySales)

/** Quiet hours sell slowly: from about `fastest` minutes at the peak to `fastest + spread` at night. */
function delays(fastest: number, spread: number): number[] {
  return sampleHourlySales.map((shape) => Math.round(fastest + (1 - shape / peak) * spread))
}

function sellers(base: number, perSale: number): number[] {
  return sampleHourlySales.map((shape) => Math.round(base + shape * perSale))
}

export const sampleSalesWeeks: Record<'market' | 'item', SalesWeek> = {
  market: {
    sales: salesWeek(1.8),
    medianDelay: delays(12, 70),
    sellersInGame: sellers(1200, 20),
    daysCollected: 9,
    daysNeeded: 28
  },
  item: {
    sales: salesWeek(0.18),
    medianDelay: delays(18, 75),
    sellersInGame: sellers(20, 0.45),
    daysCollected: 9,
    daysNeeded: 28
  }
}
