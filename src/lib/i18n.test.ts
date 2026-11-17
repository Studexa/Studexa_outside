import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import km from '../locales/km.json'

function translationKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid translation at ${prefix}`)
  }
  return Object.entries(value).flatMap(([key, child]) =>
    translationKeys(child, prefix ? `${prefix}.${key}` : key),
  ).sort()
}

describe('translation resources', () => {
  it('provides the same translation keys in English and Khmer', () => {
    expect(translationKeys(km)).toEqual(translationKeys(en))
  })
})
