import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'

export function LandingPage() {
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">Studexa</h1>
        <p className="text-[var(--text-muted)] mb-8">
          Live multiplayer quiz rooms. Host a quiz, invite friends, play together.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Button
            className="w-full py-4 text-xl"
            onClick={() => setMode('create')}
          >
            🎯 Create Room
          </Button>
          <Button
            variant="outline"
            className="w-full py-4 text-xl"
            onClick={() => setMode('join')}
          >
            🔗 Join Room
          </Button>
        </div>

        {mode === 'create' && (
          <div className="mt-8 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Create a quiz room and get a 6-character code to share with players.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/quiz/create')}
            >
              Create New Room
            </Button>
          </div>
        )}

        {mode === 'join' && (
          <div className="mt-8 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Enter the 6-character room code from the host.
            </p>
            <Link to="/quiz/join" className="w-full">
              <Button className="w-full">Enter Room Code</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
