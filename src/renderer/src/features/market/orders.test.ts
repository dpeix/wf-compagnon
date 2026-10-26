import { describe, expect, it } from 'vitest'
import {
  bestPrice,
  countAtBestPrice,
  countInGame,
  priceSpread,
  sortOrders,
  suggestSellPrice,
  whisperMessage
} from './orders'
import type { MarketOrder } from './types'

let nextId = 0
function order(
  side: MarketOrder['side'],
  user: string,
  price: number,
  status: MarketOrder['status'] = 'ingame'
): MarketOrder {
  nextId += 1
  return { id: String(nextId), side, user, status, reputation: 10, price, quantity: 1 }
}

const orders = [
  order('sell', 'Online_Cheap', 200, 'online'),
  order('sell', 'Ingame_Mid', 212),
  order('sell', 'Ingame_Low', 210),
  order('sell', 'Offline_Cheapest', 150, 'offline'),
  order('buy', 'Buyer_Low', 180),
  order('buy', 'Buyer_High', 195),
  order('buy', 'Buyer_Online', 199, 'online')
]

describe('sortOrders', () => {
  it('lists sellers in game first, then by lowest price', () => {
    expect(sortOrders(orders, 'sell', false).map((o) => o.user)).toEqual([
      'Ingame_Low',
      'Ingame_Mid',
      'Online_Cheap',
      'Offline_Cheapest'
    ])
  })

  it('lists buyers in game first, then by highest price', () => {
    expect(sortOrders(orders, 'buy', false).map((o) => o.user)).toEqual([
      'Buyer_High',
      'Buyer_Low',
      'Buyer_Online'
    ])
  })

  it('can keep only players in game', () => {
    expect(sortOrders(orders, 'sell', true).map((o) => o.user)).toEqual([
      'Ingame_Low',
      'Ingame_Mid'
    ])
  })

  it('does not reorder the list it receives', () => {
    const copy = [...orders]
    sortOrders(orders, 'sell', false)
    expect(orders).toEqual(copy)
  })

  it('puts the best reputation first between equal prices', () => {
    const tied = [
      { ...order('sell', 'Newcomer', 210), reputation: 3 },
      { ...order('sell', 'Veteran', 210), reputation: 400 }
    ]
    expect(sortOrders(tied, 'sell', true).map((o) => o.user)).toEqual(['Veteran', 'Newcomer'])
  })
})

describe('countInGame', () => {
  it('counts the players in game on one side', () => {
    expect(countInGame(orders, 'sell')).toBe(2)
    expect(countInGame(orders, 'buy')).toBe(2)
  })

  it('is zero when nobody is in game', () => {
    expect(countInGame([order('sell', 'Away', 100, 'offline')], 'sell')).toBe(0)
  })
})

describe('countAtBestPrice', () => {
  it('counts the sellers in game at the lowest price', () => {
    const tied = [order('sell', 'A', 210), order('sell', 'B', 210), order('sell', 'C', 215)]
    expect(countAtBestPrice(tied, 'sell')).toBe(2)
  })

  it('is zero without anyone in game on that side', () => {
    expect(countAtBestPrice([], 'sell')).toBe(0)
  })
})

describe('bestPrice', () => {
  it('is the lowest sell price among players in game', () => {
    expect(bestPrice(orders, 'sell')).toBe(210)
  })

  it('is the highest buy price among players in game', () => {
    expect(bestPrice(orders, 'buy')).toBe(195)
  })

  it('is null when nobody is in game on that side', () => {
    expect(bestPrice([order('sell', 'Away', 100, 'offline')], 'sell')).toBeNull()
    expect(bestPrice([], 'buy')).toBeNull()
  })
})

describe('suggestSellPrice', () => {
  it('undercuts the cheapest seller in game by 1 platinum', () => {
    expect(suggestSellPrice(orders)).toBe(209)
  })

  it('never goes down to the best buy price or below', () => {
    const tight = [order('sell', 'Seller', 196), order('buy', 'Buyer', 195)]
    expect(suggestSellPrice(tight)).toBe(196)
  })

  it('sells straight to the buyer when a buyer pays more than the cheapest seller', () => {
    const crossed = [order('sell', 'Seller', 196), order('buy', 'Generous', 199)]
    expect(suggestSellPrice(crossed)).toBe(199)
  })

  it('never suggests less than 1 platinum', () => {
    expect(suggestSellPrice([order('sell', 'Seller', 1)])).toBe(1)
  })

  it('has no suggestion without any seller in game', () => {
    expect(suggestSellPrice([order('sell', 'Away', 100, 'offline')])).toBeNull()
  })
})

describe('priceSpread', () => {
  it('gives the gap between best sell and best buy, relative to the buy price', () => {
    const spread = priceSpread(210, 195)
    expect(spread?.amount).toBe(15)
    expect(spread?.ratio).toBeCloseTo(15 / 195)
  })

  it('is null when one side has no price', () => {
    expect(priceSpread(210, null)).toBeNull()
    expect(priceSpread(null, 195)).toBeNull()
  })

  it('is negative when a buyer pays more than the cheapest seller', () => {
    expect(priceSpread(190, 195)?.amount).toBe(-5)
  })

  it('is null for a buy price of zero', () => {
    expect(priceSpread(10, 0)).toBeNull()
  })
})

describe('whisperMessage', () => {
  it('asks a seller to buy their item', () => {
    expect(whisperMessage(order('sell', 'Kaze_Tenno', 210), 'Ash Prime Set')).toBe(
      '/w Kaze_Tenno Hi! I want to buy: "Ash Prime Set" for 210 platinum. (warframe.market)'
    )
  })

  it('offers a buyer to sell them the item', () => {
    expect(whisperMessage(order('buy', 'Buyer_High', 195), 'Ash Prime Set')).toBe(
      '/w Buyer_High Hi! I want to sell: "Ash Prime Set" for 195 platinum. (warframe.market)'
    )
  })
})
