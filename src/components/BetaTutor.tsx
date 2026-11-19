import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { aiApi } from '../lib/api'
import { Button } from './Button'
import { Mascot } from './Mascot'
import { Modal } from './Modal'
import { StudySamplePicker } from './StudySamplePicker'
import { useStudySamples } from '../lib/useStudySamples'
import { STUDY_COMPANION_EVENT } from '../lib/aiStudy'
import { useApp } from '../lib/store'
import { useOnline } from '../lib/useSettings'

export function BetaTutor() {
  const { t } = useTranslation()
  const buddy = useApp((state) => state.buddy)
  const online = useOnline()
  const [open, setOpen] = useState(false)
  const [sampleId, setSampleId] = useState('')
  const [promptId, setPromptId] = useState('')
  const picker = useStudySamples(open && online, sampleId)
  const prompt = picker.sample?.prompts.find((item) => item.id === promptId) ?? picker.sample?.prompts[0]
  const tutor = useMutation({ mutationFn: aiApi.sampleTutor, retry: false })

  useEffect(() => {
    const openCompanion = () => setOpen(true)
    window.addEventListener(STUDY_COMPANION_EVENT, openCompanion)
    return () => window.removeEventListener(STUDY_COMPANION_EVENT, openCompanion)
  }, [])

  return (
    <>
      <button className="study-header-action" onClick={() => setOpen(true)} aria-label={t('beta.tutor')}>
        <Mascot species={buddy} size={28} /><span className="study-header-label">{t('beta.tutor')}</span>
      </button>
      <Modal open={open} title={t('beta.tutor')} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div className="study-pet-message">
            <Mascot species={buddy} size={48} />
            <p>{t('pet.betaWelcome')}</p>
          </div>
          {!online && <p role="status" className="study-muted">{t('pet.offlineNotice')}</p>}
          {online && <StudySamplePicker {...picker} onChange={(id) => { setSampleId(id); tutor.reset() }} />}
          {online && picker.sample && (
            <label className="block text-sm font-bold">
              {t('beta.prompt')}
              <select value={prompt?.id ?? ''} disabled={tutor.isPending} lang={picker.sample.language}
                onChange={(event) => { setPromptId(event.target.value); tutor.reset() }}
                className="mt-1 w-full rounded-2xl px-4 py-2.5">
                {picker.sample.prompts.map((item) => <option key={item.id} value={item.id}>{item.question}</option>)}
              </select>
            </label>
          )}
          <Button full disabled={!online || !picker.sample || !prompt || tutor.isPending}
            onClick={() => picker.sample && prompt && tutor.mutate({ sampleId: picker.sample.id, promptId: prompt.id })}>
            {t(tutor.isPending ? 'common.loading' : 'beta.askTutor')}
          </Button>
          {tutor.isError && <p role="alert" className="text-sm text-[var(--color-danger)]">{tutor.error.message}</p>}
          {tutor.data && (
            <div lang={picker.sample?.language} aria-live="polite" className="space-y-2">
              <p className="whitespace-pre-wrap text-sm">{tutor.data.answer}</p>
              {tutor.data.references.map((reference) => (
                <blockquote className="rounded-xl bg-[var(--color-surface-alt)] p-3 text-sm" key={reference.excerpt}>
                  <p>{reference.excerpt}</p>
                  <cite>{reference.title}</cite>
                </blockquote>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
