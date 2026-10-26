const NBSP = ' '

const shareFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })

// These formatters would belong in format.ts, whose committed test file is locked:
// they live here with their tests until that file can be extended.

/** Share of a whole, without sign: 0.0769 → "7,7 %" */
export function formatShare(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) {
    throw new RangeError(`Invalid share: ${String(ratio)}`)
  }
  return `${shareFormat.format(Math.round(ratio * 1000) / 10)}${NBSP}%`
}

/** 28 July → "28 juil." */
export function formatDay(date: Date): string {
  return dayFormat.format(date)
}

/** Monday 14:00 → "lun. 14 h" */
export function formatHourLabel(date: Date): string {
  return `${weekdayFormat.format(date)} ${String(date.getHours())}${NBSP}h`
}

/** How likely a sale is: high from 75 %, medium from 40 %. */
export function chanceLevel(chance: number): 'high' | 'medium' | 'low' {
  if (!(chance >= 0 && chance <= 1)) {
    throw new RangeError(`Invalid chance: ${String(chance)}`)
  }
  if (chance >= 0.75) return 'high'
  if (chance >= 0.4) return 'medium'
  return 'low'
}

// Price moves smaller than this are noise for a selling decision
const TREND_THRESHOLD = 0.02

/** Direction of the price for a seller: falling means "sell now", rising means "you can wait". */
export function sellingTrend(change: number): 'falling' | 'rising' | 'stable' {
  if (!Number.isFinite(change)) {
    throw new RangeError(`Invalid change ratio: ${String(change)}`)
  }
  if (change <= -TREND_THRESHOLD) return 'falling'
  if (change >= TREND_THRESHOLD) return 'rising'
  return 'stable'
}

/** Whether selling a full set brings more than selling its parts one by one. */
export function compareSetAndParts(
  setPrice: number,
  parts: readonly { name: string; price: number }[]
): { partsTotal: number; difference: number; better: 'set' | 'parts' | 'equal' } {
  if (parts.length === 0) {
    throw new RangeError('A set needs at least one part')
  }
  const partsTotal = parts.reduce((sum, p) => sum + p.price, 0)
  const difference = setPrice - partsTotal
  return {
    partsTotal,
    difference,
    better: difference > 0 ? 'set' : difference < 0 ? 'parts' : 'equal'
  }
}
