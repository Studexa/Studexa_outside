import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { quizApi, sessionApi } from '../../lib/api/quiz'
import { useAuth } from '../../lib/auth'
import { LiveRoomLayout } from './LiveRoomLayout'

type QuestionDraft = { text: string; choices: string; answer: string; explanation: string }
const newQuestion = (): QuestionDraft => ({ text: '', choices: '', answer: '', explanation: '' })
const choicesFrom = (value: string) => Array.from(new Set(value.split('\n').map((choice) => choice.trim()).filter(Boolean)))
const fieldClass = 'w-full rounded-xl px-3 py-2'

export function CreateRoomPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accountId = useAuth((state) => state.user?.id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()])

  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((items) => items.map((item, position) => position === index ? { ...item, ...patch } : item))
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const fields = new FormData(event.currentTarget)
    const title = String(fields.get('title') ?? '').trim() || t('quizRoom.defaultTitle')
    const subject = String(fields.get('subject') ?? '').trim() || undefined
    const timePerQuestion = Number(fields.get('timePerQuestion') || 30)
    const normalized = questions.map((question) => ({ ...question, choices: choicesFrom(question.choices) }))
    if (normalized.some(({ text, choices, answer }) => !text.trim() || choices.length < 2 || !choices.includes(answer)
      || new Set(choices.map((choice) => choice.toLowerCase())).size !== choices.length)) {
      setError(t('quizRoom.questionInvalid'))
      return
    }

    setLoading(true)
    try {
      const quiz = await quizApi.createQuiz({ title, subject, visibility: 'PRIVATE' })
      for (const question of normalized) {
        if (useAuth.getState().user?.id !== accountId) return
        await quizApi.addQuestion(quiz.id, {
          text: question.text.trim(),
          type: 'MULTIPLE_CHOICE',
          options: JSON.stringify(question.choices),
          correctAnswer: question.answer,
          explanation: question.explanation.trim() || undefined,
          subject,
          difficulty: 'MEDIUM',
          timeLimitSeconds: timePerQuestion,
        })
      }
      if (useAuth.getState().user?.id !== accountId) return
      const session = await sessionApi.createSession({ quizId: quiz.id, mode: 'LIVE_RACE', numQuestions: normalized.length, timePerQuestion })
      void navigate(`/quiz/lobby/${session.roomCode}`)
    } catch {
      setError(t('quizRoom.requestFailed'))
    } finally {
      setLoading(false)
    }
  }

  return <LiveRoomLayout title={t('quizRoom.createTitle')}>
    <p className="text-[var(--color-muted)]">{t('quizRoom.createHint')}</p>
    <form onSubmit={handleCreate} className="study-panel space-y-4">
      <fieldset disabled={loading} className="min-w-0 space-y-4">
        <label className="block space-y-1 text-sm font-bold">
          <span>{t('quizRoom.quizTitle')}</span>
          <input name="title" type="text" maxLength={200} defaultValue={t('quizRoom.defaultTitle')} className={fieldClass} />
        </label>
        <label className="block space-y-1 text-sm font-bold">
          <span>{t('quizRoom.subject')}</span>
          <input name="subject" type="text" maxLength={100} defaultValue={t('notes.general')} className={fieldClass} />
        </label>
        <label className="block space-y-1 text-sm font-bold">
          <span>{t('quizRoom.timeLimit')}</span>
          <input name="timePerQuestion" type="number" min={5} max={120} defaultValue={30} required className={fieldClass} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{t('quizRoom.questionList', { count: questions.length })}</h2>
          <Button type="button" variant="secondary" disabled={questions.length >= 50}
            onClick={() => setQuestions((items) => [...items, newQuestion()])}>{t('quizRoom.addQuestion')}</Button>
        </div>
        {questions.map((question, index) => {
          const position = { index: index + 1 }
          return <section key={index} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">{t('quizRoom.questionLabel', position)}</h3>
              {questions.length > 1 && <Button type="button" variant="ghost" size="sm"
                onClick={() => setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>{t('common.delete')}</Button>}
            </div>
            <textarea required maxLength={2000} value={question.text} aria-label={t('quizRoom.questionLabel', position)}
              onChange={(event) => updateQuestion(index, { text: event.target.value })}
              placeholder={t('quizRoom.questionPlaceholder')} rows={2} className={fieldClass} />
            <textarea required value={question.choices} aria-label={t('quizRoom.choicesLabel', position)} onChange={(event) => {
              const choices = event.target.value
              updateQuestion(index, { choices, answer: choicesFrom(choices).includes(question.answer) ? question.answer : '' })
            }} placeholder={t('quizRoom.choicesPlaceholder')} rows={3} className={fieldClass} />
            <select required value={question.answer} aria-label={t('quizRoom.answerLabel', position)}
              onChange={(event) => updateQuestion(index, { answer: event.target.value })} className={fieldClass}>
              <option value="">{t('quizRoom.selectAnswer')}</option>
              {choicesFrom(question.choices).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
            </select>
            <input value={question.explanation} aria-label={t('quizRoom.explanationLabel', position)}
              onChange={(event) => updateQuestion(index, { explanation: event.target.value })}
              placeholder={t('quizRoom.explanationPlaceholder')} className={fieldClass} />
          </section>
        })}
      </fieldset>
      {error && <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger-text)]">{error}</p>}
      <Button type="submit" full disabled={loading}>{t(loading ? 'quizRoom.creating' : 'quizRoom.createRoom')}</Button>
    </form>
  </LiveRoomLayout>
}
