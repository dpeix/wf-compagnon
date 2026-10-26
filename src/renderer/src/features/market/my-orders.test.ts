import { describe, expect, it } from 'vitest'
import {
  adviceFor,
  adviceList,
  bestCompetitorPrice,
  formatCountWord,
  formatRank,
  peakReminder,
  formatWatchRule,
  minutesUntilHour,
  orderRank,
  portfolioSummary,
  rankTone,
  salesSummary,
  suggestAdjustment,
  watchStatus
} from './my-orders'
import type { MyOrder } from './types'

const NBSP = ' '
// Thousands separator produced by Intl fr-FR
const NNBSP = ' '

function myOrder(price: number, competitors: number[], overrides: Partial<MyOrder> = {}): MyOrder {
  return {
    id: 'o1',
    itemName: 'Ash Prime Set',
    side: 'sell',
    price,
    quantity: 1,
    visible: true,
    competitors,
    opposite: null,
    ...overrides
  }
}

describe('orderRank', () => {
  it('counts the sellers in game who are cheaper', () => {
    expect(orderRank(myOrder(215, [210, 210, 212, 220]))).toEqual({
      position: 4,
      tied: 0,
      total: 5
    })
  })

  it('notes the sellers at the same price', () => {
    expect(orderRank(myOrder(150, [150, 155]))).toEqual({ position: 1, tied: 1, total: 3 })
  })

  it('ranks buy orders by the highest price', () => {
    expect(orderRank(myOrder(25, [27, 26, 24], { side: 'buy' }))).toEqual({
      position: 3,
      tied: 0,
      total: 4
    })
  })

  it('puts me first when nobody else is in game', () => {
    expect(orderRank(myOrder(40, []))).toEqual({ position: 1, tied: 0, total: 1 })
  })
})

describe('bestCompetitorPrice', () => {
  it('is the lowest other sell price or the highest other buy price', () => {
    expect(bestCompetitorPrice(myOrder(215, [212, 210, 220]))).toBe(210)
    expect(bestCompetitorPrice(myOrder(25, [24, 27], { side: 'buy' }))).toBe(27)
  })

  it('is null without competition', () => {
    expect(bestCompetitorPrice(myOrder(40, []))).toBeNull()
  })
})

describe('formatRank', () => {
  it('writes French ordinals', () => {
    expect(formatRank({ position: 1, tied: 0, total: 6 })).toBe('1er')
    expect(formatRank({ position: 4, tied: 0, total: 13 })).toBe('4e sur 13')
  })

  it('mentions a tie', () => {
    expect(formatRank({ position: 1, tied: 1, total: 3 })).toBe('1er ex æquo')
    expect(formatRank({ position: 3, tied: 2, total: 9 })).toBe('3e ex æquo sur 9')
  })

  it('rejects an impossible rank', () => {
    expect(() => formatRank({ position: 0, tied: 0, total: 3 })).toThrow(RangeError)
    expect(() => formatRank({ position: 5, tied: 0, total: 3 })).toThrow(RangeError)
  })
})

describe('rankTone', () => {
  it('is good in first place, medium up to third, bad below', () => {
    expect(rankTone({ position: 1, tied: 0, total: 5 })).toBe('good')
    expect(rankTone({ position: 3, tied: 0, total: 5 })).toBe('medium')
    expect(rankTone({ position: 4, tied: 0, total: 5 })).toBe('bad')
  })
})

describe('suggestAdjustment', () => {
  it('lowers a sell order to 1 platinum under the cheapest seller', () => {
    expect(suggestAdjustment(myOrder(215, [210, 212]))).toEqual({ kind: 'lower', price: 209 })
  })

  it('raises a sell order that leaves platinum on the table', () => {
    expect(suggestAdjustment(myOrder(140, [165, 168]))).toEqual({ kind: 'raise', price: 164 })
  })

  it('suggests nothing when already just under or level with the cheapest seller', () => {
    expect(suggestAdjustment(myOrder(52, [53, 55]))).toBeNull()
    expect(suggestAdjustment(myOrder(150, [150, 155]))).toBeNull()
  })

  it('suggests nothing without competition', () => {
    expect(suggestAdjustment(myOrder(40, []))).toBeNull()
  })

  it('raises a buy order to 1 platinum above the best buyer', () => {
    expect(suggestAdjustment(myOrder(25, [27, 24], { side: 'buy' }))).toEqual({
      kind: 'raise',
      price: 28
    })
  })

  it('lowers a buy order that pays more than needed', () => {
    expect(suggestAdjustment(myOrder(40, [30], { side: 'buy' }))).toEqual({
      kind: 'lower',
      price: 31
    })
  })

  it('never suggests less than 1 platinum', () => {
    expect(suggestAdjustment(myOrder(3, [1]))).toEqual({ kind: 'lower', price: 1 })
  })
})

