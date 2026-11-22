import type { ReactNode } from 'react'

type Props = {
  value: number
  max: number
  size?: number
  stroke?: number
  children?: ReactNode
  tone?: 'primary' | 'accent' | 'success'
  label?: string
}

export function GoalRing({ value, max, size = 128, stroke = 11, children, tone = 'primary', label }: Props) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0))
  const color = tone === 'accent' ? 'var(--color-accent-ink)' : tone === 'success' ? 'var(--color-success-text)' : 'var(--color-primary)'

  return (
    <div className="relative inline-flex aspect-square max-w-full shrink-0 items-center justify-center" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-alt)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="goal-ring-meter"
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {children}
      </div>
    </div>
  )
}
