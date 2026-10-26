import type { MarketEvent, MarketItemSummary, PlayersSummary } from './types'

// Example data from the Figma mockup, shown until the warframe.market client exists (plan.md, sprint 3).
// Prices are plausible but invented: the UI labels them as examples.

const NBSP = ' '

/** Builds an item whose price and 7-day change follow its price history. */
function sample(
  name: string,
  sales24h: number,
  sellersInGame: number,
  history7d: [number, ...number[]]
): MarketItemSummary {
  const first = history7d[0]
  const price = history7d.at(-1) ?? first
  return {
    slug: name.toLowerCase().replaceAll(' ', '_'),
    name,
    price,
    change7d: price / first - 1,
    sales24h,
    sellersInGame,
    history7d
  }
}

export const sampleItems: readonly MarketItemSummary[] = [
  sample('Nekros Prime Set', 64, 61, [72, 74, 73, 77, 79, 82, 85]),
  sample('Arcane Energize', 312, 134, [47, 47, 48, 49, 50, 51, 52]),
  sample('Primed Shred', 96, 38, [35, 35, 35, 36, 36, 37, 38]),
  sample('Wisp Prime Set', 41, 47, [138, 140, 139, 143, 146, 148, 150]),
  sample('Galvanized Aptitude', 120, 52, [31, 32, 31, 32, 33, 33, 34]),
  sample('Khora Prime Set', 38, 29, [159, 160, 162, 161, 163, 164, 165]),
  sample('Galvanized Chamber', 288, 77, [17, 18, 17, 18, 18, 17, 18]),
  sample('Primed Flow', 140, 81, [21, 21, 21, 20, 21, 21, 21]),
  sample('Primed Continuity', 241, 64, [27, 26, 27, 26, 26, 26, 26]),
  sample('Saryn Prime Set', 52, 43, [125, 124, 122, 121, 120, 119, 118]),
  sample('Ember Prime Set', 176, 66, [66, 65, 65, 64, 63, 62, 62]),
  sample('Arcane Grace', 73, 58, [30, 30, 29, 29, 28, 28, 28]),
  sample('Rhino Prime Set', 87, 74, [37, 37, 36, 35, 35, 34, 34]),
  sample('Ash Prime Set', 198, 89, [240, 236, 231, 224, 219, 214, 210])
]

/** Usual sales per hour (0–23 h), Paris time: quiet mornings, evening peak. */
export const sampleHourlySales: readonly number[] = [
  38, 30, 22, 16, 11, 9, 10, 14, 20, 27, 33, 38, 44, 48, 50, 53, 58, 66, 75, 86, 94, 100, 82, 55
]

export const samplePlayers: PlayersSummary = { inGame: 3284, changeVsYesterday: 0.05 }

export const sampleSalesChangeVsYesterday = 0.12

export const sampleEvents: readonly MarketEvent[] = [
  {
    id: 'prime-resurgence-nekros',
    title: 'Prime Resurgence',
    description: `Nekros Prime revient le 3${NBSP}nov.${NBSP}: baisse attendue de ses pièces`,
    when: `Dans 8${NBSP}j`,
    tone: 'danger'
  },
  {
    id: 'baro-ki-teer',
    title: "Baro Ki'Teer",
    description: 'Arrive au relais Strata (Terre) avec Primed Shred',
    when: `Dans 2${NBSP}j`,
    tone: 'gold'
  },
  {
    id: 'relic-rotation',
    title: 'Nouvelles reliques',
    description: 'Rotation Axi/Neo ajoutée cette semaine',
    when: 'Actif',
    tone: 'neutral'
  },
  {
    id: 'update-39-1',
    title: 'Mise à jour 39.1',
    description: "Changement des drops d'Arcanes Cavia",
    when: `Il y a 3${NBSP}j`,
    tone: 'neutral'
  }
]
