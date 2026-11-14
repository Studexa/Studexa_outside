import type { PropsWithChildren } from 'react'

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'accent' | 'primary' | 'danger'; className?: string }>) {
  const tones = {
    neutral: 'bg-[var(--color-surface-alt)] text-[var(--color-text)]',
    success: 'bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
    accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]',
    primary: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-text)]',
    danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
