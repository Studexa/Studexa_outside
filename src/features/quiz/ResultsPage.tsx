import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionApi } from '../../lib/api/quiz'
import { Button } from '../../components/Button'

export function ResultsPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  [error]
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResults()
  }, [sessionId])

  const loadResults = async () => {
    try {
      const board = await sessionApi.getLeaderboard(sessionId as string)
      setLeaderboard(board)
    } catch (err: any) {
      setError(err.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    )
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Results</h1>
          <p className="text-[var(--text-muted)]">Quiz session complete</p>
        </div>

        <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <h2 className="font-semibold mb-4">Leaderboard</h2>
          <ol className="space-y-3">
            {leaderboard.map((entry, idx) => (
              <li
                key={idx}
                className={`flex items-center justify-between p-3 rounded ${
                  idx === 0
                    ? 'bg-[var(--accent-fill)]/20 border border-[var(--accent-fill)]/50'
                    : 'border border-[var(--border)]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${idx < 3 ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'}`}>
                    #{idx + 1}
                  </span>
                  <span className="font-medium">{entry.nickname}</span>
                  {entry.isHost && <span className="text-xs text-[var(--text-muted)]">(host)</span>}
                </div>
                <span className="font-mono font-bold">{entry.totalScore} pts</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={() => navigate('/')}>Back to Home</Button>
          <Button variant="outline" onClick={() => navigate(`/quiz/lobby/${sessionId}`)}>
            Play Again
          </Button>
        </div>
      </div>
    </div>
  )
}
