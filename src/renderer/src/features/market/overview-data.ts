import type { ActivityDescription, MarketItemSummary } from './types'

// An hour is "strong" or "low" once it is this far from the daily average
const ACTIVITY_THRESHOLD = 0.25

function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`Invalid list limit: ${String(limit)}`)
  }
}

/** Items whose price moved the most over 7 days in one direction, biggest move first. */
export function topMovers(
  items: readonly MarketItemSummary[],
  direction: 'up' | 'down',
  limit: number
): MarketItemSummary[] {
  assertLimit(limit)
  const sign = direction === 'up' ? 1 : -1
  return items
    .filter((item) => item.change7d * sign > 0)
    .sort((a, b) => (b.change7d - a.change7d) * sign)
    .slice(0, limit)
}

/** Items with the most sales over the last 24 hours. */
export function mostTraded(
  items: readonly MarketItemSummary[],
  limit: number
): MarketItemSummary[] {
  assertLimit(limit)
  return [...items].sort((a, b) => b.sales24h - a.sales24h).slice(0, limit)
}

export function summarizeMarket(items: readonly MarketItemSummary[]): {
  rising: number
  falling: number
  sales24h: number
} {
  return {
    rising: items.filter((i) => i.change7d > 0).length,
    falling: items.filter((i) => i.change7d < 0).length,
    sales24h: items.reduce((sum, i) => sum + i.sales24h, 0)
  }
}

/** Rates the sales of one hour against the average hour of the same day. */
export function describeActivity(hourly: readonly number[], hour: number): ActivityDescription {
  if (hourly.length !== 24) {
    throw new RangeError(`Expected 24 hourly values, got ${String(hourly.length)}`)
  }
  if (hourly.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new RangeError('Hourly sales must be finite, non-negative numbers')
  }
  const current = hourly[hour]
  if (!Number.isInteger(hour) || current === undefined) {
    throw new RangeError(`Invalid hour: ${String(hour)}`)
  }
  const average = hourly.reduce((sum, v) => sum + v, 0) / 24
  if (average <= 0) {
    throw new RangeError('No activity to compare against')
  }

  const changeVsAverage = (current - average) / average
  const level =
    changeVsAverage >= ACTIVITY_THRESHOLD
      ? 'forte'
      : changeVsAverage <= -ACTIVITY_THRESHOLD
        ? 'faible'
        : 'normale'
  const peakHour = hourly.indexOf(Math.max(...hourly))
  return { level, changeVsAverage, peakHour }
}
