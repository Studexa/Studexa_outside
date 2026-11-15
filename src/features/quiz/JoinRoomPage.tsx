import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'

export function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!roomCode || !nickname) {
      setError('Please enter both room code and nickname')
      return
    }
    navigate(`/quiz/lobby/${roomCode.toUpperCase()}?nickname=${encodeURIComponent(nickname)}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-md mx-auto">
        <Link to="/" className="mb-6 inline-block text-[var(--primary)] hover:underline">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold mb-6">Join Quiz Room</h1>

        <form onSubmit={handleJoin} className="space-y-4 p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div>
            <label className="block text-sm font-medium mb-1">Room Code (6 characters)</label>
            <input
              name="roomCode"
              type="text"
              maxLength="6"
              autoCapitalize="characters"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="K7P2QX"
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-center text-xl font-mono tracking-wider"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your Nickname</label>
            <input
              name="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Sokha"
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
            />
          </div>

          {error && (
            <div className="text-sm text-[var(--danger-text)] bg-[var(--danger-fill)]/10 p-3 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-lg">
            Join Room
          </Button>
        </form>

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          Ask the host for the room code, or scan their QR code.
        </p>
      </div>
    </div>
  )
}
