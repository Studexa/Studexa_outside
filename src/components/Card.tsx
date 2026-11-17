import type { PropsWithChildren, ReactNode } from 'react'

export function Card({ children, title, action, className = '' }: PropsWithChildren<{ title?: ReactNode; action?: ReactNode; className?: string }>) {
  return (
    <section className={`surface-card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title ? <h3 className="text-base font-semibold">{title}</h3> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
