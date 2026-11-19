import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { aiApi, type AiTutorResponse } from '../../lib/api'
import { ApiError } from '../../lib/api/client'
import { readingsApi, type Reading, type ReadingAction } from '../../lib/api/readings'
import { betaEnabled } from '../../lib/beta'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useOnline } from '../../lib/useSettings'
import type { Passage } from './passageSelection'

const actions = ['EXPLAIN', 'SUMMARIZE', 'PRACTICE'] as const

type Props = { passage: Passage; title: string; reading?: Reading; onClose: () => void }

export function PassageQuestion({ passage, title, reading, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const account = useAuth((state) => state.user?.id)
  const online = useOnline()
  const guest = isGuestMode()
  const available = !guest && (!betaEnabled || !!reading)
  const language = i18n.resolvedLanguage === 'km' ? 'km' : 'en'
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<AiTutorResponse>()
  const limits = useQuery({ queryKey: ['ai-source-limit', account], queryFn: aiApi.sourceLimit,
    enabled: available && online && !reading, retry: false })
  const limit = reading?.maxSourceChars ?? limits.data?.maxSourceChars
  const tooLong = limit !== undefined && passage.text.length > limit
  const ask = useMutation({
    mutationFn: (action: ReadingAction | 'custom') => {
      if (reading && action !== 'custom') {
        if (!passage.range) throw new Error('Missing reading selection')
        return readingsApi.ask(reading.edition.id, { ...passage.range, revision: reading.edition.revision, language, action })
      }
      return aiApi.tutor({ question: action === 'custom' ? question.trim() : t(`selection.prompts.${action}`),
        sourceTitle: title.slice(0, 200).replace(/[\uD800-\uDBFF]$/u, ''), sourceText: passage.text })
    },
    onSuccess: setAnswer,
  })
  const canSubmit = available && (!reading || !!passage.range) && online && !!limit && !tooLong && !ask.isPending
  const code = ask.error instanceof ApiError ? ask.error.code : ''
  const error = code === 'AI_LIMIT_REACHED' ? t('pet.limitError') : code === 'AI_NOT_CONFIGURED' ? t('pet.setupError')
    : code === 'READING_CHANGED' ? t('selection.changed')
      : code === 'READING_SELECTION_TOO_LONG' ? t('selection.tooLong', { limit }) : t('pet.requestError')

  return <Modal open title={t('selection.ask')} onClose={onClose}>
    <div className="space-y-3">
      <label className="block space-y-1 text-sm font-bold">
        <span>{t('selection.preview')}</span>
        <textarea readOnly value={passage.text} rows={4} className="w-full rounded-xl p-2 font-normal" />
      </label>
      {!available ? <p role="status" className="study-muted">{t(guest ? 'pet.guestNotice' : 'selection.betaNotes')}</p> : <>
        <p className="study-muted">{t('notes.study.aiDisclosure')}</p>
        {!online && <p role="status" className="study-muted">{t('pet.offlineNotice')}</p>}
        {limits.isError && <div className="flex flex-wrap items-center gap-2 text-sm" role="alert">
          {t('notes.study.sourceFailed')}
          <Button size="sm" variant="secondary" onClick={() => void limits.refetch()}>{t('common.retry')}</Button>
        </div>}
        {tooLong && <p role="alert" className="text-sm text-[var(--color-danger)]">{t('selection.tooLong', { limit })}</p>}
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => <Button key={action} variant="secondary" size="sm" disabled={!canSubmit}
            onClick={() => { setAnswer(undefined); ask.mutate(action) }}>{t(`selection.actions.${action}`)}</Button>)}
        </div>
        {!betaEnabled && <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit && question.trim()) { setAnswer(undefined); ask.mutate('custom') }
        }}>
          <label className="block space-y-1 text-sm font-bold">
            <span>{t('selection.customQuestion')}</span>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1200} rows={2}
              className="w-full rounded-xl p-2 font-normal" />
          </label>
          <Button size="sm" type="submit" disabled={!canSubmit || !question.trim()}>{t('pet.send')}</Button>
        </form>}
        {ask.isPending && <p role="status" className="study-muted">{t('pet.thinking')}</p>}
        {ask.isError && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        {answer && <div aria-live="polite" className="space-y-2 rounded-xl bg-[var(--color-surface-alt)] p-3 text-sm">
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{answer.answer}</p>
          {answer.references.map((reference, index) => <blockquote key={index} className="border-l-2 pl-2">
            <p>{reference.excerpt}</p><cite>{reference.title}</cite>
          </blockquote>)}
        </div>}
      </>}
    </div>
  </Modal>
}