describe('portfolioSummary', () => {
  const orders = [
    myOrder(215, [210], { id: 'a', quantity: 1 }),
    myOrder(52, [53], { id: 'b', quantity: 3 }),
    myOrder(34, [33], { id: 'c', quantity: 2, visible: false }),
    myOrder(25, [27], { id: 'd', side: 'buy' })
  ]

  it('sums up my visible sell orders', () => {
    expect(portfolioSummary(orders)).toEqual({
      visibleSell: 2,
      hiddenSell: 1,
      sellValue: 215 + 52 * 3,
      leading: 1,
      toAdjust: 1
    })
  })

  it('is all zeros without orders', () => {
    expect(portfolioSummary([])).toEqual({
      visibleSell: 0,
      hiddenSell: 0,
      sellValue: 0,
      leading: 0,
      toAdjust: 0
    })
  })
})

describe('watch rules', () => {
  it('reports a price that crossed the threshold', () => {
    expect(watchStatus({ direction: 'below', threshold: 30 }, 28)).toBe('reached')
    expect(watchStatus({ direction: 'below', threshold: 30 }, 30)).toBe('reached')
    expect(watchStatus({ direction: 'above', threshold: 30 }, 26)).toBe('waiting')
    expect(watchStatus({ direction: 'above', threshold: 30 }, 31)).toBe('reached')
  })

  it('writes the rule for the list', () => {
    expect(formatWatchRule({ direction: 'below', threshold: 30 })).toBe(`Alerte si ≤ 30${NBSP}p`)
    expect(formatWatchRule({ direction: 'above', threshold: 1200 })).toBe(
      `Alerte si ≥ 1${NNBSP}200${NBSP}p`
    )
  })

  it('rejects a threshold that is not a positive number', () => {
    expect(() => watchStatus({ direction: 'below', threshold: -1 }, 10)).toThrow(RangeError)
    expect(() => watchStatus({ direction: 'below', threshold: 10 }, Number.NaN)).toThrow(RangeError)
  })
})

describe('adviceFor', () => {
  it('tells a seller who is not first how to take the lead', () => {
    expect(adviceFor(myOrder(215, [210, 210, 212]))).toEqual({
      tone: 'bad',
      title: 'Ash Prime Set : 4e place',
      description: `3 vendeurs en jeu sont moins chers. À 209${NBSP}p, vous passez en tête.`,
      action: { kind: 'price', price: 209, label: `Passer à 209${NBSP}p` }
    })
  })

  it('uses the singular for a single better player', () => {
    expect(adviceFor(myOrder(215, [210]))?.description).toBe(
      `1 vendeur en jeu est moins cher. À 209${NBSP}p, vous passez en tête.`
    )
    expect(adviceFor(myOrder(25, [27, 24], { side: 'buy' }))).toMatchObject({
      tone: 'medium',
      title: 'Ash Prime Set : 2e place',
      description: `1 acheteur en jeu offre plus. À 28${NBSP}p, vous passez en tête.`
    })
  })

  it('tells a leading seller they can ask for more', () => {
    expect(adviceFor(myOrder(140, [165]))).toMatchObject({
      tone: 'medium',
      title: `Ash Prime Set : vous laissez 24${NBSP}p`,
      action: { kind: 'price', price: 164 }
    })
  })

  it('reminds that a hidden order sells nothing', () => {
    expect(adviceFor(myOrder(52, [53], { visible: false }))).toMatchObject({
      tone: 'neutral',
      title: 'Ordre masqué : Ash Prime Set',
      description: "Personne ne voit cet ordre : il ne peut pas se vendre tant qu'il est masqué.",
      action: { kind: 'show', label: 'Rendre visible' }
    })
  })

  it('reminds that a hidden buy order buys nothing', () => {
    expect(adviceFor(myOrder(25, [27], { side: 'buy', visible: false }))?.description).toBe(
      "Personne ne voit cet ordre : aucun vendeur ne peut vous répondre tant qu'il est masqué."
    )
  })

  it('tells a leading buyer they pay too much', () => {
    expect(adviceFor(myOrder(40, [30], { side: 'buy' }))).toMatchObject({
      tone: 'medium',
      title: `Ash Prime Set : vous payez 9${NBSP}p de trop`,
      action: { kind: 'price', price: 31 }
    })
  })

  it('has nothing to say about a well placed visible order', () => {
    expect(adviceFor(myOrder(52, [53]))).toBeNull()
  })
})

describe('salesSummary', () => {
  it('adds up the sales and averages the delay', () => {
    expect(
      salesSummary([
        { price: 100, quantity: 2, delayMinutes: 30 },
        { price: 50, quantity: 1, delayMinutes: 60 }
      ])
    ).toEqual({ count: 2, platinum: 250, averageDelay: 45 })
  })

  it('has no average delay without sales', () => {
    expect(salesSummary([])).toEqual({ count: 0, platinum: 0, averageDelay: null })
  })
})

