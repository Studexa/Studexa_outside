import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Mascot } from './Mascot'

export function EmptyState({ title, hint, action }: { title?: string; hint?: string; action?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-12 text-center sm:py-16">
      <span className="mb-2 rounded-full bg-[var(--color-surface-alt)] p-4"><Mascot species="owl" mood="sleepy" size={64} accessory="scarf" /></span>
      <p className="text-lg font-extrabold text-[var(--color-text)]">{title ?? t('components.empty')}</p>
      <p className="max-w-xs text-sm text-[var(--color-muted)]">{hint ?? t('components.emptyHint')}</p>
      {action}
    </div>
  )
}
