import { useCallback, useEffect, useState } from 'react'
import {
  NOTHING_SETTLED,
  asyncState,
  requestId,
  type AsyncState,
  type Settled
} from './async-state'

/**
 * Runs `load` when `key` changes and on `reload()`, once `enabled` is true. `fresh` is true
 * for a reload, so that the main process skips its cache. Answers of an outdated request
 * (key changed meanwhile) are ignored; see asyncState for what is shown meanwhile.
 */
export function useAsync<T>(
  load: (key: string, fresh: boolean) => Promise<T>,
  key: string,
  enabled = true
): { state: AsyncState<T>; reload: () => void } {
  const [settled, setSettled] = useState<Settled<T>>(NOTHING_SETTLED)
  const [reloaded, setReloaded] = useState<{ key: string; count: number }>({ key, count: 0 })
  // Another key starts again from its cache: coming back to an item refreshed earlier must
  // not skip the cache again (React's "adjust state when a prop changes" pattern)
  if (reloaded.key !== key) setReloaded({ key, count: 0 })
  const reloads = reloaded.key === key ? reloaded.count : 0
  const request = requestId(key, reloads)
  const fresh = reloads > 0

  useEffect(() => {
    if (!enabled) return
    let current = true
    load(key, fresh)
      .then((data) => {
        if (current) setSettled({ request, failed: false, error: null, data, dataKey: key })
      })
      .catch((error: unknown) => {
        if (current) setSettled((previous) => ({ ...previous, request, failed: true, error }))
      })
    return () => {
      current = false
    }
  }, [load, key, request, fresh, enabled])

  const reload = useCallback(() => {
    setReloaded((previous) => ({
      key,
      count: (previous.key === key ? previous.count : 0) + 1
    }))
  }, [key])

  return { state: asyncState(settled, request, key), reload }
}
