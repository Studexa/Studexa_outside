import type { ButtonHTMLAttributes } from 'react'
import { playSound } from '../lib/sound'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
}

export function Button({ variant = 'primary', size = 'md', full, className = '', onClick, ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
  const styles: Record<string, string> = {
    primary:
      'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-strong)] shadow-[0_10px_24px_rgba(79,70,229,0.25)]',
    secondary:
      'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)]',
    ghost: 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]',
    danger: 'bg-[var(--color-danger)] text-white hover:brightness-95',
    success: 'bg-[var(--color-success)] text-white hover:brightness-95',
    accent: 'bg-[var(--color-accent)] text-[#3b2503] hover:brightness-105',
  }
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm min-h-10',
    md: 'px-4 py-2.5 min-h-11',
    lg: 'px-6 py-3.5 text-lg min-h-14',
  }
  return (
    <button
      className={`${base} ${styles[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
      onClick={(e) => {
        playSound('tap')
        onClick?.(e)
      }}
      {...props}
    />
  )
}
