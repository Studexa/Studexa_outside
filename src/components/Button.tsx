import type { ButtonHTMLAttributes } from 'react'
import { playSound } from '../lib/sound'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; full?: boolean }

export function Button({ variant = 'primary', full, className = '', onClick, ...props }: Props) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
  const styles: Record<string, string> = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-strong)] shadow-sm',
    secondary: 'bg-[var(--color-surface-alt)] text-[var(--color-text)] hover:brightness-95 border border-[var(--color-border)]',
    ghost: 'bg-transparent hover:bg-[var(--color-surface-alt)]',
    danger: 'bg-[var(--color-danger)] text-white hover:brightness-95',
  }
  return (
    <button
      className={`${base} ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
      onClick={(e) => { playSound('tap'); onClick?.(e) }}
      {...props}
    />
  )
}
