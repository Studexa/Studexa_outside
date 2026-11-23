import { useTranslation } from 'react-i18next'

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation()
  const name = label ?? t('common.loading')
  return (
    <div className="inline-flex items-center gap-2 text-[var(--color-muted)]" role="status" aria-label={name}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="text-sm">{name}</span>
    </div>
  )
}
