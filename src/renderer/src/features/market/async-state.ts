// State of a screen loaded through IPC (see use-async.ts), as a pure function.

export type AsyncState<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: unknown; data: T | null }

/** Last answer received, whatever request it belongs to. */
export interface Settled<T> {
  /** Request this answer belongs to (see requestId) */
  request: string | null
  failed: boolean
  error: unknown
  /** Data of the last success, kept when a reload fails */
  data: T | null
  /** Key the data belong to */
  dataKey: string | null
}

export const NOTHING_SETTLED: Settled<never> = {
  request: null,
  failed: false,
  error: null,
  data: null,
  dataKey: null
}

/** One id per key and reload: an answer to another id is outdated. */
export function requestId(key: string, reloads: number): string {
  return `${key}#${String(reloads)}`
}

/**
 * What to show for `key` while `request` is the expected one: loading as long as the last
 * answer belongs to another request. While reloading the same key the previous data stay
 * visible; data of another key are never shown.
 */
export function asyncState<T>(settled: Settled<T>, request: string, key: string): AsyncState<T> {
  const data = settled.dataKey === key ? settled.data : null
  if (settled.request !== request) return { status: 'loading', data }
  if (settled.failed) return { status: 'error', error: settled.error, data }
  return data === null ? { status: 'loading', data } : { status: 'ready', data }
}
