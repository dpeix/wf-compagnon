import { barHeights } from './chart'
import type { PricePoint } from './types'

const NICE_STEPS = [1, 2, 2.5, 5, 10]

// Avoids ticks like 0.30000000000000004 while keeping the precision of very small values
const clean = (n: number): number => Number(n.toPrecision(12))

const axisFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** 99.5 → "99,5", 1250 → "1 250" */
export function formatAxisValue(value: number): string {
  return axisFormat.format(value)
}

/** Axis range rounded out to round values, with at most maxTicks ticks. */
export function niceScale(
  min: number,
  max: number,
  maxTicks: number
): { min: number; max: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    throw new RangeError(`Invalid range: ${String(min)} – ${String(max)}`)
  }
  // With 3 ticks or more, a step as wide as the range always fits: the search below ends
  if (!Number.isInteger(maxTicks) || maxTicks < 3) {
    throw new RangeError(`Invalid tick count: ${String(maxTicks)}`)
  }
  // A flat series still needs a visible range
  const [lo, hi] = min === max ? [min - 1, max + 1] : [min, max]

  const rough = (hi - lo) / (maxTicks - 1)
  let magnitude = 10 ** Math.floor(Math.log10(rough))
  let stepIndex = NICE_STEPS.findIndex((s) => s * magnitude >= rough)
  for (;;) {
    const step = (NICE_STEPS[stepIndex] ?? 1) * magnitude
    const start = Math.floor(clean(lo / step)) * step
    const end = Math.ceil(clean(hi / step)) * step
    const count = Math.round((end - start) / step) + 1
    if (count <= maxTicks) {
      const ticks = Array.from({ length: count }, (_, i) => clean(start + i * step))
      return { min: clean(start), max: clean(end), ticks }
    }
    // Rounding out added a tick too many: take the next round step
    stepIndex += 1
    if (stepIndex >= NICE_STEPS.length) {
      stepIndex = 1
      magnitude *= 10
    }
  }
}

function assertPoint({ avg, min, max }: PricePoint): void {
  if (![avg, min, max].every(Number.isFinite) || min > avg || avg > max) {
    throw new RangeError(`Invalid price point: ${String(min)} ≤ ${String(avg)} ≤ ${String(max)}`)
  }
}

const round1 = (n: number): number => Math.round(n * 10) / 10

/**
 * SVG paths of a price chart in a width × height box: the average price as a line,
 * the min–max range as a closed band, and the position of the latest point.
 */
export function priceChartPaths(
  points: readonly PricePoint[],
  width: number,
  height: number,
  scale: { min: number; max: number }
): { line: string; band: string; last: { x: number; y: number } | null } {
  if (!(scale.max > scale.min)) {
    throw new RangeError(`Invalid scale: ${String(scale.min)} – ${String(scale.max)}`)
  }
  points.forEach(assertPoint)
  if (points.length === 0) return { line: '', band: '', last: null }

  const x = (i: number): number =>
    round1(points.length === 1 ? width / 2 : (i / (points.length - 1)) * width)
  const y = (v: number): number =>
    round1(height - ((v - scale.min) / (scale.max - scale.min)) * height)
  const path = (coords: [number, number][]): string =>
    coords.map(([px, py], i) => `${i ? 'L' : 'M'}${String(px)} ${String(py)}`).join(' ')

  const line = path(points.map((p, i) => [x(i), y(p.avg)]))
  const top = points.map((p, i): [number, number] => [x(i), y(p.max)])
  const bottom = points.map((p, i): [number, number] => [x(i), y(p.min)]).reverse()
  const band = `${path([...top, ...bottom])} Z`
  const lastIndex = points.length - 1
  const lastPoint = points[lastIndex]
  return {
    line,
    band,
    last: lastPoint ? { x: x(lastIndex), y: y(lastPoint.avg) } : null
  }
}

// Coefficient of variation of the average price below which a period is calm / moderate
const CALM = 0.03
const MODERATE = 0.08

export function periodStats(points: readonly PricePoint[]): {
  high: number
  low: number
  average: number
  change: number
  volatility: 'faible' | 'moyenne' | 'forte'
} {
  const first = points[0]
  const last = points.at(-1)
  if (first === undefined || last === undefined) {
    throw new RangeError('A period needs at least one price')
  }
  points.forEach(assertPoint)

  const avgs = points.map((p) => p.avg)
  const average = avgs.reduce((sum, v) => sum + v, 0) / avgs.length
  const variance = avgs.reduce((sum, v) => sum + (v - average) ** 2, 0) / avgs.length
  const variation = average === 0 ? 0 : Math.sqrt(variance) / average
  return {
    high: Math.max(...points.map((p) => p.max)),
    low: Math.min(...points.map((p) => p.min)),
    average,
    change: first.avg === 0 ? 0 : last.avg / first.avg - 1,
    volatility: variation < CALM ? 'faible' : variation < MODERATE ? 'moyenne' : 'forte'
  }
}

// Share of the gap between two points taken by a volume bar
const BAR_FILL = 0.7

/**
 * Volume bars in a width × height box, each centred on the x of its point on the price curve
 * (the first and last bars stick out by half a bar).
 */
export function volumeBars(
  volumes: readonly number[],
  width: number,
  height: number
): { x: number; width: number; height: number }[] {
  const heights = barHeights(volumes, height)
  const step = volumes.length > 1 ? width / (volumes.length - 1) : width
  const barWidth = round1(step * BAR_FILL)
  return heights.map((h, i) => {
    const centre = volumes.length === 1 ? width / 2 : i * step
    return { x: round1(centre - barWidth / 2), width: barWidth, height: h }
  })
}

/** Indices of `count` items spread from the first to the last one, e.g. for axis labels. */
export function evenIndices(length: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError(`Invalid label count: ${String(count)}`)
  }
  if (length <= count) return Array.from({ length }, (_, i) => i)
  return Array.from({ length: count }, (_, i) => Math.round((i * (length - 1)) / (count - 1)))
}
