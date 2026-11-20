import type { TFunction } from 'i18next'
import { ApiError } from './api/client'

export function aiErrorMessage(t: TFunction, error: unknown, fallback?: string) {
  const code = error instanceof ApiError ? error.code : undefined
  switch (code) {
    case 'AI_PROVIDER_ACCESS_DENIED': return t('pet.providerAccessError')
    case 'AI_PROVIDER_LIMIT': return t('pet.providerLimitError')
    case 'AI_LIMIT_REACHED': return t('pet.limitError')
    case 'AI_NOT_CONFIGURED': return t('pet.setupError')
    case 'AI_TIMEOUT': return t('pet.timeoutError')
    case 'AI_INVALID_RESPONSE': return t('pet.outputError')
    default: return fallback ?? (error instanceof ApiError ? error.message : t('pet.requestError'))
  }
}