describe('minutesUntilHour', () => {
  it('counts the minutes until the next time that hour starts', () => {
    expect(minutesUntilHour(new Date(2026, 9, 26, 19, 20), 21)).toBe(100)
  })

  it('goes to the next day when the hour has passed', () => {
    expect(minutesUntilHour(new Date(2026, 9, 26, 22, 0), 21)).toBe(23 * 60)
  })

  it('is zero during that hour', () => {
    expect(minutesUntilHour(new Date(2026, 9, 26, 21, 45), 21)).toBe(0)
  })

  it('rejects an hour outside 0–23', () => {
    expect(() => minutesUntilHour(new Date(), 24)).toThrow(RangeError)
  })

  it('crosses midnight', () => {
    expect(minutesUntilHour(new Date(2026, 9, 26, 23, 30), 0)).toBe(30)
  })

  it('rounds to the nearest minute', () => {
    expect(minutesUntilHour(new Date(2026, 9, 26, 19, 20, 40), 21)).toBe(99)
  })
})

describe('suggestAdjustment at the edges', () => {
  it('lowers to 1 platinum when the best seller is already at 1', () => {
    expect(suggestAdjustment(myOrder(2, [1]))).toEqual({ kind: 'lower', price: 1 })
  })

  it('never sells at or under the best buyer in game', () => {
    expect(suggestAdjustment(myOrder(215, [210], { opposite: 209 }))).toEqual({
      kind: 'lower',
      price: 210
    })
  })

  it('sells straight to a buyer who pays more than the cheapest seller', () => {
    expect(suggestAdjustment(myOrder(215, [210], { opposite: 212 }))).toEqual({
      kind: 'lower',
      price: 212
    })
  })

  it('never buys at or over the cheapest seller in game', () => {
    expect(suggestAdjustment(myOrder(25, [27], { side: 'buy', opposite: 28 }))).toEqual({
      kind: 'raise',
      price: 27
    })
  })

  it('buys straight from a seller who asks less than the best buyer', () => {
    expect(suggestAdjustment(myOrder(25, [27], { side: 'buy', opposite: 26 }))).toEqual({
      kind: 'raise',
      price: 26
    })
  })

  it('rejects an order with an invalid price or quantity', () => {
    expect(() => suggestAdjustment(myOrder(Number.NaN, [10]))).toThrow(RangeError)
    expect(() => orderRank(myOrder(10, [-3]))).toThrow(RangeError)
    expect(() => orderRank(myOrder(10, [12], { quantity: 0 }))).toThrow(RangeError)
  })
})

describe('salesSummary checks', () => {
  it('rejects a negative delay or price', () => {
    expect(() => salesSummary([{ price: 10, quantity: 1, delayMinutes: -5 }])).toThrow(RangeError)
    expect(() => salesSummary([{ price: -10, quantity: 1, delayMinutes: 5 }])).toThrow(RangeError)
  })
})

describe('adviceList', () => {
  const orders = [
    myOrder(52, [53], { id: 'fine' }),
    myOrder(52, [53], { id: 'hidden', visible: false }),
    myOrder(140, [165], { id: 'margin' }),
    myOrder(215, [210, 210, 212], { id: 'fourth' }),
    myOrder(40, [38, 39], { id: 'third' })
  ]

  it('lists the advice, the most urgent first, and counts what does not fit', () => {
    const { items, more } = adviceList(orders, 3)
    expect(items.map((i) => i.orderId)).toEqual(['fourth', 'third', 'margin'])
    expect(more).toBe(1)
  })

  it('has nothing to list when every order is fine', () => {
    expect(adviceList([myOrder(52, [53])], 3)).toEqual({ items: [], more: 0 })
  })

  it('rejects a limit under 1', () => {
    expect(() => adviceList(orders, 0)).toThrow(RangeError)
  })
})

describe('peakReminder', () => {
  it('counts down to the peak', () => {
    expect(peakReminder(new Date(2026, 9, 26, 19, 20), 21)).toBe(
      `Pic d'activité dans 1${NBSP}h${NBSP}40 : mettez vos prix à jour avant 21${NBSP}h.`
    )
  })

  it('says when the peak is now', () => {
    expect(peakReminder(new Date(2026, 9, 26, 21, 10), 21)).toBe(
      "C'est l'heure de pointe : vos ordres visibles ont le plus de chances de partir."
    )
  })
})

describe('formatCountWord', () => {
  it('agrees the word with the count', () => {
    expect(formatCountWord(1, 'vente')).toBe('1 vente')
    expect(formatCountWord(12, 'vente')).toBe('12 ventes')
    expect(formatCountWord(0, 'masqué')).toBe('0 masqué')
    expect(formatCountWord(2, 'œil', 'yeux')).toBe('2 yeux')
  })

  it('rejects a negative or fractional count', () => {
    expect(() => formatCountWord(-1, 'vente')).toThrow(RangeError)
  })
})
