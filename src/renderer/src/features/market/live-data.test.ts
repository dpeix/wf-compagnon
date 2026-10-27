import { describe, expect, it } from 'vitest'
import {
  bestHoursFromHistory,
  describeLoadError,
  failedItemsMessage,
  formatUpdatedAt,
  lastDays,
  partsForComparison
} from './live-data'
import type { DatedPricePoint } from './types'

describe('failedItemsMessage', () => {
  it('names the items that could not be loaded, singular or plural', () => {
    expect(failedItemsMessage(['Primed Flow'])).toBe(
      "1 objet suivi n'a pas pu être chargé ou n'a aucun prix : Primed Flow."
    )
    expect(failedItemsMessage(['A', 'B'])).toBe(
      "2 objets suivis n'ont pas pu être chargés ou n'ont aucun prix : A, B."
    )
  })

  it('has nothing to say when everything loaded', () => {
    expect(failedItemsMessage([])).toBeNull()
  })
})

describe('partsForComparison', () => {
  it('counts a part as many times as the set needs it', () => {
    expect(
      partsForComparison([
        { name: 'Dual Kamas Prime Blade', quantity: 2, price: 15 },
        { name: 'Dual Kamas Prime Blueprint', quantity: 1, price: 10 }
      ])
    ).toEqual([
      { name: 'Dual Kamas Prime Blade ×2', price: 30 },
      { name: 'Dual Kamas Prime Blueprint', price: 10 }
    ])
  })
})

describe('lastDays', () => {
  const at = (day: number): { date: Date } => ({ date: new Date(2026, 9, day, 12) })

  it('keeps the points of the last 7 days, even when some days had no sale', () => {
    expect(lastDays([at(5), at(17), at(19), at(25)], 7).map((p) => p.date.getDate())).toEqual([
      19, 25
    ])
  })

  it('has nothing without points', () => {
    expect(lastDays([], 7)).toEqual([])
  })
})

const NBSP = ' '

function point(day: number, hour: number, volume: number): DatedPricePoint {
  return { date: new Date(2026, 9, day, hour), avg: 60, min: 55, max: 65, volume }
}

describe('bestHoursFromHistory', () => {
  it('finds the 2 busiest consecutive hours of the recent sales', () => {
    const hourly = [
      point(25, 9, 1),
      point(25, 20, 5),
      point(25, 21, 4),
      point(26, 20, 3),
      point(26, 3, 2)
    ]
    expect(bestHoursFromHistory(hourly)).toBe(`20${NBSP}h – 22${NBSP}h`)
  })

  it('has nothing to say without any sale', () => {
    expect(bestHoursFromHistory([])).toBeNull()
    expect(bestHoursFromHistory([point(26, 12, 0)])).toBeNull()
  })
})

describe('formatUpdatedAt', () => {
  const now = new Date(2026, 9, 26, 21, 42, 30)

  it('says "just now" under a minute', () => {
    expect(formatUpdatedAt(new Date(2026, 9, 26, 21, 42, 0), now)).toBe("à l'instant")
  })

  it('counts the minutes under an hour', () => {
    expect(formatUpdatedAt(new Date(2026, 9, 26, 21, 35, 0), now)).toBe(`il y a 7${NBSP}min`)
  })

  it('gives the time after an hour', () => {
    expect(formatUpdatedAt(new Date(2026, 9, 26, 9, 5, 0), now)).toBe('à 09:05')
  })

  it('treats a date in the future as just now', () => {
    expect(formatUpdatedAt(new Date(2026, 9, 26, 21, 50, 0), now)).toBe("à l'instant")
  })
})

describe('describeLoadError', () => {
  it('explains each kind of failure in French', () => {
    expect(
      describeLoadError(new Error('warframe.market unreachable (fetch failed) for https://x'))
    ).toBe('warframe.market ne répond pas. Vérifiez votre connexion puis réessayez.')
    expect(describeLoadError(new Error('warframe.market HTTP 429 for https://x'))).toBe(
      'warframe.market reçoit trop de demandes. Réessayez dans un instant.'
    )
    expect(describeLoadError(new Error('warframe.market HTTP 404 for https://x'))).toBe(
      "Cet objet n'existe pas sur warframe.market."
    )
    expect(
      describeLoadError(new Error('Unexpected warframe.market answer for the orders: x'))
    ).toBe("warframe.market a renvoyé des données inattendues : l'API a peut-être changé.")
  })

  it('keeps the French message of the main process', () => {
    // ipcRenderer.invoke prefixes the message with the channel name
    const error = new Error(
      "Error invoking remote method 'market:get-overview': Error: Aucun objet suivi n'a pu être chargé depuis warframe.market"
    )
    expect(describeLoadError(error)).toBe(
      "Aucun objet suivi n'a pu être chargé depuis warframe.market."
    )
  })

  it('falls back to a general message', () => {
    expect(describeLoadError(new Error('something else'))).toBe(
      'Impossible de charger les données de warframe.market.'
    )
    expect(describeLoadError('not even an error')).toBe(
      'Impossible de charger les données de warframe.market.'
    )
  })
})
