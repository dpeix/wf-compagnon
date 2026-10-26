// French typography: non-breaking space before units, true minus sign for negative values
const NBSP = ' '
const MINUS = '−'

const integerFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const percentFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** 1245 → "1 245 p" */
export function formatPlatinum(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`Invalid platinum amount: ${String(amount)}`)
  }
  return `${integerFormat.format(Math.round(amount))}${NBSP}p`
}

/** 18420 → "18 420" */
export function formatCount(count: number): string {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Invalid count: ${String(count)}`)
  }
  return integerFormat.format(count)
}

// Rounds the size of the change to a tenth of a percent, the same way for rises and drops
function tenthsOfPercent(ratio: number): number {
  if (!Number.isFinite(ratio)) {
    throw new RangeError(`Invalid change ratio: ${String(ratio)}`)
  }
  return Math.round(Math.abs(ratio) * 1000)
}

/** Direction of a change as it is displayed: a change shown as "0 %" is flat. */
export function changeTrend(ratio: number): 'up' | 'down' | 'flat' {
  if (tenthsOfPercent(ratio) === 0) return 'flat'
  return ratio > 0 ? 'up' : 'down'
}

/** 0.114 → "+11,4 %", -0.125 → "−12,5 %" */
export function formatChange(ratio: number): string {
  const tenths = tenthsOfPercent(ratio)
  const trend = changeTrend(ratio)
  const sign = trend === 'up' ? '+' : trend === 'down' ? MINUS : ''
  return `${sign}${percentFormat.format(tenths / 10)}${NBSP}%`
}
