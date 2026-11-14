import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Icon, type IconName } from '../../components/Icon'
import { Badge } from '../../components/Badge'
import { decksApi, gameApi, reviewApi } from '../../lib/api'

const DEFAULT_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#f87171',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
]

function heatLevel(count: number) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

export function StatsPage() {
  const { t } = useTranslation()

  const gameQuery = useQuery({
    queryKey: ['game', 'state'],
    queryFn: gameApi.state,
  })
  const xpQuery = useQuery({
    queryKey: ['game', 'xp-history'],
    queryFn: () => gameApi.xpHistory(100),
  })
  const decksQuery = useQuery({
    queryKey: ['decks'],
    queryFn: decksApi.list,
  })
  const queueQuery = useQuery({
    queryKey: ['review', 'queue'],
    queryFn: () => reviewApi.queue(null),
  })

  const gameState = gameQuery.data
  const xpEvents = xpQuery.data ?? []
  const decks = decksQuery.data ?? []
  const queueCards = queueQuery.data?.cards ?? []

  const isLoading =
    gameQuery.isLoading || xpQuery.isLoading || decksQuery.isLoading || queueQuery.isLoading
  const error =
    gameQuery.error ?? xpQuery.error ?? decksQuery.error ?? queueQuery.error

  // ---- derived stats from real backend data ----
  const streakCurrent = gameState?.streakCurrent ?? 0
  const streakBest = gameState?.streakBest ?? 0

  // study sessions recorded in the last 7 days
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const sessionsThisWeek = xpEvents.filter((e) => {
    const d = new Date(e.createdAt)
    return d >= weekAgo && d <= now
  }).length

  // total cards due across all decks
  const cardsDue = decks.reduce((sum, d) => sum + (d.dueCount ?? 0), 0)

  const statsCards: { icon: IconName; value: string; key: string; tone: string }[] = [
    {
      icon: 'calendar',
      value: String(streakCurrent),
      key: 'stats.studyDays',
      tone: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
    },
    {
      icon: 'clock',
      value: String(sessionsThisWeek),
      key: 'stats.thisWeek',
      tone: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
    },
    {
      icon: 'target',
      value: String(cardsDue),
      key: 'stats.cardsDue',
      tone: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
    },
    {
      icon: 'flame',
      value: String(streakBest),
      key: 'stats.bestStreak',
      tone: 'bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]',
    },
  ]

  // ---- study heatmap (12 weeks) from real XP events ----
  const dayCounts = new Map<string, number>()
  for (const e of xpEvents) {
    const dateKey = new Date(e.createdAt).toISOString().slice(0, 10)
    dayCounts.set(dateKey, (dayCounts.get(dateKey) ?? 0) + 1)
  }

  const weeks = 12
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const index = w * 7 + d
      const date = new Date(todayStart)
      date.setDate(todayStart.getDate() - (weeks * 7 - 1 - index))
      const dateKey = date.toISOString().slice(0, 10)
      const count = dayCounts.get(dateKey) ?? 0
      return { date, level: heatLevel(count) }
    }),
  )

  // ---- time by subject from real decks ----
  const subjectMap = new Map<
    string,
    { minutes: number; color: string }
  >()
  for (const deck of decks) {
    const subject = deck.subjectName ?? t('stats.uncategorized')
    const existing = subjectMap.get(subject) ?? {
      minutes: 0,
      color: deck.color ?? DEFAULT_COLORS[0],
    }
    existing.minutes += deck.cardCount ?? 0
    subjectMap.set(subject, existing)
  }

  const subjectData = Array.from(subjectMap.entries())
    .map(([subject, { minutes, color }]) => ({ subject, minutes, color }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6)

  // ---- weak cards from real review queue (cards with lapses) ----
  const weakCards = queueCards
    .filter((c) => (c.lapses ?? 0) > 0)
    .sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      lapses: c.lapses ?? 0,
      deck: c.deckTitle ?? c.deckSubject ?? '',
    }))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black">{t('stats.title')}</h1>
          <p className="text-sm text-[var(--color-muted)]">{t('stats.subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 animate-pulse"
            />
          ))}
        </div>
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">{t('stats.heatmap')}</h2>
          </div>
          <div className="mt-3 h-40 flex items-center justify-center text-[var(--color-muted)]">
            {t('stats.heatmapTakeaway')}
          </div>
        </section>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 h-56 flex items-center justify-center text-[var(--color-muted)]">
            {t('stats.timeBySubject')} …
          </section>
          <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t('stats.weakCards')}</h2>
            </div>
            <div className="mt-3 h-32 flex items-center justify-center text-[var(--color-muted)]">
              {t('stats.weakHint')}
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-center">
        <p className="font-bold">{t('stats.loadError') ?? 'Failed to load stats.'}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    )
  }

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
              <BarChart
                data={subjectData}
                margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
              >
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
                  formatter={(value) => [
                    `${value} ${t('stats.minutes')}`,
                    t('stats.timeBySubject'),
                  ]}
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
            {weakCards.map((card) => (
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
            {weakCards.length === 0 && (
              <p className="text-xs text-[var(--color-muted)]">
                {t('stats.noWeakCards') ?? 'No cards to revisit right now.'}
              </p>
            )}
          </div>
          <Link to="/study/review" className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary)]">
            <Icon name="cards" size={16} /> {t('stats.reviewWeak')}
          </Link>
        </section>
      </div>
    </div>
  )
}
