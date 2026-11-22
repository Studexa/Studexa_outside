import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { StudySample } from '../lib/api'
import type { useStudySamples } from '../lib/useStudySamples'

export function StudySamplePicker({ sample, samples, query, onChange }: ReturnType<typeof useStudySamples> & {
  onChange: (id: StudySample['id']) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
      <p className="text-sm text-[var(--color-muted)]">{t('beta.aiDisclosure')}</p>
      {query.isError && (
        <p role="alert" className="text-sm text-[var(--color-danger-text)]">
          {t('beta.samplesError')}{' '}
          <button type="button" className="underline" onClick={() => void query.refetch()}>{t('beta.retry')}</button>
        </p>
      )}
      <label className="block text-sm font-bold" htmlFor={id}>{t('beta.sample')}</label>
      <select id={id} value={sample?.id ?? ''} onChange={(event) => onChange(event.target.value)}
        disabled={!sample} className="w-full rounded-2xl px-4 py-2.5">
        {!sample && <option value="">{t(query.isError ? 'beta.samplesError' : 'common.loading')}</option>}
        {samples.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
      </select>
      {sample && <details className="rounded-xl bg-[var(--color-surface-alt)] px-3">
        <summary className="min-h-11 py-2 text-sm font-semibold">{t('pet.viewSource')}</summary>
        <p lang={sample.language} className="whitespace-pre-line pb-3 text-sm">{sample.text}</p>
      </details>}
    </div>
  )
}
