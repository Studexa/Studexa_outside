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
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-muted)]">{t('beta.aiDisclosure')}</p>
      {query.isError && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
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
      {sample && <p lang={sample.language} className="whitespace-pre-line text-sm">{sample.text}</p>}
    </div>
  )
}
