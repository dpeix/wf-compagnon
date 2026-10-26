import type { DatedPricePoint, ItemDetail, MarketOrder } from './types'

// Example item from the Figma mockup ("Fiche objet"), shown until the warframe.market client exists.
// The price history is generated from smooth curves so the chart looks like a real one.

const NBSP = ' '
const HOUR = 3_600_000

// Usual sales per hour of the day (same shape as the overview sample)
const HOURLY_SHAPE = [
  38, 30, 22, 16, 11, 9, 10, 14, 20, 27, 33, 38, 44, 48, 50, 53, 58, 66, 75, 86, 94, 100, 82, 55
]

function point(
  date: Date,
  avg: number,
  spreadDown: number,
  spreadUp: number,
  volume: number
): DatedPricePoint {
  return {
    date,
    avg: Math.round(avg),
    min: Math.round(avg - spreadDown),
    max: Math.round(avg + spreadUp),
    volume: Math.max(0, Math.round(volume))
  }
}

/** 91 daily points (90 days of change) drifting from ~242 p down to ~210 p, busier on weekends. */
function dailyHistory(now: Date): DatedPricePoint[] {
  return Array.from({ length: 91 }, (_, i) => {
    // Calendar arithmetic rather than 24 h steps, so daylight saving changes keep midnight
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (90 - i))
    const avg = 242 - 32 * (i / 90) + 7 * Math.sin(i / 5) + 3 * Math.sin(i * 1.7)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const volume = 120 + 60 * Math.sin(i / 6) + (weekend ? 40 : 0) + 15 * Math.cos(i * 1.3)
    return point(
      date,
      avg,
      10 + 4 * Math.abs(Math.sin(i / 3)),
      12 + 6 * Math.abs(Math.cos(i / 4)),
      volume
    )
  })
}

/** 49 hourly points (48 hours of change) around 212 p, with sales following the time of day. */
function hourlyHistory(now: Date): DatedPricePoint[] {
  const thisHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
  return Array.from({ length: 49 }, (_, i) => {
    const date = new Date(thisHour.getTime() - (48 - i) * HOUR)
    const avg = 216 - 6 * (i / 48) + 3 * Math.sin(i / 4)
    const volume = (HOURLY_SHAPE[date.getHours()] ?? 0) / 8
    return point(
      date,
      avg,
      4 + 2 * Math.abs(Math.sin(i)),
      5 + 3 * Math.abs(Math.cos(i / 2)),
      volume
    )
  })
}

function order(
  id: string,
  side: MarketOrder['side'],
  user: string,
  status: MarketOrder['status'],
  reputation: number,
  price: number,
  quantity = 1
): MarketOrder {
  return { id, side, user, status, reputation, price, quantity }
}

const orders: MarketOrder[] = [
  order('s1', 'sell', 'Kaze_Tenno', 'ingame', 412, 210),
  order('s2', 'sell', 'Orokin_Trader', 'ingame', 96, 210, 2),
  order('s3', 'sell', 'Lotus_Whisper', 'ingame', 1024, 212),
  order('s4', 'sell', 'VoidWalker_88', 'ingame', 18, 215, 3),
  order('s5', 'sell', 'Ordis_Fan', 'ingame', 151, 220),
  order('s6', 'sell', 'NyxMains', 'online', 233, 205),
  order('s7', 'sell', 'Darvo_Approves', 'online', 57, 218),
  order('s8', 'sell', 'Teshin_Disciple', 'offline', 340, 199),
  order('b1', 'buy', 'Simaris_Scan', 'ingame', 88, 195),
  order('b2', 'buy', 'Clem_Grineer', 'ingame', 12, 190),
  order('b3', 'buy', 'Cephalon_Cy', 'ingame', 205, 185, 2),
  order('b4', 'buy', 'Vor_Prime', 'online', 64, 198)
]

export function sampleItemDetail(now: Date): ItemDetail {
  return {
    slug: 'ash_prime_set',
    name: 'Ash Prime Set',
    category: 'Sets de Warframe',
    ducats: null,
    tags: ['Set de Warframe'],
    orders,
    hourly: hourlyHistory(now),
    daily: dailyHistory(now),
    parts: [
      { name: 'Ash Prime Blueprint', price: 28 },
      { name: 'Ash Prime Chassis', price: 52 },
      { name: 'Ash Prime Neuroptics', price: 71 },
      { name: 'Ash Prime Systems', price: 43 }
    ],
    bestHours: `19${NBSP}h – 22${NBSP}h, surtout le week-end`,
    saleChances: [
      { price: 200, chance: 0.96, delay: `moins de 15${NBSP}min` },
      { price: 209, chance: 0.82, delay: `environ 45${NBSP}min` },
      { price: 215, chance: 0.54, delay: `environ 3${NBSP}h` },
      { price: 225, chance: 0.21, delay: `plus de 12${NBSP}h` }
    ]
  }
}
