import { createInstance } from 'i18next'
import { expect, it } from 'vitest'
import en from '../locales/en.json'
import km from '../locales/km.json'
import { aiErrorMessage } from './aiErrors'
import { ApiError } from './api/client'

it.each([
  ['en', en],
  ['km', km],
] as const)('shows separate AI failure messages in %s', async (lng, translation) => {
  const i18n = createInstance()
  await i18n.init({ lng, resources: { [lng]: { translation } } })
  const errors = [
    [503, 'AI_PROVIDER_ACCESS_DENIED', translation.pet.providerAccessError],
    [429, 'AI_PROVIDER_LIMIT', translation.pet.providerLimitError],
    [429, 'AI_LIMIT_REACHED', translation.pet.limitError],
    [502, 'AI_TIMEOUT', translation.pet.timeoutError],
  ] as const
  const messages = errors.map(([status, code]) => aiErrorMessage(i18n.t, new ApiError(status, code, 'Server error')))
  expect(messages).toEqual(errors.map(([, , message]) => message))
  expect(new Set(messages).size).toBe(errors.length)
})
