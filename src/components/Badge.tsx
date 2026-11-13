import type { PropsWithChildren } from 'react'

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'accent' | 'primary' | 'danger'; className?: string }>) {
  const tones = {
    neutral: 'bg-[var(--color-surface-alt)] text-[var(--color-text)]',
    success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
    accent: 'bg-[var(--color-accent-soft)] text-[#92610a] dark:text-[var(--color-accent)]',
    primary: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
    danger: 'bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
