// Logic of the "Meilleures heures" screen. A week is 7 rows (Monday first) of 24 hourly values.

const NBSP = ' '

/** Day labels, Monday first like the week grids. */
export const DAY_NAMES = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche'
] as const
export const DAY_SHORT_NAMES = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'] as const

const DAYS = 7
const HOURS = 24
const HEAT_LEVELS = 5

function assertWeek(week: readonly (readonly number[])[]): void {
  if (week.length !== DAYS || week.some((day) => day.length !== HOURS)) {
    throw new RangeError('Expected 7 days of 24 hourly values')
  }
  if (week.some((day) => day.some((v) => !Number.isFinite(v) || v < 0))) {
    throw new RangeError('Hourly sales must be finite, non-negative numbers')
  }
}

function assertProfile(profile: readonly number[]): void {
  if (profile.length !== HOURS || profile.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new RangeError('Expected 24 finite, non-negative hourly values')
  }
}

const mean = (values: readonly number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length

/** Heat map level of each cell, 0 (calm) to 4 (peak), relative to the busiest hour of the week. */
export function heatLevels(week: readonly (readonly number[])[]): number[][] {
  assertWeek(week)
  const max = Math.max(...week.flat())
  return week.map((day) =>
    day.map((v) => (max === 0 ? 0 : Math.min(HEAT_LEVELS - 1, Math.floor((v / max) * HEAT_LEVELS))))
  )
}

/** Average sales of each hour over the 7 days. */
export function hourlyProfile(week: readonly (readonly number[])[]): number[] {
  assertWeek(week)
  return Array.from({ length: HOURS }, (_, h) => mean(week.map((day) => day[h] ?? 0)))
}

/** Total sales of each day. */
export function dayTotals(week: readonly (readonly number[])[]): number[] {
  assertWeek(week)
  return week.map((day) => day.reduce((sum, v) => sum + v, 0))
}

interface HourWindow {
  start: number
  /** Exclusive */
  end: number
  average: number
}

function assertLength(length: number): void {
  if (!Number.isInteger(length) || length < 1 || length > HOURS) {
    throw new RangeError(`Invalid window length: ${String(length)}`)
  }
}

// Busiest run of `length` hours within one day (no wrap past midnight), earliest on ties
function busiestWindow(hours: readonly number[], length: number): HourWindow {
  let best: HourWindow = { start: 0, end: length, average: -1 }
  for (let start = 0; start + length <= HOURS; start++) {
    const average = mean(hours.slice(start, start + length))
    if (average > best.average) best = { start, end: start + length, average }
  }
  return best
}

/** Busiest run of `length` hours in an average day. */
export function bestWindow(profile: readonly number[], length: number): HourWindow {
  assertProfile(profile)
  assertLength(length)
  return busiestWindow(profile, length)
}

/** Average of values[start] … values[end - 1]. */
export function rangeAverage(values: readonly number[], start: number, end: number): number {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > values.length ||
    start >= end
  ) {
    throw new RangeError(`Invalid range: ${String(start)} – ${String(end)}`)
  }
  return mean(values.slice(start, end))
}

/** Median delay to sell during the busiest window of the day, and the slowest hour. */
export function delaySummary(
  medianDelay: readonly number[],
  profile: readonly number[],
  length: number
): { window: HourWindow; windowDelay: number; slowest: number; slowestHour: number } {
  assertProfile(medianDelay)
  const best = bestWindow(profile, length)
  const slowest = Math.max(...medianDelay)
  return {
    window: best,
    windowDelay: rangeAverage(medianDelay, best.start, best.end),
    slowest,
    slowestHour: medianDelay.indexOf(slowest)
  }
}

/**
 * The busiest window of each day, for the `count` days whose best window sells the most, best first.
 * `vsAverage` compares the window with the average hour of the week (0.5 = +50 %).
 */
export function bestSlots(
  week: readonly (readonly number[])[],
  length: number,
  count: number
): (HourWindow & { day: number; vsAverage: number })[] {
  assertWeek(week)
  assertLength(length)
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`Invalid slot count: ${String(count)}`)
  }
  const weekAverage = mean(week.flat())
  if (weekAverage === 0) {
    throw new RangeError('No sales to compare against')
  }
  return week
    .map((hours, day) => {
      const best = busiestWindow(hours, length)
      return { ...best, day, vsAverage: best.average / weekAverage - 1 }
    })
    .sort((a, b) => b.average - a.average || a.day - b.day)
    .slice(0, count)
}

/**
 * Runs of hours selling less than `ratio` × the average hour, quietest first.
 * A run that goes past midnight is reported once (start 23, end 5).
 * `ratioToPeak` tells how many times more the busiest hour sells.
 */
