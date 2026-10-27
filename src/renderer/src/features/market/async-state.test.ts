import { describe, expect, it } from 'vitest'
import { NOTHING_SETTLED, asyncState, requestId, type Settled } from './async-state'

const success = (key: string, reloads: number, data: string): Settled<string> => ({
  request: requestId(key, reloads),
  failed: false,
  error: null,
  data,
  dataKey: key
})

describe('asyncState', () => {
  it('is loading before any answer', () => {
    expect(asyncState<string>(NOTHING_SETTLED, requestId('a', 0), 'a')).toEqual({
      status: 'loading',
      data: null
    })
  })

  it('is ready once the expected request answered', () => {
    expect(asyncState(success('a', 0, 'A'), requestId('a', 0), 'a')).toEqual({
      status: 'ready',
      data: 'A'
    })
  })

  it('keeps the previous data visible while the same key reloads', () => {
    expect(asyncState(success('a', 0, 'A'), requestId('a', 1), 'a')).toEqual({
      status: 'loading',
      data: 'A'
    })
  })

  it('never shows the data of another key', () => {
    expect(asyncState(success('a', 0, 'A'), requestId('b', 0), 'b')).toEqual({
      status: 'loading',
      data: null
    })
  })

  it('reports a failed reload with the previous data', () => {
    const error = new Error('down')
    const settled = { ...success('a', 0, 'A'), request: requestId('a', 1), failed: true, error }
    expect(asyncState(settled, requestId('a', 1), 'a')).toEqual({
      status: 'error',
      error,
      data: 'A'
    })
  })

  it('reports a failed first load without data', () => {
    const error = new Error('down')
    const settled = { ...NOTHING_SETTLED, request: requestId('a', 0), failed: true, error }
    expect(asyncState<string>(settled, requestId('a', 0), 'a')).toEqual({
      status: 'error',
      error,
      data: null
    })
  })
})
