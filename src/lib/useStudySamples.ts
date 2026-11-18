import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { aiApi } from './api'
import { useAuth } from './auth'

export function useStudySamples(enabled: boolean, selectedId: string) {
  const { i18n } = useTranslation()
  const userId = useAuth((state) => state.user?.id)
  const query = useQuery({
    queryKey: ['ai-samples', userId],
    queryFn: aiApi.samples,
    enabled: enabled && Boolean(userId) && userId !== 'demo-guest-user',
  })
  const samples = query.data ?? []
  const language = i18n.resolvedLanguage ?? i18n.language
  const sample = samples.find(({ id }) => id === selectedId)
    ?? samples.find((item) => item.language === language)
    ?? samples[0]
  return { sample, samples, query }
}
