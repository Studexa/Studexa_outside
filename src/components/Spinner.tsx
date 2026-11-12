export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-[var(--color-muted)]" role="status" aria-label={label}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
