interface Stored<T> {
  value: T
  /** When the value was loaded, from the `now` clock of the cache */
  storedAt: number
}

export interface Cache<T> {
  /**
   * Value of `key` if younger than `ttlMs`, otherwise the result of `load` (shared while
   * loading). A lifetime of 0 always loads again.
   */
  get: (key: string, ttlMs: number, load: () => Promise<T>) => Promise<Stored<T>>
}

/** In-memory cache with a lifetime per read; failed loads are not kept. */
export function createCache<T>(now: () => number): Cache<T> {
  const values = new Map<string, Stored<T>>()
  const loading = new Map<string, Promise<Stored<T>>>()

  return {
    get: (key, ttlMs, load) => {
      if (!Number.isFinite(ttlMs) || ttlMs < 0) {
        return Promise.reject(new RangeError(`Invalid lifetime: ${String(ttlMs)}`))
      }
      const stored = values.get(key)
      if (stored && now() - stored.storedAt < ttlMs) return Promise.resolve(stored)
      const pending = loading.get(key)
      if (pending) return pending

      const promise = load()
        .then((value) => {
          const entry = { value, storedAt: now() }
          values.set(key, entry)
          return entry
        })
        .finally(() => {
          loading.delete(key)
        })
      loading.set(key, promise)
      return promise
    }
  }
}
