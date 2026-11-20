import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Mascot } from '../../components/Mascot'
import { ProgressBar } from '../../components/ProgressBar'
import { Spinner } from '../../components/Spinner'
import { StudySamplePicker } from '../../components/StudySamplePicker'
import { useStudySamples } from '../../lib/useStudySamples'
import { celebrate } from '../../lib/confetti'
import { playSound } from '../../lib/sound'
import { aiApi, type DeckSummary, type StudyCard } from '../../lib/api'
import { aiErrorMessage } from '../../lib/aiErrors'
import { useDeckCards, useDecks } from '../../lib/study'
import { useApp } from '../../lib/store'
import { betaEnabled, maxBetaAiItems } from '../../lib/beta'
import { isGuestMode } from '../../lib/auth'

type Question = {
  id: string
  front: string
  back: string
  choices: string[]
  deckTitle: string
  deckSubject: string
  explanation: string | null
  sourceTitle: string | null
  sourceExcerpt: string | null
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function fromCards(cards: StudyCard[], deck: DeckSummary): Question[] {
  const all = cards.filter((card) => card.front.trim() && card.back.trim())
  const answers = Array.from(new Set(all.map((card) => card.back)))
  if (all.length < 4 || answers.length < 4) return []
  return shuffle(all)
    .slice(0, 10)
    .map((card) => {
      const wrong = shuffle(answers.filter((answer) => answer !== card.back)).slice(0, 3)
      return {
        id: card.id,
        front: card.front,
        back: card.back,
        choices: shuffle([card.back, ...wrong]),
        deckTitle: deck.title,
        deckSubject: deck.subjectName ?? deck.title,
        explanation: typeof card.extra.explanation === 'string' ? card.extra.explanation : null,
        sourceTitle: card.sourceTitle,
        sourceExcerpt: card.sourceExcerpt,
      }
    })
}

export function QuizPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const buddy = useApp((s) => s.buddy)
  const recordQuiz = useApp((s) => s.recordQuiz)
  const decksQuery = useDecks()
  const decks = decksQuery.data ?? []

  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [count, setCount] = useState(betaEnabled ? maxBetaAiItems : 8)
  const [sampleId, setSampleId] = useState('')
  const samplePicker = useStudySamples(betaEnabled, sampleId)
  const maxAiCount = betaEnabled ? maxBetaAiItems : 15
  const [setupError, setSetupError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const resultRecorded = useRef(false)

  const effectiveDeckId = selectedDeckId || decks[0]?.id || ''
  const selectedDeck = decks.find((deck) => deck.id === effectiveDeckId)
  const cardsQuery = useDeckCards(effectiveDeckId, Boolean(effectiveDeckId))

  const generate = useMutation({
    mutationFn: () => betaEnabled
      ? aiApi.sampleGenerate({ sampleId: samplePicker.sample!.id, task: 'QUIZ', count })
      : aiApi.generate({
        task: 'QUIZ',
        deckId: effectiveDeckId,
        sourceText: sourceText.trim() || undefined,
        sourceTitle: sourceTitle.trim() || undefined,
        count,
        language: i18n.language === 'km' ? 'km' : 'en',
      }),
    onSuccess: (data) => {
      if (!betaEnabled && !selectedDeck) return
      const built = data.items
        .filter((item) => item.choices.length >= 2 && item.choices.includes(item.back))
        .map((item, itemIndex) => ({
          id: `ai-${itemIndex}`,
          front: item.front,
          back: item.back,
          choices: shuffle(item.choices),
          deckTitle: betaEnabled ? (item.sourceTitle ?? t('beta.sample')) : (selectedDeck?.title ?? ''),
          deckSubject: betaEnabled ? t('beta.sample') : (selectedDeck?.subjectName ?? selectedDeck?.title ?? ''),
          explanation: item.explanation,
          sourceTitle: item.sourceTitle,
          sourceExcerpt: item.sourceExcerpt,
        }))
      if (built.length === 0) {
        setSetupError(t('quiz.aiNoItems'))
        return
      }
      setQuestions(built)
      setIndex(0)
      setSelected(null)
      setCorrect(0)
      setFinished(false)
      resultRecorded.current = false
      setSetupError(null)
    },
  })

  const startPractice = () => {
    if (!selectedDeck) {
      setSetupError(t('quiz.chooseDeck'))
      return
    }
    const built = fromCards(cardsQuery.data ?? [], selectedDeck)
    if (built.length === 0) {
      setSetupError(t('quiz.needMoreCards'))
      return
    }
    setQuestions(built)
    setIndex(0)
    setSelected(null)
    setCorrect(0)
    setFinished(false)
    resultRecorded.current = false
    setSetupError(null)
  }

  const question = questions[index]
  const total = questions.length
  const isCorrect = selected !== null && !!question && selected === question.back

  const reset = () => {
    setQuestions([])
    setIndex(0)
    setSelected(null)
    setCorrect(0)
    setFinished(false)
    resultRecorded.current = false
    setSetupError(null)
  }

  const choose = (choice: string) => {
    if (!question || selected) return
    setSelected(choice)
    const right = choice === question.back
    playSound(right ? 'success' : 'error')
    if (right) setCorrect((value) => value + 1)
  }

  const next = () => {
    if (index + 1 >= total) {
      if (resultRecorded.current) return
      resultRecorded.current = true
      const score = correct
      recordQuiz(score, total)
      setFinished(true)
      if (score / total >= 0.7) celebrate()
      playSound('success')
      return
    }
    setIndex((value) => value + 1)
    setSelected(null)
  }

  if (decksQuery.isLoading) {
    return <div className="flex min-h-dvh items-center justify-center"><Spinner label={t('common.loading')} /></div>
  }

  if (!betaEnabled && decks.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <Mascot species={buddy} mood="sleepy" size={140} />
        <h1 className="text-2xl font-black">{t('quiz.emptyTitle')}</h1>
        <p className="text-[var(--color-muted)]">{t('quiz.emptyHint')}</p>
        <Button onClick={() => navigate('/study/decks')}>{t('quiz.addCards')}</Button>
        {!isGuestMode() && <Link to="/quiz" className="study-text-link">{t('quizRoom.liveRooms')}</Link>}
      </div>
    )
  }

  if (finished) {
    const accuracy = Math.round((correct / total) * 100)
    const xp = 10 + correct * 2 + (correct === total ? 20 : 0)
    const great = accuracy >= 70
    const references = questions
      .filter((item) => item.sourceExcerpt)
      .filter((item, itemIndex, list) =>
        list.findIndex((other) => other.sourceExcerpt === item.sourceExcerpt) === itemIndex,
      )
      .slice(0, 6)
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 p-4 sm:p-6">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)]">
          <div className="mx-auto w-fit animate-pop-in">
            <Mascot species={buddy} mood={great ? 'sparkle' : 'happy'} size={150} accessory={great ? 'hat' : null} />
          </div>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">{t('quiz.resultsKicker')}</p>
          <h1 className="mt-1 text-2xl font-black">{t('quiz.resultsTitle')}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {great ? t('quiz.resultsGreat') : t('quiz.resultsTry')}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[var(--color-primary-soft)] p-3">
              <p className="text-2xl font-black text-[var(--color-primary)]">
                {correct}/{total}
              </p>
              <p className="text-[11px] font-bold text-[var(--color-muted)]">{t('quiz.score')}</p>
            </div>
            <div className="rounded-2xl bg-[var(--color-success-soft)] p-3">
              <p className="text-2xl font-black text-[var(--color-success)]">{accuracy}%</p>
              <p className="text-[11px] font-bold text-[var(--color-muted)]">{t('review.accuracy')}</p>
            </div>
            <div className="rounded-2xl bg-[var(--color-accent-soft)] p-3">
              <p className="text-2xl font-black text-[var(--color-accent)]">+{xp}</p>
              <p className="text-[11px] font-bold text-[var(--color-muted)]">XP</p>
            </div>
          </div>

          {references.length > 0 && (
            <div className="mt-4 space-y-2 text-left">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {t('quiz.references')}
              </p>
              {references.map((item) => (
                <div key={item.id} className="rounded-2xl bg-[var(--color-surface-alt)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-primary)]">
                    {item.sourceTitle || t('decks.source')}
                  </p>
                  <p className="mt-1 text-xs italic text-[var(--color-muted)]">“{item.sourceExcerpt}”</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 space-y-2">
            <Button full size="lg" onClick={reset}>
              <Icon name="reset" size={19} /> {t('quiz.playAgain')}
            </Button>
            <Button full variant="secondary" onClick={() => navigate('/study')}>
              {t('quiz.backToStudy')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-6">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
          <div className="flex items-start gap-3">
            <Mascot species={buddy} mood="happy" size={82} />
            <div>
              <h1 className="text-2xl font-black">{t('quiz.setupTitle')}</h1>
              <p className="text-sm text-[var(--color-muted)]">{t(betaEnabled ? 'beta.quizHint' : 'quiz.setupHint')}</p>
              {!isGuestMode() && <Link to="/quiz" className="study-text-link mt-2">{t('quizRoom.liveRooms')}</Link>}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {decks.length > 0 && <div>
              <label className="text-sm font-bold" htmlFor="quiz-deck">{t('quiz.deck')}</label>
              <select
                id="quiz-deck"
                value={effectiveDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="mt-1 w-full rounded-2xl px-4 py-2.5"
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.title} · {t('decks.cardCount', { count: deck.cardCount })}
                  </option>
                ))}
              </select>
            </div>}
            {betaEnabled ? <StudySamplePicker {...samplePicker} onChange={setSampleId} /> : <>
            <div>
              <label className="text-sm font-bold" htmlFor="quiz-source-title">{t('decks.sourceTitle')}</label>
              <input
                id="quiz-source-title"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder={t('decks.sourceTitlePlaceholder')}
                className="mt-1 w-full rounded-2xl px-4 py-2.5"
              />
            </div>
            <div>
              <label className="text-sm font-bold" htmlFor="quiz-source">{t('decks.sourceNotes')}</label>
              <textarea
                id="quiz-source"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={4}
                placeholder={t('decks.sourceNotesPlaceholder')}
                className="mt-1 w-full resize-none rounded-2xl px-4 py-3 text-sm"
              />
            </div>
            </>}
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-bold" htmlFor="quiz-count">{t('quiz.questionCount')}</label>
              <input
                id="quiz-count"
                type="number"
                min={1}
                max={maxAiCount}
                value={count}
                onChange={(e) => setCount(Math.min(maxAiCount, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
                className="w-24 rounded-2xl px-3 py-2 text-center font-bold"
              />
            </div>

            {setupError && (
              <p className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--color-danger)]">
                {setupError}
              </p>
            )}
            {generate.isError && (
              <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--color-danger)]">
                {aiErrorMessage(t, generate.error)}
              </p>
            )}

            <Button full size="lg" onClick={() => generate.mutate()}
              disabled={generate.isPending || (betaEnabled ? !samplePicker.sample : !effectiveDeckId)}>
              <Icon name="sparkles" size={19} />
              {generate.isPending ? t('decks.generating') : t('quiz.generateAI')}
            </Button>
            <Button
              full
              variant="secondary"
              onClick={startPractice}
              disabled={cardsQuery.isLoading || !selectedDeck}
            >
              {cardsQuery.isLoading ? t('common.loading') : t('quiz.practiceSaved')}
            </Button>
            <Link to="/study/decks" className="block text-center text-xs font-bold text-[var(--color-muted)]">
              {t('decks.backToDecks')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-4">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate('/study')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
          aria-label={t('common.exit')}
        >
          <Icon name="close" size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--color-muted)]">
            <span>{t('quiz.title')}</span>
            <span>
              {index + 1} / {total}
            </span>
          </div>
          <ProgressBar value={index} max={total} size="sm" />
        </div>
        <span className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-[var(--color-success-soft)] px-3 text-sm font-black text-[var(--color-success)]">
          <Icon name="check" size={16} /> {correct}
        </span>
      </header>

      <div className="flex flex-1 flex-col justify-center py-5">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--color-primary)]">
              {question.deckSubject}
            </span>
            <span className="truncate text-[11px] font-bold text-[var(--color-muted)]">{question.deckTitle}</span>
          </div>
          <p className="mt-4 text-xl font-extrabold leading-snug sm:text-2xl">{question.front}</p>

          <div className="mt-5 grid gap-2">
            {question.choices.map((choice) => {
              const right = choice === question.back
              const chosen = choice === selected
              let tone = 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
              if (selected) {
                if (right) tone = 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]'
                else if (chosen) tone = 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]'
                else tone = 'border-[var(--color-border)] opacity-55'
              }
              return (
                <button
                  key={choice}
                  onClick={() => choose(choice)}
                  disabled={!!selected}
                  className={`min-h-13 rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition ${tone}`}
                >
                  {choice}
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="mt-4 animate-pop-in">
              <div
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold ${
                  isCorrect
                    ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                    : 'bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]'
                }`}
              >
                <Icon name={isCorrect ? 'checkCircle' : 'xCircle'} size={18} />
                {isCorrect ? t('quiz.correct') : t('quiz.wrong', { answer: question.back })}
              </div>
              {question.explanation && (
                <p className="mt-2 rounded-2xl bg-[var(--color-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--color-muted)]">
                  {question.explanation}
                </p>
              )}
              <Button full className="mt-3" onClick={next}>
                {index + 1 >= total ? t('quiz.seeResults') : t('quiz.next')}
                <Icon name="arrowRight" size={18} />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
          <Mascot species={buddy} mood="happy" size={42} />
          {t('quiz.hint')}
        </div>
      </div>
    </div>
  )
}
