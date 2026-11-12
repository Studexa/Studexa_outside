import type { PropsWithChildren } from 'react'
export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'accent' }>) {
  const tones = { neutral: 'bg-[var(--color-surface-alt)] text-[var(--color-text)]', success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100', accent: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}
