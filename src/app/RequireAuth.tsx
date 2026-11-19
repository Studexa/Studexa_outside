import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { PageSkeleton } from '../components/Skeleton'

function AppAuthSkeleton() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]" aria-busy="true">
      {/* Synchronized Header skeleton */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 px-4 h-16 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[var(--color-primary-soft)] animate-pulse" />
          <div className="space-y-1.5 hidden sm:block">
            <div className="h-4 w-24 rounded bg-[var(--color-surface-alt)] animate-pulse" />
            <div className="h-2.5 w-36 rounded bg-[var(--color-surface-alt)] animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-16 rounded-full bg-[var(--color-surface-alt)] animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-[var(--color-surface-alt)] animate-pulse" />
        </div>
      </header>

      {/* Synchronized Main page skeleton */}
      <main className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
        <PageSkeleton />
      </main>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const status = useAuth((s) => s.status)
  const bootstrap = useAuth((s) => s.bootstrap)

  useEffect(() => {
    if (status === 'idle') void bootstrap()
  }, [status, bootstrap])

  if (status === 'idle' || status === 'loading') {
    return <AppAuthSkeleton />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  }

  return <>{children}</>
}
