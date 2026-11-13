import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Mascot } from './Mascot'

export function EmptyState({ title, hint, action }: { title?: string; hint?: string; action?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/70 p-8 text-center">
      <Mascot species="owl" mood="sleepy" size={104} accessory="scarf" />
      <p className="text-lg font-extrabold text-[var(--color-text)]">{title ?? t('components.empty')}</p>
      <p className="max-w-xs text-sm text-[var(--color-muted)]">{hint ?? t('components.emptyHint')}</p>
      {action}
    </div>
  )
}
