import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Icon, type IconName } from '../../components/Icon'
import { Badge } from '../../components/Badge'
import { useApp } from '../../lib/store'

const subjectData = [
  { subject: 'Mathematics', minutes: 95, color: '#6366f1' },
  { subject: 'Biology', minutes: 70, color: '#10b981' },
  { subject: 'Khmer', minutes: 60, color: '#f59e0b' },
  { subject: 'English', minutes: 45, color: '#f87171' },
  { subject: 'Physics', minutes: 30, color: '#3b82f6' },
]

const statsCards: { icon: IconName; value: string; key: string; tone: string }[] = [
  { icon: 'calendar', value: '5', key: 'stats.studyDays', tone: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' },
  { icon: 'clock', value: '3.5h', key: 'stats.thisWeek', tone: 'bg-[var(--color-success-soft)] text-[var(--color-success)]' },
  { icon: 'target', value: '92%', key: 'stats.accuracy', tone: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' },
  { icon: 'flame', value: '11', key: 'stats.bestStreak', tone: 'bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]' },
]

function heatLevel(index: number) {
  const seed = (index * 37 + 11) % 100
  if (seed < 18) return 0
  if (seed < 44) return 1
  if (seed < 68) return 2
  if (seed < 86) return 3
  return 4
}

export function StatsPage() {
  const { t } = useTranslation()
  const weakCards = useApp((s) => s.weakCards)

  const weeks = 12
  const [columns] = useState(() => {
    const today = new Date()
    return Array.from({ length: weeks }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const index = w * 7 + d
        const date = new Date(today)
        date.setDate(today.getDate() - (weeks * 7 - 1 - index))
        return { date, level: heatLevel(index) }
      }),
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">{t('stats.title')}</h1>
        <p className="text-sm text-[var(--color-muted)]">{t('stats.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statsCards.map((card) => (
          <div key={card.key} className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
              <Icon name={card.icon} size={18} />
            </span>
            <p className="mt-2 text-2xl font-black">{card.value}</p>
            <p className="text-[11px] font-bold text-[var(--color-muted)]">{t(card.key)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">{t('stats.heatmap')}</h2>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-muted)]">
            <span>{t('stats.less')}</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className="h-3 w-3 rounded-[3px]"
                style={{
                  background: level === 0 ? 'var(--color-surface-alt)' : 'var(--color-primary)',
                  opacity: level === 0 ? 1 : 0.18 + level * 0.2,
                }}
              />
            ))}
            <span>{t('stats.more')}</span>
          </div>
        </div>
        <p className="mt-1 text-xs font-semibold text-[var(--color-muted)]">{t('stats.heatmapTakeaway')}</p>

        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex gap-1.5">
            {columns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1.5">
                {week.map((day) => (
                  <span
                    key={day.date.toISOString()}
                    title={`${day.date.toDateString()} · ${t('stats.studyLevel', { level: day.level })}`}
                    className="h-4 w-4 rounded-[4px] sm:h-5 sm:w-5"
                    style={{
                      background: day.level === 0 ? 'var(--color-surface-alt)' : 'var(--color-primary)',
                      opacity: day.level === 0 ? 1 : 0.18 + day.level * 0.2,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold text-[var(--color-muted)]">
          <span>{t('stats.weeksAgo', { count: weeks })}</span>
          <span>{t('stats.today')}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="text-lg font-extrabold">{t('stats.timeBySubject')}</h2>
          <p className="text-xs font-semibold text-[var(--color-muted)]">{t('stats.timeTakeaway')}</p>
          <div className="mt-2 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <XAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: 'var(--color-muted)', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--color-surface-alt)', opacity: 0.5 }}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 14,
                    fontSize: 12,
                    color: 'var(--color-text)',
                  }}
                  formatter={(value) => [`${value} ${t('stats.minutes')}`, t('stats.timeBySubject')]}
                />
                <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
                  {subjectData.map((entry) => (
                    <Cell key={entry.subject} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{t('stats.weakCards')}</h2>
            <Badge tone="danger">{weakCards.length}</Badge>
          </div>
          <p className="text-xs font-semibold text-[var(--color-muted)]">{t('stats.weakHint')}</p>
          <div className="mt-3 space-y-2">
            {weakCards.slice(0, 5).map((card) => (
              <div key={card.id} className="rounded-2xl bg-[var(--color-surface-alt)]/60 p-3">
                <p className="text-sm font-extrabold">{card.front}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{card.back}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--color-muted)]">{card.deck}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-soft)] px-2 py-0.5 text-[10px] font-black text-[#b91c1c] dark:text-[var(--color-danger)]">
                    <Icon name="undo" size={10} /> {t('stats.lapses', { count: card.lapses })}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/study/review" className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary)]">
            <Icon name="cards" size={16} /> {t('stats.reviewWeak')}
          </Link>
        </section>
      </div>
    </div>
  )
}
