import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { ProgressBar } from '../../components/ProgressBar'
import { StudyQueue } from '../../components/StudyQueue'
import { examsApi } from '../../lib/api/plan'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useApp } from '../../lib/store'
import { useDecks, useGameState, useTodayQuests } from '../../lib/study'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'km' ? 'km-KH' : 'en'
  const [now] = useState(() => new Date())
  const today = new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(now)
  const todayKey = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const userId = useAuth((state) => state.user?.id)
  const nickname = useApp((state) => state.nickname)
  const cardsToday = useApp((state) => state.cardsToday)
  const dailyGoal = useApp((state) => state.dailyGoal)
  const localExams = useApp((state) => state.exams)
  const localQuests = useApp((state) => state.quests)
  const localStreak = useApp((state) => state.streak)
  const guest = isGuestMode()
  const decks = useDecks()
  const game = useGameState(!guest)
  const quests = useTodayQuests(!guest)
  const exams = useQuery({
    queryKey: ['upcoming-exams', userId],
    queryFn: examsApi.list,
    enabled: !!userId && !guest,
    refetchOnMount: 'always',
  })

  const nextExam = (guest ? localExams : exams.data ?? [])
    .filter((exam) => exam.date >= todayKey)
    .sort((first, second) => first.date.localeCompare(second.date))[0]
  const dailyQuests = guest
    ? localQuests.map((quest) => ({ ...quest, code: quest.id }))
    : quests.data ?? []
  const streak = guest ? localStreak : game.data?.streakCurrent

  return (
    <div className="study-workspace">
      <header className="study-page-header">
        <p className="study-date">{today}</p>
        <h1>{t('home.greeting', { name: nickname })}</h1>
      </header>

      <div className="study-dashboard-grid">
        <StudyQueue decksQuery={decks} title={t('workspace.today')}>
          <div className="study-goal">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-semibold">
                {t('home.todayGoal')} <span className="study-muted font-normal">· {t(guest ? 'workspace.onThisDevice' : 'workspace.thisSession')}</span>
              </span>
              <span className="study-muted tabular-nums">{t('workspace.goalCount', { current: cardsToday, goal: dailyGoal })}</span>
            </div>
            <ProgressBar value={cardsToday} max={dailyGoal} size="sm" label={t('home.todayGoal')} />
          </div>
        </StudyQueue>

        <section className="study-panel study-exam" aria-labelledby="upcoming-exam-title">
          <div className="study-icon"><Icon name="calendar" size={22} /></div>
          <div>
            <h2 id="upcoming-exam-title" className="study-section-title">{t('workspace.upcomingExam')}</h2>
            {nextExam ? (
              <div className="mt-3 space-y-1">
                <h3 className="text-lg font-semibold [overflow-wrap:anywhere]">{nextExam.title}</h3>
                {nextExam.subject && nextExam.subject !== nextExam.title && (
                  <p className="study-muted [overflow-wrap:anywhere]">{nextExam.subject}</p>
                )}
                <time className="block text-sm font-semibold text-(--study-ink)" dateTime={nextExam.date}>
                  {nextExam.date === todayKey ? t('workspace.today') : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(nextExam.date + 'T00:00:00'))}
                </time>
              </div>
            ) : !guest && !exams.data && exams.isError ? (
              <>
                <p className="study-muted mt-2" role="status">{t('workspace.examError')}</p>
                <Button className="mt-2" variant="secondary" size="sm" onClick={() => void exams.refetch()} disabled={exams.isFetching}>
                  {t('common.retry')}
                </Button>
              </>
            ) : !guest && exams.isPending ? (
              <p className="study-muted mt-2" role="status">{t('common.loading')}</p>
            ) : (
              <p className="study-muted mt-2">{t('workspace.noExams')}</p>
            )}
          </div>
          <Link className="study-text-link mt-auto" to="/plan">
            {t('workspace.openPlanner')} <Icon name="arrowRight" size={16} />
          </Link>
        </section>
      </div>

      <section className="study-panel" aria-labelledby="study-shortcuts-title">
        <h2 className="study-section-title" id="study-shortcuts-title">{t('workspace.studyTools')}</h2>
        <div className="study-shortcuts mt-3">
          <Link to="/study/decks"><Icon name="layers" size={20} />{t('decks.title')}</Link>
          <Link to="/notes"><Icon name="note" size={20} />{t('nav.notes')}</Link>
          <Link to="/study/timer"><Icon name="timer" size={20} />{t('study.modes.timer')}</Link>
        </div>
      </section>

      <details className="study-panel study-rewards">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-semibold">
          <span className="flex items-center gap-2"><Icon name="flame" size={18} />{t('workspace.habits')}</span>
          <Icon name="chevronDown" size={17} />
        </summary>
        <div className="space-y-3 pb-2">
          {streak !== undefined && <p className="study-muted">{t('home.streakChip', { count: streak })}</p>}
          {dailyQuests.map((quest) => (
            <div key={quest.code} className="grid gap-1">
              <p className="flex flex-wrap items-center justify-between gap-1 text-sm">
                <span>{t('quests.' + quest.code, { defaultValue: quest.code })}</span>
                <span className="study-muted tabular-nums">{quest.completed ? t('common.done') : quest.progress + '/' + quest.target}</span>
              </p>
              <ProgressBar label={t('quests.' + quest.code, { defaultValue: quest.code })} value={quest.progress} max={quest.target} size="sm" />
            </div>
          ))}
          {quests.isLoading && <p className="study-muted" role="status">{t('common.loading')}</p>}
          <Link className="study-text-link" to="/stats">{t('home.seeStats')} <Icon name="arrowRight" size={16} /></Link>
        </div>
      </details>
    </div>
  )
}
