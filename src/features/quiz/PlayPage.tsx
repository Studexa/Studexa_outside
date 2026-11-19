import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { answerApi, sessionApi } from '../../lib/api/quiz'
import { useAuth } from '../../lib/auth'
import { useRoomUpdates } from '../../lib/websocket'
import { LiveRoomError, LiveRoomLayout } from './LiveRoomLayout'

function parseOptions(value?: string) {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((option) => {
      if (typeof option === 'string') return [{ value: option, label: option }]
      if (option && typeof option === 'object' && 'text' in option) {
        const label = String(option.text)
        return [{ value: 'id' in option ? String(option.id) : label, label }]
      }
      return []
    })
  } catch {
    return []
  }
}

export function PlayPage() {
  const { t } = useTranslation()
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const accountId = useAuth((state) => state.user?.id)
  const [now, setNow] = useState(Date.now)
  const room = useQuery({
    queryKey: ['live-quiz', accountId, sessionId],
    queryFn: async () => ({ state: await sessionApi.getState(sessionId), receivedAt: Date.now() }),
    retry: false,
    refetchInterval: (query) => query.state.data?.state.status === 'ENDED' ? false : 5_000,
  })
  const state = room.data?.state
  const question = state?.question
  useRoomUpdates(state?.status === 'ACTIVE' ? state.roomCode : undefined, room.refetch)

  useEffect(() => {
    if (state?.status === 'ENDED') void navigate(`/quiz/results/${sessionId}`, { replace: true })
  }, [state?.status, sessionId, navigate])

  useEffect(() => {
    if (!question?.id) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [question?.id])

  const submit = useMutation({
    mutationFn: async ({ playerId, questionId, choice, elapsed }: { playerId: string; questionId: string; choice: string; elapsed: number }) => ({
      questionId,
      answer: await answerApi.submitAnswer({ sessionPlayerId: playerId, questionId, selectedAnswer: choice, responseTimeMs: elapsed }),
    }),
    onSettled: () => room.refetch(),
  })
  const advance = useMutation({ mutationFn: (id: string) => sessionApi.advance(sessionId, id), onSettled: () => room.refetch() })
  const resume = useMutation({ mutationFn: () => sessionApi.startSession(sessionId), onSettled: () => room.refetch() })
  const time = room.data ? room.data.state.serverTime + Math.max(0, now - room.data.receivedAt) : now
  const secondsLeft = question ? Math.max(0, Math.ceil((question.endsAt - time) / 1000)) : 0
  const answer = state?.answer ?? (submit.data?.questionId === question?.id ? submit.data?.answer : undefined)
  const canAdvance = !!state?.host && (secondsLeft === 0 || state.answeredCount >= state.playerCount)

  return <LiveRoomLayout title={t('quizRoom.liveQuiz')}>
    {!state && <>{room.isPending ? <p role="status">{t('common.loading')}</p> : <>
      <LiveRoomError error={room.error} />
      <Button variant="secondary" disabled={room.isFetching} onClick={() => void room.refetch()}>{t('common.retry')}</Button>
    </>}</>}
    {state && !question && (state.host && state.status === 'ACTIVE' ? <>
      <LiveRoomError error={resume.error} />
      <Button disabled={resume.isPending} onClick={() => resume.mutate()}>{t('quizRoom.start')}</Button>
    </> : <p role="status">{t('quizRoom.waiting')}</p>)}
    {state && question && <section className="study-panel space-y-4">
      <div className="flex flex-wrap justify-between gap-2 text-sm font-bold">
        <span>{t('quizRoom.questionProgress', { index: question.index, total: state.questionCount })}</span>
        <span className="tabular-nums">{t('quizRoom.seconds', { seconds: secondsLeft })}</span>
      </div>
      <h2 className="text-xl font-bold [overflow-wrap:anywhere]">{question.text}</h2>
      {answer ? <div className="space-y-2 rounded-xl bg-[var(--color-surface-alt)] p-4">
        <p className="font-bold">{t(answer.isCorrect ? 'quizRoom.correct' : 'quizRoom.submitted')}</p>
        <p>{t('quizRoom.correctAnswer', { answer: answer.correctAnswer })}</p>
        {answer.explanation && <p className="text-[var(--color-muted)]">{answer.explanation}</p>}
        <p className="font-bold">{t('quizRoom.points', { score: answer.scoreAwarded })}</p>
      </div> : <div className="grid gap-2 sm:grid-cols-2">
        {parseOptions(question.options).map((choice) => <Button key={choice.value} variant="secondary"
          className="min-h-12 whitespace-normal text-left [overflow-wrap:anywhere]" disabled={submit.isPending || secondsLeft === 0}
          onClick={() => submit.mutate({ playerId: state.playerId, questionId: question.id, choice: choice.value,
            elapsed: Math.max(0, question.timeLimitSeconds * 1000 - (question.endsAt - time)) })}>
          {choice.label}
        </Button>)}
      </div>}
      {secondsLeft === 0 && !answer && <p role="status">{t('quizRoom.timeUp')}</p>}
      {room.isError && <p role="status" className="text-sm text-[var(--color-muted)]">{t('quizRoom.reconnecting')}</p>}
      {!answer && submit.variables?.questionId === question.id && <LiveRoomError error={submit.error} />}
      {advance.variables === question.id && <LiveRoomError error={advance.error} />}
      <p className="text-sm text-[var(--color-muted)]">{t('quizRoom.answered', { count: state.answeredCount, total: state.playerCount })}</p>
      {state.host ? <Button disabled={!canAdvance || advance.isPending} onClick={() => advance.mutate(question.id)}>
        {t(question.index === state.questionCount ? 'quizRoom.finish' : 'quizRoom.next')}
      </Button> : (answer || secondsLeft === 0) && <p className="text-sm text-[var(--color-muted)]">{t('quizRoom.waitingNext')}</p>}
    </section>}
  </LiveRoomLayout>
}
