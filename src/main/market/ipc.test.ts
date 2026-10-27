import { describe, expect, it } from 'vitest'
import { MARKET_CHANNELS, type ItemDetail, type MarketOverviewData } from '../../shared/market'
import { registerMarketIpc, type IpcHandle } from './ipc'

type Handler = (event: unknown, ...args: unknown[]) => unknown

function fakeIpc(): IpcHandle & { handlers: Map<string, Handler> } {
  const handlers = new Map<string, Handler>()
  return {
    handlers,
    handle: (channel, listener) => {
      handlers.set(channel, listener)
    }
  }
}

// Opaque test doubles: the handlers pass them through without reading them, so a partial
// object cast to the full type is enough to check that the right one comes back
const overview = { items: [], failed: [] } as unknown as MarketOverviewData
const detail = { slug: 'ash_prime_set' } as unknown as ItemDetail

function setup(): { call: (channel: string, ...args: unknown[]) => unknown; asked: string[] } {
  const ipc = fakeIpc()
  const asked: string[] = []
  registerMarketIpc(ipc, {
    getOverview: (fresh) => {
      asked.push(`overview fresh=${String(fresh)}`)
      return Promise.resolve(overview)
    },
    getItemDetail: (slug, fresh) => {
      asked.push(`${slug} fresh=${String(fresh)}`)
      return Promise.resolve(detail)
    }
  })
  return {
    asked,
    call: (channel, ...args) => {
      const handler = ipc.handlers.get(channel)
      if (!handler) throw new Error(`No handler for ${channel}`)
      return handler({}, ...args)
    }
  }
}

describe('registerMarketIpc', () => {
  it('answers the overview request, from the cache unless a refresh is asked for', async () => {
    const { call, asked } = setup()
    await expect(call(MARKET_CHANNELS.overview)).resolves.toBe(overview)
    await expect(call(MARKET_CHANNELS.overview, true)).resolves.toBe(overview)
    expect(asked).toEqual(['overview fresh=false', 'overview fresh=true'])
  })

  it('answers an item request with a valid slug', async () => {
    const { call, asked } = setup()
    await expect(call(MARKET_CHANNELS.item, 'ash_prime_set')).resolves.toBe(detail)
    await expect(call(MARKET_CHANNELS.item, 'ash_prime_set', true)).resolves.toBe(detail)
    expect(asked).toEqual(['ash_prime_set fresh=false', 'ash_prime_set fresh=true'])
  })

  it('rejects an item request whose argument is not a valid slug', async () => {
    const { call, asked } = setup()
    await expect(call(MARKET_CHANNELS.item, '../../etc')).rejects.toThrow(RangeError)
    await expect(call(MARKET_CHANNELS.item, 42)).rejects.toThrow(RangeError)
    await expect(call(MARKET_CHANNELS.item)).rejects.toThrow(RangeError)
    expect(asked).toEqual([])
  })

  it('rejects a refresh flag that is not a boolean', async () => {
    const { call, asked } = setup()
    await expect(call(MARKET_CHANNELS.overview, 'yes')).rejects.toThrow(RangeError)
    await expect(call(MARKET_CHANNELS.item, 'ash_prime_set', 1)).rejects.toThrow(RangeError)
    expect(asked).toEqual([])
  })
})
