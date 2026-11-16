import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionApi, answerApi } from '../../lib/api/quiz'
import { Button } from '../../components/Button'

export function PlayPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [question, _setQuestion] = useState<any>(null)
  const [stage, setStage] = useState<'waiting' | 'question' | 'result' | 'finished'>('waiting')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      try {
        await sessionApi.getPlayers(sessionId as string)
      } catch (err: any) {
        setError(err.message || 'Failed to load session')
      }
    }
    loadSession()
  }, [sessionId])

  const handleAnswer = async (selectedAnswer: string) => {
    if (!question) return
    const responseTimeMs = 1000

    try {
      await answerApi.submitAnswer({
        sessionPlayerId: 'current-player-id',
        questionId: question.id,
        selectedAnswer,
        responseTimeMs,
      })
      setStage('result')
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="text-center p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <h2 className="text-lg font-medium mb-2">Error</h2>
          <p className="text-[var(--danger-text)] mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">Quiz Room</h1>

        {stage === 'waiting' && (
          <div className="text-center p-12 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-lg font-medium mb-2">Waiting for host to start...</h2>
            <p className="text-[var(--text-muted)]">The host will begin the quiz shortly.</p>
          </div>
        )}

        {stage === 'question' && question && (
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-lg font-medium mb-4">Question</h2>
            <p className="text-lg mb-6">{question.text}</p>
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((letter) => (
                <Button
                  key={letter}
                  variant="secondary"
                  className="w-full text-left"
                  onClick={() => handleAnswer(letter)}
                >
                  {letter}. Option {letter}
                </Button>
              ))}
            </div>
          </div>
        )}

        {stage === 'result' && (
          <div className="text-center p-12 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-lg font-medium mb-2">Answer Submitted</h2>
            <p className="text-[var(--text-muted)] mb-6">Waiting for next question...</p>
          </div>
        )}

        {stage === 'finished' && (
          <div className="text-center p-12 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-lg font-medium mb-2">Quiz Finished!</h2>
            <Button onClick={() => navigate(`/quiz/results/${sessionId}`)}>
              View Results
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
