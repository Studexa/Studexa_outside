import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { DailyReviewGoal } from '../../components/DailyReviewGoal'
import { Icon, type IconName } from '../../components/Icon'
import { Mascot } from '../../components/Mascot'
import { ProgressBar } from '../../components/ProgressBar'
import { StudyQueue } from '../../components/StudyQueue'
import { openStudyCompanion } from '../../lib/aiStudy'
import { betaEnabled } from '../../lib/beta'
import { examsApi } from '../../lib/api/plan'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useApp } from '../../lib/store'
import { formatStudyDate, localDateKey } from '../../lib/studyDate'
import { useDecks, useGameState, useStudyDate, useTodayQuests } from '../../lib/study'

const shortcuts: { to: string; title: string; icon: IconName }[] = [
  { to: '/study/decks', title: 'decks.title', icon: 'layers' },
  { to: '/study/quiz', title: 'study.modes.quiz', icon: 'target' },
  { to: '/notes', title: 'nav.notes', icon: 'note' },
  { to: '/study/timer', title: 'study.modes.timer', icon: 'timer' },
]

export function HomePage() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const now = useStudyDate()
  const today = formatStudyDate(now, language, 'full')
  const todayKey = localDateKey(now)
  const userId = useAuth((state) => state.user?.id)
  const nickname = useApp((state) => state.nickname)
  const buddy = useApp((state) => state.buddy)
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
      <header className="study-page-header study-dashboard-header study-home-welcome">
        <Mascot species={buddy} size={84} className="study-welcome-pet" />
        <div className="study-welcome-copy">
          <time className="study-date block" dateTime={todayKey}>{today}</time>
          <h1>{t('home.greeting', { name: nickname })}</h1>
          <p className="study-muted">{t(`pet.encouragement.${now.getDay()}`)}</p>
          {(!betaEnabled || !guest) && <button type="button" className="study-text-link" onClick={(event) => openStudyCompanion(event.currentTarget)}>
            <Icon name="sparkles" size={16} />{t('pet.askBuddy')}
          </button>}
        </div>
        {streak !== undefined && streak > 0 && (
          <Link to="/stats" className="study-streak">
            <Icon name="flame" size={18} />{t('home.streakChip', { count: streak })}
          </Link>
        )}
      </header>

      <div className="study-dashboard-grid">
        <StudyQueue decksQuery={decks} title={t('workspace.queue')} featured />

        <section className="study-panel study-goal" aria-labelledby="daily-goal-title">
          <div className="study-panel-heading">
            <span className="study-icon study-icon-small"><Icon name="target" size={18} /></span>
            <h2 className="study-section-title" id="daily-goal-title">{t('home.todayGoal')}</h2>
          </div>
          <DailyReviewGoal now={now} />
        </section>

        <section className="study-panel study-dashboard-tools" aria-labelledby="study-shortcuts-title">
          <h2 className="study-section-title" id="study-shortcuts-title">{t('workspace.studyTools')}</h2>
          <div className="study-shortcuts mt-3">
            {shortcuts.map(({ to, title, icon }) => (
              <Link key={to} to={to}>
                <span className="study-icon study-icon-small"><Icon name={icon} size={18} /></span>
                <span>{t(title)}</span>
                <Icon className="study-shortcut-arrow" name="chevronRight" size={16} />
              </Link>
            ))}
          </div>
        </section>

        <section className="study-panel study-exam" aria-labelledby="upcoming-exam-title">
          <div className="study-panel-heading">
            <span className="study-icon study-icon-small"><Icon name="calendar" size={18} /></span>
            <h2 id="upcoming-exam-title" className="study-section-title">{t('workspace.upcomingExam')}</h2>
          </div>
          <div>
            {nextExam ? (
              <div className="space-y-1">
                <h3 className="text-lg font-semibold [overflow-wrap:anywhere]">{nextExam.title}</h3>
                {nextExam.subject && nextExam.subject !== nextExam.title && (
                  <p className="study-muted [overflow-wrap:anywhere]">{nextExam.subject}</p>
                )}
                <time className="block text-sm font-semibold text-(--study-ink)" dateTime={nextExam.date}>
                  {nextExam.date === todayKey ? t('workspace.today') : formatStudyDate(new Date(nextExam.date + 'T00:00:00'), language, 'medium')}
                </time>
              </div>
            ) : !guest && !exams.data && exams.isError ? (
              <>
                <p className="study-muted" role="status">{t('workspace.examError')}</p>
                <Button className="mt-2" variant="secondary" size="sm" onClick={() => void exams.refetch()} disabled={exams.isFetching}>
                  {t('common.retry')}
                </Button>
              </>
            ) : !guest && exams.isPending ? (
              <p className="study-muted" role="status">{t('common.loading')}</p>
            ) : (
              <p className="study-muted">{t('workspace.noExams')}</p>
            )}
          </div>
          <Link className="study-text-link mt-auto" to="/plan">
            {t('workspace.openPlanner')} <Icon name="arrowRight" size={16} />
          </Link>
        </section>
      </div>

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
