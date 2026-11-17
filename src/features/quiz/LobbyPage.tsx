import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { quizApi, sessionApi } from '../../lib/api/quiz'
import { useAuth } from '../../lib/auth'

export function LobbyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const params = useParams()
  const { user } = useAuth()

  // The route is /quiz/lobby/:code — the code comes from the path, not the query.
  const roomCode = (params.code ?? '').toUpperCase()

  const [session, setSession] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [nickname, setNickname] = useState(searchParams.get('nickname') ?? '')
  const [questionCount, setQuestionCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomCode) {
      setError('Missing room code')
      setLoading(false)
      return
    }

    let cancelled = false
    const loadRoom = async () => {
      try {
        const room = await sessionApi.getRoom(roomCode)
        if (cancelled) return
        setSession(room.session)
        setPlayers(room.players)

        const mine = room.players.find((p) => p.userId && p.userId === user?.id)
        if (mine) {
          setPlayerId(mine.id)
        }

        try {
          const quiz = await quizApi.getQuiz(room.session.quizId)
          if (!cancelled) setQuestionCount(quiz.questions.length)
        } catch {
          // Non-fatal: the room is still usable, the start button stays guarded.
          if (!cancelled) setQuestionCount(null)
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load room')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadRoom()
    return () => {
      cancelled = true
    }
  }, [roomCode, user?.id])

  const handleStart = async () => {
    if (questionCount === 0) {
      setError('This quiz has no questions yet. Add questions before starting.')
      return
    }
    try {
      await sessionApi.startSession(session.id)
      const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : ''
      navigate(`/quiz/play/${session.id}${query}`)
    } catch (err: any) {
      setError(err.message || 'Failed to start session')
    }
  }

  const handleJoin = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setError('Please enter a nickname')
      return
    }
    try {
      const player = await sessionApi.joinSession(session.id, {
        roomCode,
        nickname: trimmed,
      })
      setPlayerId(player.id)
      setPlayers((current) =>
        current.some((p) => p.id === player.id) ? current : [...current, player],
      )
      navigate(`/quiz/lobby/${roomCode}?nickname=${encodeURIComponent(trimmed)}`, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Failed to join room')
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
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-[var(--primary)] hover:underline">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">Room {roomCode}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="font-semibold mb-4">Players ({players.length})</h2>
            <ul className="space-y-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded border border-[var(--border)]/50"
                >
                  <span className="font-medium">
                    {p.nickname}
                    {p.id === playerId ? ' (you)' : ''}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {p.isHost ? 'Host' : p.isReady ? '✓ Ready' : 'Waiting'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="font-semibold mb-4">Room Settings</h2>
            <p className="text-sm text-[var(--text-muted)] mb-2">Mode: Live Race</p>
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Questions: {questionCount ?? '…'}
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-4">Time per question: 30s</p>

            {questionCount === 0 && (
              <p className="text-sm text-[var(--warning-text)] mb-3">
                This quiz has no questions yet, so it cannot start.
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleStart}
              disabled={players.length === 0 || questionCount === 0}
            >
              Start Quiz
            </Button>
          </div>
        </div>

        {!playerId && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Enter your nickname to join the room:
            </p>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
              placeholder="Your nickname"
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
            />
            <Button className="w-full mt-3" onClick={handleJoin} disabled={!nickname.trim()}>
              Join Room
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
