import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { sessionApi } from '../../lib/api/quiz'

export function LobbyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const roomCode = searchParams.get('code') || ''
  const nickname = searchParams.get('nickname') || ''

  useEffect(() => {
    loadRoom()
  }, [roomCode])

  const loadRoom = async () => {
    try {
      const room = await sessionApi.getRoom(roomCode)
      setSession(room.session)
      setPlayers(room.players)
    } catch (err: any) {
      setError(err.message || 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    try {
      await sessionApi.startSession(session.id)
      navigate(`/quiz/play/${session.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to start session')
    }
  }

  const handleJoin = async () => {
    if (!nickname) {
      setError('Please enter a nickname')
      return
    }
    try {
      await sessionApi.joinSession(session.id, {
        roomCode,
        nickname,
      })
      navigate(`/quiz/lobby/${roomCode}?nickname=${encodeURIComponent(nickname)}`)
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
                  <span className="font-medium">{p.nickname}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {p.isReady ? '✓ Ready' : 'Waiting'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="font-semibold mb-4">Room Settings</h2>
            <p className="text-sm text-[var(--text-muted)] mb-2">Mode: Live Race</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">Questions: 10</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">Time per question: 30s</p>

            <Button
              className="w-full"
              onClick={handleStart}
              disabled={players.length === 0}
            >
              Start Quiz
            </Button>
          </div>
        </div>

        {!nickname && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Enter your nickname to join the room:
            </p>
            <input
              type="text"
              placeholder="Your nickname"
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
              onChange={(_e) => {
                // handled via URL param
              }}
            />
            <Button className="w-full mt-3" onClick={handleJoin}>
              Join Room
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
