import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { quizApi, sessionApi } from '../../lib/api/quiz'

type QuestionDraft = { text: string; choices: string; answer: string; explanation: string }
const newQuestion = (): QuestionDraft => ({ text: '', choices: '', answer: '', explanation: '' })

export function CreateRoomPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()])
  const navigate = useNavigate()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const form = e.currentTarget as HTMLFormElement
      const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim() || 'My Quiz'
      const subject = (form.elements.namedItem('subject') as HTMLInputElement).value.trim()
      const timePerQuestion = parseInt(
        (form.elements.namedItem('timePerQuestion') as HTMLInputElement).value || '30',
      )
      const normalizedQuestions = questions.map((question) => {
        const choices = Array.from(new Set(question.choices.split('\n').map((choice) => choice.trim()).filter(Boolean)))
        return { ...question, choices }
      })
      if (normalizedQuestions.some((question) =>
        !question.text.trim() || question.choices.length < 2 || !question.choices.includes(question.answer),
      )) {
        throw new Error('Each question needs a prompt, at least two choices, and a correct choice.')
      }

      // A live session must reference a real quiz, so create the quiz first.
      const quiz = await quizApi.createQuiz({
        title,
        subject: subject || undefined,
        visibility: 'PRIVATE',
      })

      for (const question of normalizedQuestions) {
        await quizApi.addQuestion(quiz.id, {
          text: question.text.trim(),
          type: 'MULTIPLE_CHOICE',
          options: JSON.stringify(question.choices),
          correctAnswer: question.answer,
          explanation: question.explanation.trim() || undefined,
          subject: subject || undefined,
          difficulty: 'MEDIUM',
          timeLimitSeconds: timePerQuestion,
        })
      }

      const session = await sessionApi.createSession({
        quizId: quiz.id,
        mode: 'LIVE_RACE',
        numQuestions: normalizedQuestions.length,
        timePerQuestion,
        difficulty: 'medium',
      })

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
          <div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="timePerQuestion">Time per Question (s)</label>
              <input
                name="timePerQuestion"
                id="timePerQuestion"
                type="number"
                defaultValue="30"
                min="5"
                max="120"
                className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Questions ({questions.length}/50)</h2>
              <Button type="button" variant="secondary" disabled={questions.length >= 50}
                onClick={() => setQuestions((items) => [...items, newQuestion()])}>
                Add question
              </Button>
            </div>
            {questions.map((question, index) => {
              const choices = question.choices.split('\n').map((choice) => choice.trim()).filter(Boolean)
              return (
                <section key={index} className="space-y-3 rounded-lg border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Question {index + 1}</h3>
                    {questions.length > 1 && <button type="button" className="text-sm text-[var(--danger-text)]"
                      onClick={() => setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                      Remove
                    </button>}
                  </div>
                  <textarea required maxLength={2000} value={question.text} aria-label={`Question ${index + 1}`}
                    onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))}
                    placeholder="Write the question" rows={2}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
                  <textarea required value={question.choices} aria-label={`Choices for question ${index + 1}`}
                    onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, choices: event.target.value, answer: event.target.value.split('\n').map((choice) => choice.trim()).find((choice) => choice === item.answer) ?? '' } : item))}
                    placeholder="One answer choice per line" rows={3}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
                  <select required value={question.answer} aria-label={`Correct answer for question ${index + 1}`}
                    onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item))}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                    <option value="">Choose the correct answer</option>
                    {choices.map((choice, choiceIndex) => <option key={`${choice}-${choiceIndex}`} value={choice}>{choice}</option>)}
                  </select>
                  <input value={question.explanation} aria-label={`Explanation for question ${index + 1}`}
                    onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, explanation: event.target.value } : item))}
                    placeholder="Explanation (optional)"
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
                </section>
              )
            })}
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
