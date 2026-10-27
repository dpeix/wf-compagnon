import { describe, expect, it } from 'vitest'
import { createCache } from './cache'

function counter(values: string[]): { load: () => Promise<string>; calls: () => number } {
  let calls = 0
  return {
    load: () => {
      const value = values[calls] ?? 'last'
      calls += 1
      return Promise.resolve(value)
    },
    calls: () => calls
  }
}

describe('createCache', () => {
  it('serves a value again while it is fresh, with the time it was stored', async () => {
    let time = 0
    const cache = createCache<string>(() => time)
    const source = counter(['first', 'second'])
    await expect(cache.get('k', 1000, source.load)).resolves.toEqual({
      value: 'first',
      storedAt: 0
    })
    time = 999
    await expect(cache.get('k', 1000, source.load)).resolves.toEqual({
      value: 'first',
      storedAt: 0
    })
    expect(source.calls()).toBe(1)
  })

  it('loads again once the value is stale', async () => {
    let time = 0
    const cache = createCache<string>(() => time)
    const source = counter(['first', 'second'])
    await cache.get('k', 1000, source.load)
    time = 1000
    await expect(cache.get('k', 1000, source.load)).resolves.toEqual({
      value: 'second',
      storedAt: 1000
    })
  })

  it('always loads again with a lifetime of zero', async () => {
    const cache = createCache<string>(() => 0)
    const source = counter(['first', 'second'])
    await cache.get('k', 1000, source.load)
    await expect(cache.get('k', 0, source.load)).resolves.toMatchObject({ value: 'second' })
  })

  it('keeps separate values per key', async () => {
    const cache = createCache<string>(() => 0)
    await cache.get('a', 1000, () => Promise.resolve('A'))
    await expect(cache.get('b', 1000, () => Promise.resolve('B'))).resolves.toMatchObject({
      value: 'B'
    })
  })

  it('shares one load between concurrent requests for the same key', async () => {
    const cache = createCache<string>(() => 0)
    const source = counter(['only'])
    const [a, b] = await Promise.all([
      cache.get('k', 1000, source.load),
      cache.get('k', 1000, source.load)
    ])
    expect([a.value, b.value]).toEqual(['only', 'only'])
    expect(source.calls()).toBe(1)
  })

  it('does not keep a failed load', async () => {
    const cache = createCache<string>(() => 0)
    await expect(cache.get('k', 1000, () => Promise.reject(new Error('down')))).rejects.toThrow(
      'down'
    )
    await expect(cache.get('k', 1000, () => Promise.resolve('back'))).resolves.toMatchObject({
      value: 'back'
    })
  })

  it('rejects a negative lifetime', async () => {
    const cache = createCache<string>(() => 0)
    await expect(cache.get('k', -1, () => Promise.resolve('x'))).rejects.toThrow(RangeError)
  })
})
