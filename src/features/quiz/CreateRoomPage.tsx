import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { quizApi } from '../../lib/api/quiz'

export function CreateRoomPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const form = e.currentTarget
      const title = (form.elements.namedItem('title') as HTMLInputElement).value
      const subject = (form.elements.namedItem('subject') as HTMLInputElement).value || 'General'
      const numQuestions = parseInt(
        (form.elements.namedItem('numQuestions') as HTMLInputElement).value || '10',
      )
      const timePerQuestion = parseInt(
        (form.elements.namedItem('timePerQuestion') as HTMLInputElement).value || '30',
      )

      const session = await quizApi.sessionApi.createSession({
        quizId: '00000000-0000-0000-0000-000000000000', // placeholder - will be replaced with actual quiz
        mode: 'live_race',
        numQuestions,
        timePerQuestion,
        difficulty: 'medium',
      })

      // In a real flow, we'd create a quiz first. For now, navigate to lobby
      navigate(`/quiz/lobby/${session.roomCode}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="mb-6 inline-block text-[var(--primary)] hover:underline">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold mb-6">Create Quiz Room</h1>

        <form onSubmit={handleCreate} className="space-y-4 p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div>
            <label className="block text-sm font-medium mb-1">Quiz Title</label>
            <input
              name="title"
              type="text"
              defaultValue="My Quiz"
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              name="subject"
              type="text"
              defaultValue="General"
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Number of Questions</label>
              <input
                name="numQuestions"
                type="number"
                defaultValue="10"
                min="1"
                max="50"
                className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time per Question (s)</label>
              <input
                name="timePerQuestion"
                type="number"
                defaultValue="30"
                min="5"
                max="120"
                className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-[var(--danger-text)] bg-[var(--danger-fill)]/10 p-3 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-lg" disabled={loading}>
            {loading ? 'Creating room...' : 'Create Room'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          After creating, share the 6-character room code with your players.
        </p>
      </div>
    </div>
  )
}
