import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { sessionApi } from '../../lib/api/quiz'
import { useAuth } from '../../lib/auth'
import { LiveRoomError, LiveRoomLayout } from './LiveRoomLayout'

export function ResultsPage() {
  const { t } = useTranslation()
  const { sessionId = '' } = useParams()
  const accountId = useAuth((state) => state.user?.id)
  const results = useQuery({ queryKey: ['live-results', accountId, sessionId], queryFn: () => sessionApi.getLeaderboard(sessionId), retry: false })
  const celebrated = useRef<string>(undefined)
  const finished = results.data?.some((entry) => entry.finalRank === 1) ?? false

  useEffect(() => {
    if (!finished || celebrated.current === sessionId || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    celebrated.current = sessionId
    void import('../../lib/confetti').then(({ celebrate }) => celebrate()).catch(() => undefined)
  }, [finished, sessionId])

  return <LiveRoomLayout title={t('quizRoom.results')}>
    {results.isPending && <p role="status">{t('common.loading')}</p>}
    {results.isError && <><LiveRoomError error={results.error} />
      <Button variant="secondary" onClick={() => void results.refetch()}>{t('common.retry')}</Button></>}
    {results.data && <section className="study-panel space-y-3">
      <h2 className="text-lg font-bold">{t('quizRoom.leaderboard')}</h2>
      <ol className={finished ? 'live-quiz-podium' : 'divide-y divide-[var(--color-border)]'}>
        {results.data.map((entry, index) => <li key={entry.nickname} className="flex flex-wrap justify-between gap-2 py-3">
          <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">#{entry.finalRank ?? index + 1} {entry.nickname}</span>
          <span className="font-bold tabular-nums">{t('quizRoom.points', { score: entry.totalScore })}</span>
        </li>)}
      </ol>
    </section>}
    <Link className="study-text-link" to="/quiz">{t('quizRoom.liveRooms')}</Link>
  </LiveRoomLayout>
}
