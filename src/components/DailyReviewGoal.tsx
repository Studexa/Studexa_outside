import { useTranslation } from 'react-i18next'
import { isGuestMode } from '../lib/auth'
import { useApp } from '../lib/store'
import { localDateKey } from '../lib/studyDate'
import { useDailyReviewProgress } from '../lib/study'
import { Button } from './Button'
import { ProgressBar } from './ProgressBar'

export function DailyReviewGoal({ now }: { now: Date }) {
  const { t } = useTranslation()
  const date = localDateKey(now)
  const localReviews = useApp((state) => state.cardsTodayDate === date ? state.cardsToday : 0)
  const goal = useApp((state) => state.dailyGoal)
  const guest = isGuestMode()
  const progress = useDailyReviewProgress()
  const savedProgress = progress.data && Date.parse(progress.data.resetsAt) > now.getTime() ? progress.data : undefined
  const reviewed = guest ? localReviews : savedProgress?.reviewedCards

  if (reviewed !== undefined) {
    const complete = reviewed >= goal
    return (
      <>
        <p className="study-goal-count tabular-nums">{t('workspace.goalCount', { current: reviewed, goal })}</p>
        <ProgressBar value={reviewed} max={goal} size="sm" label={t('home.todayGoal')} tone={complete ? 'success' : 'primary'} />
        <p className={complete ? 'study-goal-complete' : 'study-muted'}>
          {t(complete ? 'workspace.goalComplete' : guest ? 'workspace.onThisDevice' : 'workspace.reviewedToday')}
        </p>
      </>
    )
  }

  if (progress.isError && !progress.isPaused) {
    return (
      <>
        <p className="study-muted" role="status">{t('workspace.progressError')}</p>
        <Button className="justify-self-start" variant="secondary" size="sm" onClick={() => void progress.refetch()} disabled={progress.isFetching}>
          {t('common.retry')}
        </Button>
      </>
    )
  }

  return <p className="study-muted" role="status">{t(progress.isPaused ? 'workspace.progressOffline' : 'common.loading')}</p>
}
