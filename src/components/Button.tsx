import type { ButtonHTMLAttributes, Ref } from 'react'
import { playSound } from '../lib/sound'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'primary', size = 'md', full, className = '', onClick, ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-(--radius-control) font-bold transition-[color,background-color,border-color,box-shadow] duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transition-none'
  const styles: Record<string, string> = {
    primary:
      'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-strong)] shadow-[var(--shadow-sm)]',
    secondary:
      'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)]',
    ghost: 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]',
    danger: 'bg-[var(--color-danger)] text-white hover:brightness-95',
    success: 'bg-[var(--color-success)] text-white hover:brightness-95',
    accent: 'bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:brightness-95 shadow-[var(--shadow-sm)]',
  }
  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-2 text-sm min-h-[44px]',
    md: 'px-4 py-2.5 min-h-[44px]',
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
