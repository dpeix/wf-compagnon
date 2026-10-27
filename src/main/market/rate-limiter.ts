export interface RateLimiter {
  /** Runs the task once the previous one has finished and the minimum interval has passed. */
  schedule: <T>(task: () => Promise<T>) => Promise<T>
}

interface RateLimiterOptions {
  minIntervalMs: number
  now: () => number
  sleep: (ms: number) => Promise<void>
}

/** Serial queue that starts at most one task every `minIntervalMs` (API rate limits). */
export function createRateLimiter({ minIntervalMs, now, sleep }: RateLimiterOptions): RateLimiter {
  if (!Number.isFinite(minIntervalMs) || minIntervalMs < 0) {
    throw new RangeError(`Invalid interval: ${String(minIntervalMs)}`)
  }
  let lastStart = Number.NEGATIVE_INFINITY
  // Chain of the tasks already queued; a failure must not stop the ones after it
  let queue: Promise<unknown> = Promise.resolve()

  return {
    schedule: <T>(task: () => Promise<T>): Promise<T> => {
      const run = async (): Promise<T> => {
        const wait = lastStart + minIntervalMs - now()
        if (wait > 0) await sleep(wait)
        lastStart = now()
        return task()
      }
      const result = queue.then(run, run)
      queue = result.catch(() => undefined)
      return result
    }
  }
}
