const MIN_VISIBLE_BAR = 2

function assertFinite(values: readonly number[]): void {
  if (values.some((v) => !Number.isFinite(v))) {
    throw new RangeError('Chart values must be finite numbers')
  }
}

const round1 = (n: number): number => Math.round(n * 10) / 10

const isPositiveSize = (n: number): boolean => Number.isFinite(n) && n > 0

/** Minimum vertical range for a sparkline: a share of the average value (0.2 → ±10 %). */
export function minRangeFor(values: readonly number[], share: number): number {
  if (!(share >= 0)) {
    throw new RangeError(`Invalid range share: ${String(share)}`)
  }
  assertFinite(values)
  if (values.length === 0) return 0
  const average = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.abs(average) * share
}

/**
 * Points of an SVG polyline fitting the values in a width × height box,
 * highest value at the top. A flat series is drawn as a line through the middle.
 * `minRange` keeps the vertical scale at least that wide (centred on the values),
 * so a 1 p wobble on an 18 p item does not fill the whole height.
 */
export function sparklinePoints(
  values: readonly number[],
  width: number,
  height: number,
  minRange = 0
): string {
  if (!isPositiveSize(width) || !isPositiveSize(height)) {
    throw new RangeError(`Invalid drawing area: ${String(width)} × ${String(height)}`)
  }
  if (!(minRange >= 0)) {
    throw new RangeError(`Invalid minimum range: ${String(minRange)}`)
  }
  assertFinite(values)
  if (values.length === 0) return ''

  // A single value still needs two points to draw a line
  const series = values.length === 1 ? [...values, ...values] : values
  let min = Math.min(...series)
  let max = Math.max(...series)
  if (max - min < minRange) {
    const centre = (min + max) / 2
    min = centre - minRange / 2
    max = centre + minRange / 2
  }
  const step = width / (series.length - 1)
  return series
    .map((v, i) => {
      const y = max === min ? height / 2 : height - ((v - min) / (max - min)) * height
      return `${String(round1(i * step))},${String(round1(y))}`
    })
    .join(' ')
}

/**
 * Heights of a bar chart whose largest bar fills maxHeight.
 * Non-zero values never get thinner than a visible sliver; zero stays empty.
 */
export function barHeights(values: readonly number[], maxHeight: number): number[] {
  if (!isPositiveSize(maxHeight)) {
    throw new RangeError(`Invalid chart height: ${String(maxHeight)}`)
  }
  assertFinite(values)
  if (values.some((v) => v < 0)) {
    throw new RangeError('Bar values cannot be negative')
  }
  const max = Math.max(0, ...values)
  if (max === 0) return values.map(() => 0)
  return values.map((v) =>
    v === 0 ? 0 : Math.max(MIN_VISIBLE_BAR, Math.round((v / max) * maxHeight))
  )
}
