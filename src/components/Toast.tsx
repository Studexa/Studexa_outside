import { Icon } from './Icon'

export function Toast({ message, kind = 'info' }: { message: string; kind?: 'info' | 'success' | 'error' }) {
  const styles = {
    info: 'bg-[var(--color-surface-alt)] text-[var(--color-text)]',
    success: 'bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
    error: 'bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]',
  }
  const icon = kind === 'success' ? 'checkCircle' : kind === 'error' ? 'xCircle' : 'sparkles'
  return (
    <div role="status" className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${styles[kind]}`}>
      <Icon name={icon} size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
