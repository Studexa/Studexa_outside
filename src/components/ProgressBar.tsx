type Props = {
  value: number
  max?: number
  tone?: 'primary' | 'accent' | 'success' | 'danger'
  size?: 'sm' | 'md'
  label?: string
  showLabel?: boolean
}

export function ProgressBar({ value, max = 100, tone = 'primary', size = 'md', label, showLabel }: Props) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  const colors = {
    primary: 'var(--progress-bar-primary, var(--color-primary))',
    accent: 'var(--color-accent)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
  }
  return (
    <div className={showLabel ? 'space-y-1' : ''}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-muted)]">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className={`${size === 'sm' ? 'h-2' : 'h-3'} w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]`}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: colors[tone] }}
        />
      </div>
    </div>
  )
}
