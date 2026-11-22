import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '../../components/Icon'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { gameApi } from '../../lib/api'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useApp } from '../../lib/store'
import { formatStudyDate, localDateKey } from '../../lib/studyDate'
import { studyKeys, useDecks, useGameState, useWeakCards } from '../../lib/study'

const ACTIVITY_LIMIT = 100

function heatLevel(count: number) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

export function StatsPage() {
  const { t, i18n } = useTranslation()
  const userId = useAuth((state) => state.user?.id)
  const guestMode = isGuestMode()
  const localStreak = useApp((s) => s.streak)
  const localBestStreak = useApp((s) => s.bestStreak)
  const localFocus = useApp((s) => s.focusSessions)

  const gameQuery = useGameState(!guestMode)
  const xpQuery = useQuery({
    queryKey: [...studyKeys.gameXpHistory(userId), ACTIVITY_LIMIT],
    queryFn: () => gameApi.xpHistory(ACTIVITY_LIMIT),
    enabled: !guestMode,
  })
  const decksQuery = useDecks()
  const { cards: weakCards, query: weakCardsQuery } = useWeakCards()

  const gameState = gameQuery.data
  const xpEvents = xpQuery.data ?? []
  const decks = decksQuery.data ?? []

  const queries = [gameQuery, xpQuery, decksQuery, weakCardsQuery]
  const isLoading = queries.some((query) => query.isLoading)
  const unavailable = queries.filter((query) => query.data === undefined && (query.isError || query.isPaused))

  // ---- derived stats from real backend data ----
  const streakCurrent = guestMode ? localStreak : (gameState?.streakCurrent ?? 0)
  const streakBest = guestMode ? localBestStreak : (gameState?.streakBest ?? 0)

  const [todayStart] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const weekStart = new Date(todayStart)
  weekStart.setDate(todayStart.getDate() - 6)
  const weekStartKey = localDateKey(weekStart)
  const todayKey = localDateKey(todayStart)

  const dayCounts = new Map<string, number>()
  const timestamps = guestMode ? localFocus.map((session) => session.completedAt) : xpEvents.map((event) => event.createdAt)
  for (const timestamp of timestamps) {
    const dateKey = localDateKey(new Date(timestamp))
    dayCounts.set(dateKey, (dayCounts.get(dateKey) ?? 0) + 1)
  }
  const activeDays = [...dayCounts.keys()].filter((date) => date >= weekStartKey && date <= todayKey).length

  // total cards due across all decks
  const cardsDue = decks.reduce((sum, d) => sum + (d.dueCount ?? 0), 0)

  const statsCards: { icon: IconName; value: string; key: string; tone: string }[] = [
    {
      icon: 'calendar',
      value: String(streakCurrent),
      key: 'stats.currentStreak',
      tone: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
    },
    {
      icon: 'clock',
      value: String(activeDays),
      key: 'stats.activeDays',
      tone: 'bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
    },
    {
      icon: 'target',
      value: String(cardsDue),
      key: 'stats.cardsDue',
      tone: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]',
    },
    {
      icon: 'flame',
      value: String(streakBest),
      key: 'stats.bestStreak',
      tone: 'bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]',
    },
  ]

  const weeks = 12
  const language = i18n.resolvedLanguage ?? 'en'

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const index = w * 7 + d
      const date = new Date(todayStart)
      date.setDate(todayStart.getDate() - (weeks * 7 - 1 - index))
      const count = dayCounts.get(localDateKey(date)) ?? 0
      return { date, count, level: heatLevel(count) }
    }),
  )

  const subjectMap = new Map<string, number>()
  for (const deck of decks) {
    const subject = deck.subjectName ?? t('stats.uncategorized')
    if (deck.cardCount > 0) subjectMap.set(subject, (subjectMap.get(subject) ?? 0) + deck.cardCount)
  }

  const subjectData = Array.from(subjectMap.entries())
    .sort(([, first], [, second]) => second - first)

  const topSubjectCount = subjectData[0]?.[1] ?? 0

  if (isLoading || unavailable.length > 0) {
    return (
      <div className="study-workspace">
        <header className="study-page-header"><h1>{t('stats.title')}</h1></header>
        <div className="study-panel flex min-h-36 flex-col items-center justify-center gap-3">
          {isLoading ? <Spinner label={t('common.loading')} /> : (
            <>
              <p className="study-muted" role="status">{t('stats.loadError')}</p>
              <Button variant="secondary" onClick={() => unavailable.forEach((query) => void query.refetch())} disabled={unavailable.some((query) => query.isPaused)}>
                {t('common.retry')}
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="study-workspace">
      <header className="study-page-header">
        <h1>{t('stats.title')}</h1>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statsCards.map((card) => (
          <div key={card.key} className="study-panel grid gap-1">
            <dt className="study-muted grid gap-2 [overflow-wrap:anywhere]">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon name={card.icon} size={18} />
              </span>
              {t(card.key)}
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{card.value}</dd>
          </div>
        ))}
      </dl>

      <section className="study-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="study-section-title">{t('stats.heatmap')}</h2>
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
        <p className="study-muted mt-1">{guestMode ? t('stats.focusActivity') : t('stats.xpActivity', { count: ACTIVITY_LIMIT })}</p>

        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex gap-1.5">
            {columns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1.5">
                {week.map((day) => (
                  <span
                    key={day.date.toISOString()}
                    title={`${formatStudyDate(day.date, language, 'medium')} · ${t('stats.activityCount', { count: day.count })}`}
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
        <section className="study-panel">
          <h2 className="study-section-title">{t('stats.cardsBySubject')}</h2>
          {subjectData.length === 0 ? (
            <p className="study-muted mt-2">{t('stats.noSubjectCards')}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {subjectData.map(([subject, count]) => (
                <li key={subject}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{subject}</span>
                    <span className="study-muted shrink-0 tabular-nums">{t('stats.cardCount', { count })}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-(--color-surface-alt)" aria-hidden="true">
                    <div className="h-full rounded-full bg-(--study-ring)" style={{ width: (count / topSubjectCount * 100) + '%' }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="study-panel">
          <div className="flex items-center justify-between">
            <h2 className="study-section-title">{t('stats.weakCards')}</h2>
            <Badge tone="danger">{weakCards.length}</Badge>
          </div>
          <p className="text-xs font-semibold text-[var(--color-muted)]">{t('stats.weakHint')}</p>
          <div className="mt-3 space-y-2">
            {weakCards.map((card) => (
              <div key={card.id} className="rounded-2xl bg-[var(--color-surface-alt)]/60 p-3">
                <p className="text-sm font-extrabold">{card.front}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{card.back}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--color-muted)]">{card.deckTitle}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--color-danger-text)]">
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
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {weakCards.length > 0 && (
              <Link to="/study/practice" className="study-text-link">
                <Icon name="cards" size={16} /> {t('practice.title')}
              </Link>
            )}
            {cardsDue > 0 && (
              <Link to="/study/review" className="study-text-link">
                {t('study.startReview')}
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
