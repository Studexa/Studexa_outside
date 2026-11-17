import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { useAuth } from '../../lib/auth'
import { quizApi, sessionApi, answerApi } from '../../lib/api/quiz'
import type { QuizDto } from '../../types/quiz'
import { connectWebSocket, disconnectWebSocket, publishMessage } from '../../lib/websocket'

type Choice = { value: string; label: string }
type LiveQuestion = { id: string; text: string; options: Choice[]; index: number; timeLimitSeconds: number; endsAt: number }
type AnswerResult = { isCorrect: boolean; scoreAwarded: number; correctAnswer: string; explanation?: string }
type RoomEvent = { type: string; id?: string; text?: string; options?: string; index?: number; timeLimitSeconds?: number; endsAt?: number }

function parseOptions(value?: string): Choice[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.map((option) => {
      if (typeof option === 'string') return { value: option, label: option }
      if (option && typeof option === 'object' && 'text' in option) {
        const label = String(option.text)
        const value = 'id' in option ? String(option.id) : label
        return { value, label }
      }
      return { value: '', label: '' }
    }).filter((option) => option.label && option.value)
  } catch {
    return []
  }
}

export function PlayPage() {
  const { sessionId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useAuth((state) => state.user)
  const playerId = searchParams.get('playerId') ?? ''
  const roomCode = (searchParams.get('roomCode') ?? '').toUpperCase()
  const initialQuestionSent = useRef(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [questions, setQuestions] = useState<QuizDto.QuestionResponse[]>([])
  const [question, setQuestion] = useState<LiveQuestion | null>(null)
  const [stage, setStage] = useState<'waiting' | 'question' | 'result'>('waiting')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!sessionId || !roomCode || !playerId) {
        setError('This room link is incomplete. Return to the lobby and rejoin.')
        setLoading(false)
        return
      }
      try {
        const room = await sessionApi.getRoom(roomCode)
        if (room.session.id !== sessionId) throw new Error('This room code does not match the session.')
        const currentPlayer = room.players.find((player) => player.id === playerId)
        if (!currentPlayer) throw new Error('You are not a member of this room. Rejoin from the lobby.')
        const host = Boolean(user?.id && room.session.hostId === user.id)
        if (cancelled) return
        setIsHost(host)
        if (host) {
          const quiz = await quizApi.getQuiz(room.session.quizId)
          let requestedCount = quiz.questions.length
          try {
            const settings = JSON.parse(room.session.settings ?? '{}') as { numQuestions?: number }
            if (Number.isFinite(settings.numQuestions)) requestedCount = Math.min(requestedCount, Math.max(1, Math.trunc(settings.numQuestions!)))
          } catch {
            // Use all available questions when old room settings cannot be parsed.
          }
          if (!cancelled) setQuestions(quiz.questions.slice(0, requestedCount))
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load this room.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [sessionId, roomCode, playerId, user?.id])

  const advance = useCallback((index: number) => {
    if (index >= questions.length) {
      publishMessage('/app/quiz.end', { roomCode })
      return
    }
    const next = questions[index]
    if (!next) return
    publishMessage('/app/quiz.next', { roomCode, questionIndex: index + 1, questionId: next.id })
  }, [questions, roomCode])

  useEffect(() => {
    if (loading || error || !playerId || !roomCode) return
    const client = connectWebSocket(roomCode, (_destination, rawEvent) => {
      const event = rawEvent as RoomEvent
      if (event.type === 'QUESTION' && event.id && event.text) {
        const timeLimitSeconds = Math.min(600, Math.max(1, event.timeLimitSeconds ?? 30))
        setQuestion({
          id: event.id,
          text: event.text,
          options: parseOptions(event.options),
          index: event.index ?? 0,
          timeLimitSeconds,
          endsAt: event.endsAt ?? Date.now() + timeLimitSeconds * 1000,
        })
        setSelectedAnswer(null)
        setAnswerResult(null)
        setStage('question')
      } else if (event.type === 'ROOM_FINISHED') {
        navigate(`/quiz/results/${sessionId}`, { replace: true })
      }
    }, () => {
      setConnected(true)
      if (isHost && !initialQuestionSent.current) {
        initialQuestionSent.current = true
        advance(0)
      }
    }, () => setConnected(false))

    return () => {
      if (client) disconnectWebSocket()
    }
  }, [loading, error, playerId, roomCode, sessionId, isHost, advance, navigate])

  useEffect(() => {
    if (!question) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [question])

  const submitAnswer = async (choice: string) => {
    if (!question || !playerId || submitting || selectedAnswer || now > question.endsAt) return
    setSelectedAnswer(choice)
    setSubmitting(true)
    try {
      const result = await answerApi.submitAnswer({
        sessionPlayerId: playerId,
        questionId: question.id,
        selectedAnswer: choice,
        responseTimeMs: Math.max(0, question.timeLimitSeconds * 1000 - (question.endsAt - now)),
      })
      setAnswerResult(result)
      setStage('result')
      publishMessage('/app/quiz.answer', { roomCode, questionId: question.id })
    } catch (submitError) {
      setSelectedAnswer(null)
      setError(submitError instanceof Error ? submitError.message : 'Could not submit your answer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading quiz…</div>
  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <h1 className="mb-2 text-xl font-semibold">Unable to join quiz</h1>
        <p className="mb-4 text-[var(--danger-text)]">{error}</p>
        <Button onClick={() => navigate(`/quiz/lobby/${roomCode}`)}>Return to lobby</Button>
      </div>
    </div>
  )

  const secondsLeft = question ? Math.max(0, Math.ceil((question.endsAt - now) / 1000)) : 0
  return (
    <main className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text)] sm:p-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div><p className="text-sm text-[var(--text-muted)]">Room {roomCode}</p><h1 className="text-2xl font-bold">Live quiz</h1></div>
          <span className={`text-sm ${connected ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'}`}>
            {connected ? 'Connected' : 'Reconnecting…'}
          </span>
        </header>
        {stage === 'waiting' && <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h2 className="text-xl font-semibold">Waiting for the host</h2>
          <p className="mt-2 text-[var(--text-muted)]">The next question will appear here.</p>
        </section>}
        {stage === 'question' && question && <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center justify-between"><p className="text-sm text-[var(--text-muted)]">Question {question.index}</p>
            <p aria-live="polite" className={`font-mono font-bold ${secondsLeft <= 5 ? 'text-[var(--danger-text)]' : ''}`}>{secondsLeft}s</p></div>
          <h2 className="mb-6 text-xl font-semibold">{question.text}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((choice, index) => <Button key={`${index}-${choice.value}`} variant={selectedAnswer === choice.value ? 'primary' : 'secondary'}
              disabled={Boolean(selectedAnswer) || submitting || secondsLeft === 0}
              onClick={() => void submitAnswer(choice.value)} className="min-h-14 whitespace-normal text-left">
              {choice.label}
            </Button>)}
          </div>
          {secondsLeft === 0 && !selectedAnswer && <p className="mt-4 text-sm text-[var(--danger-text)]">Time is up.</p>}
          {isHost && secondsLeft === 0 && <Button className="mt-5" disabled={!connected}
            onClick={() => advance(question.index)}>Continue</Button>}
        </section>}
        {stage === 'result' && <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <h2 className="text-2xl font-bold">{answerResult?.isCorrect ? 'Correct!' : 'Answer submitted'}</h2>
          <p className="mt-2">Correct answer: <strong>{answerResult?.correctAnswer}</strong></p>
          {answerResult?.explanation && <p className="mt-2 text-[var(--text-muted)]">{answerResult.explanation}</p>}
          <p className="mt-3 font-semibold">+{answerResult?.scoreAwarded ?? 0} points</p>
          {isHost && <Button className="mt-5" disabled={!connected} onClick={() => advance(question?.index ?? 0)}>
            {question && question.index >= questions.length ? 'Finish quiz' : 'Next question'}
          </Button>}
          {!isHost && <p className="mt-4 text-sm text-[var(--text-muted)]">Waiting for the host to continue…</p>}
        </section>}
      </div>
    </main>
  )
}
