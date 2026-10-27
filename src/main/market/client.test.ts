import { describe, expect, it } from 'vitest'
import { MarketApiError, createMarketClient, type FetchLike } from './client'
import { MarketDataError } from './schemas'

interface Call {
  url: string
  headers: Record<string, string>
  signal: AbortSignal | undefined
}

/** Fake fetch answering from a list of responses, in order, and recording the calls. */
function fakeFetch(responses: (Response | Error)[]): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = []
  let index = 0
  const fetch: FetchLike = (url, init) => {
    calls.push({ url, headers: init.headers, signal: init.signal })
    const next = responses[index] ?? responses.at(-1)
    index += 1
    if (next instanceof Error) return Promise.reject(next)
    if (!next) return Promise.reject(new Error('No response prepared'))
    return Promise.resolve(next.clone())
  }
  return { fetch, calls }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const catalogBody = {
  data: [{ id: '1', slug: 'ash_prime_set', tags: ['set'], i18n: { en: { name: 'Ash Prime Set' } } }]
}
const topBody = { data: { sell: [], buy: [] } }

function client(responses: (Response | Error)[]): ReturnType<typeof fakeFetch> & {
  market: ReturnType<typeof createMarketClient>
  sleeps: number[]
  advance: (ms: number) => void
} {
  const fake = fakeFetch(responses)
  const sleeps: number[] = []
  let time = 0
  const market = createMarketClient({
    fetch: fake.fetch,
    now: () => time,
    sleep: (ms) => {
      sleeps.push(ms)
      time += ms
      return Promise.resolve()
    }
  })
  return {
    ...fake,
    market,
    sleeps,
    advance: (ms) => {
      time += ms
    }
  }
}

describe('createMarketClient', () => {
  it('calls the official API with the expected headers and a timeout', async () => {
    const { market, calls } = client([json(catalogBody)])
    await market.catalog()
    expect(calls[0]?.url).toBe('https://api.warframe.market/v2/items')
    expect(calls[0]?.headers).toMatchObject({ Platform: 'pc', Language: 'en' })
    expect(calls[0]?.headers['User-Agent']).toMatch(/^wf-compagnon\//)
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('builds the URLs of each endpoint', async () => {
    const { market, calls } = client([
      json(topBody),
      json(topBody),
      json({ data: { id: '1', items: catalogBody.data } })
    ])
    await market.topOrders('arcane_energize', 5)
    await market.topOrders('ash_prime_set', null)
    await market.itemSet('ash_prime_set')
    expect(calls.map((c) => c.url)).toEqual([
      'https://api.warframe.market/v2/orders/item/arcane_energize/top?rank=5',
      'https://api.warframe.market/v2/orders/item/ash_prime_set/top',
      'https://api.warframe.market/v2/item/ash_prime_set/set'
    ])
  })

  it('serves a cached answer instead of calling the API again, with its age', async () => {
    const { market, calls, advance } = client([json(catalogBody)])
    const first = await market.catalog()
    advance(5000)
    const second = await market.catalog()
    expect(calls).toHaveLength(1)
    expect(second.fetchedAt).toEqual(first.fetchedAt)
    expect(second.data).toHaveLength(1)
  })

  it('loads the orders again once they are 2 minutes old', async () => {
    const { market, calls, advance } = client([json(topBody)])
    await market.topOrders('ash_prime_set', null)
    advance(119_000)
    await market.topOrders('ash_prime_set', null)
    expect(calls).toHaveLength(1)
    advance(1000)
    await market.topOrders('ash_prime_set', null)
    expect(calls).toHaveLength(2)
  })

  it('skips the cache when fresh data are asked for', async () => {
    const { market, calls } = client([json(topBody)])
    await market.topOrders('ash_prime_set', null)
    await market.topOrders('ash_prime_set', null, { fresh: true })
    expect(calls).toHaveLength(2)
  })

  it('retries when the API asks to slow down, waiting longer each time', async () => {
    const { market, calls, sleeps } = client([json({}, 429), json({}, 429), json(catalogBody)])
    await expect(market.catalog()).resolves.toMatchObject({ data: [{ slug: 'ash_prime_set' }] })
    expect(calls).toHaveLength(3)
    // The queue spacing (350 ms) comes on top of the retry delays
    expect(sleeps.filter((ms) => ms >= 1000)).toEqual([1000, 2000])
  })

  it('retries after a network failure', async () => {
    const { market, calls } = client([new TypeError('fetch failed'), json(catalogBody)])
    await expect(market.catalog()).resolves.toMatchObject({ data: [{ slug: 'ash_prime_set' }] })
    expect(calls).toHaveLength(2)
  })

  it('gives up after 3 attempts', async () => {
    const { market, calls } = client([json({}, 503)])
    await expect(market.catalog()).rejects.toMatchObject({ name: 'MarketApiError', status: 503 })
    expect(calls).toHaveLength(3)
  })

  it('does not retry an unknown item or a refused request', async () => {
    const { market, calls } = client([json({ error: 'not found' }, 404), json({}, 403)])
    const failure = market.item('no_such_item')
    await expect(failure).rejects.toBeInstanceOf(MarketApiError)
    await expect(failure).rejects.toMatchObject({ status: 404 })
    await expect(market.orders('ash_prime_set')).rejects.toMatchObject({ status: 403 })
    expect(calls).toHaveLength(2)
  })

  it('rejects an answer that does not have the expected shape', async () => {
    const { market } = client([json({ data: 'oops' })])
    await expect(market.catalog()).rejects.toBeInstanceOf(MarketDataError)
  })

  it('rejects an answer that is not JSON', async () => {
    const { market } = client([new Response('<html>maintenance</html>', { status: 200 })])
    const failure = market.catalog()
    await expect(failure).rejects.toBeInstanceOf(MarketDataError)
    // The JSON error is kept for diagnosis
    await expect(failure).rejects.toHaveProperty('cause', expect.any(SyntaxError))
  })

  it('refuses a slug that could change the URL, without calling the API', async () => {
    const { market, calls } = client([json(topBody)])
    await expect(market.orders('../users/me')).rejects.toThrow(RangeError)
    await expect(market.statistics('ash prime')).rejects.toThrow(RangeError)
    expect(calls).toHaveLength(0)
  })
})
