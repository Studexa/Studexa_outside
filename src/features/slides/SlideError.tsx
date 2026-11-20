import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/api/client'

const slideErrors: Record<string, string> = {
  AI_LIMIT_REACHED: 'quota', AI_NOT_CONFIGURED: 'unavailable', AI_INVALID_RESPONSE: 'invalidDraft',
  EMPTY_FILE: 'emptyFile', FILE_TOO_LARGE: 'fileTooLarge', UNSUPPORTED_FILE: 'unsupportedFile',
  INVALID_FILE: 'invalidFile', NO_READABLE_TEXT: 'textlessFile',
}

export function SlideError({ error }: { error: unknown }) {
  const { t } = useTranslation()
  if (!error) return null
  const key = error instanceof ApiError ? slideErrors[error.code] : undefined
  return <p role="alert" className="slide-error">{t(`slides.errors.${key ?? 'request'}`)}</p>
}
