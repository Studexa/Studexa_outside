import { useTranslation } from 'react-i18next'
export function EmptyState({ title, hint, action }: { title?: string; hint?: string; action?: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-muted)]">
      <div className="text-3xl">✨</div>
      <p className="font-semibold text-[var(--color-text)]">{title ?? t('components.empty')}</p>
      <p className="text-sm">{hint ?? t('components.emptyHint')}</p>
      {action}
    </div>
  )
}
