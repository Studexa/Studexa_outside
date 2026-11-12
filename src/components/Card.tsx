import type { PropsWithChildren, ReactNode } from 'react'

export function Card({ children, title, action, className = '' }: PropsWithChildren<{ title?: ReactNode; action?: ReactNode; className?: string }>) {
  return (
    <section className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h3 className="text-lg font-bold">{title}</h3> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