export function quietPeriods(
  profile: readonly number[],
  ratio: number
): { start: number; end: number; ratioToPeak: number }[] {
  assertProfile(profile)
  if (!(ratio >= 0 && ratio <= 1)) {
    throw new RangeError(`Invalid ratio: ${String(ratio)}`)
  }
  const threshold = ratio * mean(profile)
  const quiet = profile.map((v) => v < threshold)

  // Runs of consecutive quiet hours, as lists of hours
  const runs: number[][] = []
  quiet.forEach((isQuiet, h) => {
    if (!isQuiet) return
    const current = runs.at(-1)
    if (current?.at(-1) === h - 1) current.push(h)
    else runs.push([h])
  })
  // Join the run ending at 23 h with the one starting at 0 h
  const first = runs[0]
  const last = runs.at(-1)
  if (runs.length > 1 && first && last && first[0] === 0 && last.at(-1) === HOURS - 1) {
    runs.shift()
    runs[runs.length - 1] = [...last, ...first]
  }

  const peak = Math.max(...profile)
  return runs
    .map((hours) => {
      const runAverage = mean(hours.map((h) => profile[h] ?? 0))
      return {
        start: hours[0] ?? 0,
        end: ((hours.at(-1) ?? 0) + 1) % HOURS,
        ratioToPeak: runAverage === 0 ? Number.POSITIVE_INFINITY : peak / runAverage
      }
    })
    .sort((a, b) => b.ratioToPeak - a.ratioToPeak)
}

/** 18 → "18 min", 80 → "1 h 20", 120 → "2 h" */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new RangeError(`Invalid duration: ${String(minutes)}`)
  }
  const total = Math.round(minutes)
  if (total < 60) return `${String(total)}${NBSP}min`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest === 0
    ? `${String(hours)}${NBSP}h`
    : `${String(hours)}${NBSP}h${NBSP}${String(rest).padStart(2, '0')}`
}

/** (20, 22) → "20 h – 22 h"; 24 is midnight, shown as 0 h. */
export function formatHourRange(start: number, end: number): string {
  for (const h of [start, end]) {
    if (!Number.isInteger(h) || h < 0 || h > HOURS) {
      throw new RangeError(`Invalid hour: ${String(h)}`)
    }
  }
  const label = (h: number): string => `${String(h % HOURS)}${NBSP}h`
  return `${label(start)} – ${label(end)}`
}

/** Whether the week has at least one sale (the best slots need some activity). */
export function hasSales(week: readonly (readonly number[])[]): boolean {
  assertWeek(week)
  return week.some((day) => day.some((v) => v > 0))
}

/** Busiest hour (earliest on ties) and total sales of each day. */
export function dayPeaks(
  week: readonly (readonly number[])[]
): { day: number; peakHour: number; total: number }[] {
  assertWeek(week)
  return week.map((hours, day) => ({
    day,
    peakHour: hours.indexOf(Math.max(...hours)),
    total: hours.reduce((sum, v) => sum + v, 0)
  }))
}

/**
 * The top slots ready to display: day and hours, sales per hour, median delay and sellers
 * in game. Delays and sellers are known per hour of the day, the same for every day.
 */
export function slotSummaries(
  week: readonly (readonly number[])[],
  medianDelay: readonly number[],
  sellersInGame: readonly number[],
  length: number,
  count: number
): {
  rank: number
  day: number
  title: string
  vsAverage: number
  salesPerHour: number
  delayMinutes: number
  sellers: number
}[] {
  assertProfile(medianDelay)
  assertProfile(sellersInGame)
  return bestSlots(week, length, count).map((slot, i) => ({
    rank: i + 1,
    day: slot.day,
    title: `${DAY_NAMES[slot.day] ?? ''} · ${formatHourRange(slot.start, slot.end)}`,
    vsAverage: slot.vsAverage,
    salesPerHour: Math.round(slot.average),
    delayMinutes: rangeAverage(medianDelay, slot.start, slot.end),
    sellers: Math.round(rangeAverage(sellersInGame, slot.start, slot.end))
  }))
}

/** 6.4 → "6× moins de ventes qu'au pic" */
export function formatPeakRatio(ratioToPeak: number): string {
  if (ratioToPeak === Number.POSITIVE_INFINITY) return 'Aucune vente à ces heures'
  if (!(ratioToPeak >= 1) || !Number.isFinite(ratioToPeak)) {
    throw new RangeError(`Invalid ratio to peak: ${String(ratioToPeak)}`)
  }
  return `${String(Math.round(ratioToPeak))}× moins de ventes qu'au pic`
}

function assertDayCount(days: number): void {
  if (!Number.isInteger(days) || days < 0) {
    throw new RangeError(`Invalid number of days: ${String(days)}`)
  }
}

/** Progress of the snapshot collection, capped at 100 %. */
export function collectionProgress(
  collected: number,
  needed: number
): { ratio: number; label: string } {
  assertDayCount(collected)
  assertDayCount(needed)
  return {
    ratio: needed === 0 ? 1 : Math.min(1, collected / needed),
    label: `${String(collected)} jour${collected > 1 ? 's' : ''} sur ${String(needed)}`
  }
}

/** Where the averages of the screen come from, for the card descriptions. */
export function averageLabel(daysCollected: number): string {
  assertDayCount(daysCollected)
  if (daysCollected === 0) return 'aucun jour relevé pour le moment'
  if (daysCollected === 1) return 'moyenne du seul jour relevé'
  return `moyenne des ${String(daysCollected)} jours relevés`
}
