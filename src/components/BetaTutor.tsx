import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { aiApi } from '../lib/api'
import { Button } from './Button'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { StudySamplePicker } from './StudySamplePicker'
import { useStudySamples } from '../lib/useStudySamples'

export function BetaTutor() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [sampleId, setSampleId] = useState('')
  const [promptId, setPromptId] = useState('')
  const picker = useStudySamples(open, sampleId)
  const prompt = picker.sample?.prompts.find((item) => item.id === promptId) ?? picker.sample?.prompts[0]
  const tutor = useMutation({ mutationFn: aiApi.sampleTutor, retry: false })

  return (
    <>
      <Button className="fixed bottom-20 right-4 z-30 shadow-lg md:bottom-6" onClick={() => setOpen(true)}>
        <Icon name="sparkles" size={18} /> {t('beta.tutor')}
      </Button>
      <Modal open={open} title={t('beta.tutor')} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <StudySamplePicker {...picker} onChange={(id) => { setSampleId(id); tutor.reset() }} />
          {picker.sample && (
            <label className="block text-sm font-bold">
              {t('beta.prompt')}
              <select value={prompt?.id ?? ''} disabled={tutor.isPending} lang={picker.sample.language}
                onChange={(event) => { setPromptId(event.target.value); tutor.reset() }}
                className="mt-1 w-full rounded-2xl px-4 py-2.5">
                {picker.sample.prompts.map((item) => <option key={item.id} value={item.id}>{item.question}</option>)}
              </select>
            </label>
          )}
          <Button full disabled={!picker.sample || !prompt || tutor.isPending}
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
