// Helpers for the screens fed by warframe.market (overview and item screen).
import { bestWindow, formatHourRange } from './best-hours'
import type { DatedPricePoint } from './types'

const NBSP = ' '
const BEST_HOURS_LENGTH = 2

const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** The 2 busiest consecutive hours of the recent sales, e.g. "20 h – 22 h"; null without sales. */
export function bestHoursFromHistory(hourly: readonly DatedPricePoint[]): string | null {
  const profile = Array.from({ length: 24 }, () => 0)
  for (const point of hourly) {
    const hour = point.date.getHours()
    profile[hour] = (profile[hour] ?? 0) + point.volume
  }
  if (profile.every((v) => v === 0)) return null
  const best = bestWindow(profile, BEST_HOURS_LENGTH)
  return formatHourRange(best.start, best.end)
}

/** "à l'instant", "il y a 7 min", "à 09:05" */
export function formatUpdatedAt(fetchedAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - fetchedAt.getTime()) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${String(minutes)}${NBSP}min`
  return `à ${timeFormat.format(fetchedAt)}`
}

/** Notice about the tracked items that could not be loaded; null when all of them loaded. */
export function failedItemsMessage(names: readonly string[]): string | null {
  if (names.length === 0) return null
  const subject =
    names.length > 1
      ? `${String(names.length)} objets suivis n'ont pas pu être chargés ou n'ont aucun prix`
      : "1 objet suivi n'a pas pu être chargé ou n'a aucun prix"
  return `${subject} : ${names.join(', ')}.`
}

/**
 * Lines of the set/parts comparison: a part the set needs twice counts twice
 * ("Dual Kamas Prime Blade ×2" at 2 × its price).
 */
export function partsForComparison(
  parts: readonly { name: string; quantity: number; price: number }[]
): { name: string; price: number }[] {
  return parts.map((part) => ({
    name: part.quantity > 1 ? `${part.name} ×${String(part.quantity)}` : part.name,
    price: part.price * part.quantity
  }))
}

const DAY = 24 * 3_600_000

/**
 * Points of the last `days` days, up to the latest one (oldest first). Days without any sale
 * have no point: counting points instead of days would reach further back.
 */
export function lastDays<P extends { date: Date }>(points: readonly P[], days: number): P[] {
  if (points.length === 0) return []
  const latest = Math.max(...points.map((p) => p.date.getTime()))
  const from = latest - days * DAY
  return points.filter((p) => p.date.getTime() >= from)
}

const GENERIC_ERROR = 'Impossible de charger les données de warframe.market.'

/** French explanation of a failed load (errors come from src/main/market through IPC). */
export function describeLoadError(error: unknown): string {
  if (!(error instanceof Error)) return GENERIC_ERROR
  const message = error.message
  if (message.includes('unreachable')) {
    return 'warframe.market ne répond pas. Vérifiez votre connexion puis réessayez.'
  }
  if (message.includes('HTTP 429')) {
    return 'warframe.market reçoit trop de demandes. Réessayez dans un instant.'
  }
  if (message.includes('HTTP 404')) return "Cet objet n'existe pas sur warframe.market."
  if (message.includes('Unexpected warframe.market answer')) {
    return "warframe.market a renvoyé des données inattendues : l'API a peut-être changé."
  }
  // The main process message is already in French: keep it, without the IPC prefix
  const tracked = /Aucun objet suivi.*$/.exec(message)
  if (tracked) return `${tracked[0].replace(/\.$/, '')}.`
  return GENERIC_ERROR
}
