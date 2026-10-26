import { describe, expect, it } from 'vitest'
import { isSafeExternalUrl } from './external-links'

describe('isSafeExternalUrl', () => {
  it('accepts an https URL', () => {
    expect(isSafeExternalUrl('https://warframe.market/items/ash_prime_set')).toBe(true)
  })

  it.each([
    ['plain http', 'http://warframe.market'],
    ['a local file', 'file:///C:/Windows/System32/calc.exe'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a Windows settings URI', 'ms-settings:privacy'],
    ['an empty string', ''],
    ['text that is not a URL', 'not a url'],
    ['a scheme that only starts with https', 'https-evil://example.com']
  ])('rejects %s', (_label, url) => {
    expect(isSafeExternalUrl(url)).toBe(false)
  })
})
