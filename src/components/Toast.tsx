export function Toast({ message, kind = 'info' }: { message: string; kind?: 'info' | 'success' | 'error' }) {
  const colors = { info: 'bg-[var(--color-surface-alt)]', success: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100', error: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100' }
  return <div role="status" className={`rounded-xl px-4 py-3 text-sm font-medium ${colors[kind]}`}>{message}</div>
}
