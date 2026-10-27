import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rate-limiter'

/** Fake clock: sleeping moves the time forward instantly. */
function fakeTime(): { now: () => number; sleep: (ms: number) => Promise<void> } {
  let time = 0
  return {
    now: () => time,
    sleep: (ms) => {
      time += ms
      return Promise.resolve()
    }
  }
}

describe('createRateLimiter', () => {
  it('spaces task starts by the minimum interval', async () => {
    const clock = fakeTime()
    const limiter = createRateLimiter({ minIntervalMs: 350, ...clock })
    const starts: number[] = []
    const task = (): Promise<void> => {
      starts.push(clock.now())
      return Promise.resolve()
    }
    await Promise.all([limiter.schedule(task), limiter.schedule(task), limiter.schedule(task)])
    expect(starts).toEqual([0, 350, 700])
  })

  it('runs one task at a time', async () => {
    const clock = fakeTime()
    const limiter = createRateLimiter({ minIntervalMs: 100, ...clock })
    const starts: number[] = []
    const slow = async (): Promise<void> => {
      starts.push(clock.now())
      await clock.sleep(500)
    }
    await Promise.all([limiter.schedule(slow), limiter.schedule(slow)])
    expect(starts).toEqual([0, 500])
  })

  it('returns the result of each task', async () => {
    const limiter = createRateLimiter({ minIntervalMs: 10, ...fakeTime() })
    await expect(limiter.schedule(() => Promise.resolve(42))).resolves.toBe(42)
  })

  it('keeps going after a task fails', async () => {
    const limiter = createRateLimiter({ minIntervalMs: 10, ...fakeTime() })
    const failing = limiter.schedule(() => Promise.reject(new Error('boom')))
    const next = limiter.schedule(() => Promise.resolve('ok'))
    await expect(failing).rejects.toThrow('boom')
    await expect(next).resolves.toBe('ok')
  })

  it('rejects a negative interval', () => {
    expect(() => createRateLimiter({ minIntervalMs: -1, ...fakeTime() })).toThrow(RangeError)
  })
})
