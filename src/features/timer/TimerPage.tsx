import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { GoalRing } from '../../components/GoalRing'
import { Icon } from '../../components/Icon'
import { Mascot } from '../../components/Mascot'
import { celebrate } from '../../lib/confetti'
import { playSound } from '../../lib/sound'
import { useApp } from '../../lib/store'

const durations = [25, 15, 5, 1]

export function TimerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const buddy = useApp((s) => s.buddy)
  const recordFocus = useApp((s) => s.recordFocus)

  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [completed, setCompleted] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const recorded = useRef(false)

  const total = minutes * 60
  const elapsed = Math.max(0, total - remaining)
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60

  useEffect(() => {
    if (!running || endAt === null) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        setRunning(false)
        setEndAt(null)
        setCompleted(true)
      }
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [running, endAt])

  useEffect(() => {
    if (!completed || recorded.current) return
    recorded.current = true
    recordFocus(minutes)
    celebrate()
    playSound('success')
  }, [completed, minutes, recordFocus])

  const start = () => {
    if (remaining <= 0) return
    setEndAt(Date.now() + remaining * 1000)
    setRunning(true)
    playSound('tap')
  }

  const pause = () => {
    if (endAt !== null) setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)))
    setRunning(false)
    setEndAt(null)
  }

  const reset = (nextMinutes = minutes) => {
    setRunning(false)
    setEndAt(null)
    setCompleted(false)
    setMinutes(nextMinutes)
    setRemaining(nextMinutes * 60)
    recorded.current = false
  }

  if (completed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-emerald-50 to-[var(--color-bg)] px-4 py-8 text-center dark:from-emerald-950/40">
        <Mascot species={buddy} mood="sparkle" size={170} accessory="scarf" className="animate-gentle-bounce" />
        <div className="w-full max-w-md rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-success)]">{t('timer.completeKicker')}</p>
          <h1 className="mt-1 text-2xl font-black">{t('timer.completeTitle')}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t('timer.completeHint', { count: minutes })}</p>
          <div className="mt-4 rounded-2xl bg-[var(--color-success-soft)] p-4">
            <p className="text-3xl font-black text-[var(--color-success)]">+{Math.round(25 * Math.min(1, minutes / 25))} XP</p>
            <p className="text-xs font-bold text-[var(--color-muted)]">{t('timer.xpEarned')}</p>
          </div>
          <div className="mt-5 space-y-2">
            <Button full size="lg" onClick={() => reset(minutes)}>
              <Icon name="reset" size={19} /> {t('timer.again')}
            </Button>
            <Button full variant="secondary" onClick={() => navigate('/')}>
              {t('timer.backHome')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-sky-50 via-[var(--color-bg)] to-emerald-50 text-[var(--color-text)] dark:from-[#0d1b2a] dark:via-[var(--color-bg)] dark:to-[#10231f]">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-4 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />

      {!focusMode && (
        <header className="relative flex items-center gap-3 px-4 pt-4">
          <button
            onClick={() => navigate('/study')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-[var(--color-muted)]"
            aria-label={t('common.exit')}
          >
            <Icon name="close" size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black">{t('timer.title')}</h1>
            <p className="text-xs text-[var(--color-muted)]">{t('timer.subtitle')}</p>
          </div>
          <button
            onClick={() => setFocusMode(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 text-xs font-bold text-[var(--color-muted)]"
          >
            <Icon name="target" size={16} /> {t('timer.focusMode')}
          </button>
        </header>
      )}

      {focusMode && (
        <header className="relative flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => setFocusMode(false)}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-white/40 px-3 text-xs font-bold text-[var(--color-muted)] backdrop-blur dark:bg-white/10"
          >
            <Icon name="arrowLeft" size={16} /> {t('timer.exitFocus')}
          </button>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">{t('timer.focusMode')}</span>
          <span className="w-11" />
        </header>
      )}

      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
        <div className="relative flex items-center justify-center">
          <GoalRing value={elapsed} max={total} size={focusMode ? 300 : 270} stroke={focusMode ? 16 : 14} tone="success">
            <span className="text-5xl font-black tabular-nums sm:text-6xl">
              {mm}:{String(ss).padStart(2, '0')}
            </span>
            <span className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {running ? t('timer.focusing') : t('timer.paused')}
            </span>
          </GoalRing>
          <div className="absolute -bottom-4 -right-3 sm:-right-8">
            <Mascot species={buddy} mood={running ? 'happy' : 'sleepy'} size={focusMode ? 110 : 96} className={running ? 'animate-gentle-bounce' : ''} />
          </div>
        </div>

        {!focusMode && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {durations.map((m) => (
              <button
                key={m}
                onClick={() => reset(m)}
                aria-pressed={minutes === m}
                className={`min-h-10 rounded-full border-2 px-4 text-sm font-bold transition ${
                  minutes === m
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]/70 text-[var(--color-muted)]'
                }`}
              >
                {t('timer.minutes', { count: m })}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            variant={running ? 'secondary' : 'primary'}
            onClick={running ? pause : start}
            className="min-w-40"
          >
            <Icon name={running ? 'pause' : 'play'} size={22} />
            {running ? t('common.pause') : remaining === total ? t('common.start') : t('common.resume')}
          </Button>
          <button
            onClick={() => reset()}
            className="flex h-12 w-12 shrink-0 aspect-square items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-[var(--color-muted)] hover:text-[var(--color-text)]"
            aria-label={t('common.reset')}
          >
            <Icon name="reset" size={20} />
          </button>
        </div>

        {!focusMode && (
          <p className="max-w-sm text-center text-sm font-semibold text-[var(--color-muted)]">{t('timer.hint')}</p>
        )}
      </div>
    </div>
  )
}
