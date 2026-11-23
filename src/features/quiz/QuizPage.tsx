import { useEffect, useRef, useState } from 'react'
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
import { useLocalizedStarter } from '../../lib/starterContent'
import { starterQuizExplanation } from './starterQuizExplanations'
import './soloQuiz.css'

type Question = {
  id: string
  front: string
  back: string
  choices: string[]
  deckTitle: string
  deckSubject: string
  starterDeckId?: string
  explanation: string | null
  sourceTitle: string | null
  sourceExcerpt: string | null
}

type Stage = 'intro' | 'setup' | 'ready' | 'play' | 'results' | 'flashcards-before' | 'flashcards-after'
type Outcome = { kind: 'correct' | 'incorrect'; choice: string } | { kind: 'timeout' }
type Round = { index: number; deadline: number | null; outcome?: Outcome }
const secondsPerQuestion = 40

function Countdown({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(secondsPerQuestion)
  const { t } = useTranslation()

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSeconds(remaining)
      if (remaining === 0) onExpire()
    }
    const clock = window.setInterval(tick, 125)
    tick()
    return () => window.clearInterval(clock)
  }, [deadline, onExpire])

  return <span className="solo-quiz-countdown" role="timer">
    <Icon name="timer" size={16} />{t('quiz.secondsRemaining', { count: seconds })}
  </span>
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
  const answers = Array.from(new Set(all.map((card) => card.back.trim())))
  if (all.length < 4 || answers.length < 4) return []
  return shuffle(all)
    .slice(0, 10)
    .map((card) => {
      const back = card.back.trim()
      const wrong = shuffle(answers.filter((answer) => answer !== back)).slice(0, 3)
      return {
        id: card.id,
        front: card.front,
        back,
        choices: shuffle([back, ...wrong]),
        deckTitle: deck.title,
        deckSubject: deck.subjectName ?? deck.title,
        starterDeckId: isGuestMode() ? deck.id : undefined,
        explanation: typeof card.extra.explanation === 'string' ? card.extra.explanation.trim() : null,
        sourceTitle: card.sourceTitle,
        sourceExcerpt: card.sourceExcerpt,
      }
    })
}

export function QuizPage() {
  const { t, i18n } = useTranslation()
  const starter = useLocalizedStarter()
  const navigate = useNavigate()
  const buddy = useApp((s) => s.buddy)
  const recordQuiz = useApp((s) => s.recordQuiz)
  const decksQuery = useDecks(true, false)
  const decks = decksQuery.data ?? []

  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [count, setCount] = useState(betaEnabled ? maxBetaAiItems : 8)
  const [sampleId, setSampleId] = useState('')
  const samplePicker = useStudySamples(betaEnabled, sampleId)
  const maxAiCount = betaEnabled ? maxBetaAiItems : 15
  const [setupError, setSetupError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('intro')
  const [timed, setTimed] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [round, setRound] = useState<Round | null>(null)
  // Guard clicks and timer callbacks synchronously, before React renders the result.
  const currentRound = useRef<Round | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [flashIndex, setFlashIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const activeTitle = useRef<HTMLHeadingElement>(null)
  const nextAction = useRef<HTMLButtonElement>(null)

  const effectiveDeckId = selectedDeckId || decks[0]?.id || ''
  const selectedDeck = decks.find((deck) => deck.id === effectiveDeckId)
  const cardsQuery = useDeckCards(effectiveDeckId, Boolean(effectiveDeckId))

  const prepare = (built: Question[]) => {
    setQuestions(built)
    setSetupError(null)
    setStage('ready')
  }

  const updateRound = (value: Round | null) => {
    currentRound.current = value
    setRound(value)
  }

  const openQuestion = (index: number) => {
    updateRound({ index, deadline: timed ? Date.now() + secondsPerQuestion * 1000 : null })
  }

  const startQuiz = () => {
    if (!questions.length || currentRound.current) return
    setOutcomes([])
    openQuestion(0)
    setStage('play')
  }

  const openFlashcards = (origin: 'before' | 'after') => {
    setFlashIndex(0)
    setFlipped(false)
    setStage(origin === 'before' ? 'flashcards-before' : 'flashcards-after')
  }

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
      const built = data.items.flatMap((item, itemIndex): Question[] => {
        const back = item.back.trim()
        const choices = [...new Set(item.choices.map((choice) => choice.trim()).filter(Boolean))]
        if (!item.front.trim() || !back || choices.length !== 4 || !choices.includes(back)) return []
        return [{
          id: `ai-${itemIndex}`,
          front: item.front,
          back,
          choices: shuffle(choices),
          deckTitle: betaEnabled ? (item.sourceTitle ?? t('beta.sample')) : (selectedDeck?.title ?? ''),
          deckSubject: betaEnabled ? t('beta.sample') : (selectedDeck?.subjectName ?? selectedDeck?.title ?? ''),
          explanation: item.explanation?.trim() ?? null,
          sourceTitle: item.sourceTitle,
          sourceExcerpt: item.sourceExcerpt,
        }]
      })
      if (built.length === 0) {
        setSetupError('quiz.aiNoItems')
        return
      }
      prepare(built)
    },
  })

  const startPractice = () => {
    if (!selectedDeck) {
      setSetupError('quiz.chooseDeck')
      return
    }
    const built = fromCards(cardsQuery.data ?? [], selectedDeck)
    if (built.length === 0) {
      setSetupError('quiz.needMoreCards')
      return
    }
    prepare(built)
  }

  const question = round && questions[round.index]
  const outcome = round?.outcome
  const total = questions.length
  const correct = outcomes.filter((entry) => entry.kind === 'correct').length
  const setupLoading = stage === 'setup' && decksQuery.isLoading
  const localCard = (item: Question, value: string) => starter.card(item.starterDeckId, value)
  const explanationFor = (item: Question) => item.explanation || starterQuizExplanation(item, i18n.resolvedLanguage)

  useEffect(() => {
    if (setupLoading) return
    window.scrollTo(0, 0)
    activeTitle.current?.focus({ preventScroll: true })
  }, [stage, round?.index, setupLoading])

  useEffect(() => {
    if (outcome) nextAction.current?.focus()
  }, [outcome])

  const reset = () => {
    generate.reset()
    setQuestions([])
    setOutcomes([])
    setSetupError(null)
    updateRound(null)
    setStage('setup')
  }

  const settle = (choice: string | null) => {
    if (!round || !question || outcome || currentRound.current !== round) return
    const expired = round.deadline !== null && Date.now() >= round.deadline
    if (!expired && (choice === null || !question.choices.includes(choice))) return
    const result: Outcome = expired || choice === null
      ? { kind: 'timeout' }
      : { kind: choice === question.back ? 'correct' : 'incorrect', choice }
    updateRound({ ...round, outcome: result })
    setOutcomes((previous) => [...previous, result])
    playSound(result.kind === 'correct' ? 'success' : 'error')
  }

  const next = () => {
    if (!round || !outcome || currentRound.current !== round) return
    if (round.index + 1 < total) {
      openQuestion(round.index + 1)
      return
    }
    updateRound(null)
    recordQuiz(correct, total)
    setStage('results')
    if (correct / total >= 0.7) celebrate()
    playSound('success')
  }

  const answerDetail = (item: Question) => {
    const explanation = explanationFor(item)
    return <>
      <p className="font-bold">{t('quiz.answerText', { answer: localCard(item, item.back) })}</p>
      {explanation && <p className="mt-2">{explanation}</p>}
    </>
  }

  if (stage === 'intro') {
    return <div className="solo-quiz-screen solo-quiz-intro" role="main">
      <div className="solo-quiz-card solo-quiz-welcome text-center">
        <Mascot species={buddy} mood="sparkle" size={156} className="solo-quiz-mascot" />
        <h1 ref={activeTitle} tabIndex={-1}>{t('quiz.welcomeTitle')}</h1>
        <p>{t('quiz.welcomeHint')}</p>
        <Button full size="lg" onClick={() => setStage('setup')}>
          {t('quiz.beginSetup')} <Icon name="arrowRight" size={18} />
        </Button>
        <Link to="/study" className="study-text-link">{t('quiz.backToStudy')}</Link>
      </div>
    </div>
  }

  if (setupLoading) {
    return <div role="main" className="solo-quiz-screen items-center"><Spinner label={t('common.loading')} /></div>
  }

  if (stage === 'setup' && !betaEnabled && decksQuery.isError && !decks.length) {
    return <div className="solo-quiz-screen" role="main">
      <div className="solo-quiz-card space-y-3 text-center">
        <h1 className="text-2xl font-black">{t('workspace.deckError')}</h1>
        <Button onClick={() => void decksQuery.refetch()}>{t('common.retry')}</Button>
      </div>
    </div>
  }

  if (stage === 'setup' && !betaEnabled && decks.length === 0) {
    return (
      <div role="main" className="solo-quiz-screen items-center text-center">
        <Mascot species={buddy} mood="sleepy" size={140} />
        <h1 ref={activeTitle} tabIndex={-1} className="text-2xl font-black">{t('quiz.emptyTitle')}</h1>
        <p className="text-[var(--color-muted)]">{t('quiz.emptyHint')}</p>
        <Button onClick={() => navigate('/study/decks')}>{t('quiz.addCards')}</Button>
        {!isGuestMode() && <Link to="/quiz" className="study-text-link">{t('quizRoom.liveRooms')}</Link>}
      </div>
    )
  }

  if (stage === 'results') {
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
      <div className="solo-quiz-screen solo-quiz-results" role="main">
        <div className="solo-quiz-card solo-quiz-score text-center">
          <div className="mx-auto w-fit animate-pop-in">
            <Mascot species={buddy} mood={great ? 'sparkle' : 'happy'} size={150} accessory={great ? 'hat' : null} />
          </div>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">{t('quiz.resultsKicker')}</p>
          <h1 ref={activeTitle} tabIndex={-1} className="mt-1 text-2xl font-black">{t('quiz.resultsTitle')}</h1>
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
              <p className="text-2xl font-black text-[var(--color-success-text)]">{accuracy}%</p>
              <p className="text-[11px] font-bold text-[var(--color-muted)]">{t('review.accuracy')}</p>
            </div>
            <div className="rounded-2xl bg-[var(--color-accent-soft)] p-3">
              <p className="text-2xl font-black text-[var(--color-accent-text)]">+{xp}</p>
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
            <Button full size="lg" onClick={() => openFlashcards('after')}>
              <Icon name="cards" size={19} /> {t('quiz.studyAsCards')}
            </Button>
            <Button full variant="secondary" onClick={reset}>
              <Icon name="reset" size={19} /> {t('quiz.playAgain')}
            </Button>
            <Button full variant="secondary" onClick={() => navigate('/study')}>
              {t('quiz.backToStudy')}
            </Button>
          </div>
        </div>
        <section className="solo-quiz-card">
          <h2 className="text-lg font-extrabold">{t('quiz.answerReview')}</h2>
          <ol className="solo-quiz-review">
            {questions.map((item, index) => {
              const entry = outcomes[index]
              return <li key={item.id}>
                <details>
                  <summary>
                    <span>{index + 1}. {localCard(item, item.front)}</span>
                    <strong data-outcome={entry.kind}>{t(`quiz.outcome.${entry.kind}`)}</strong>
                  </summary>
                  <div className="solo-quiz-review-detail">
                    {'choice' in entry && <p className="study-muted">{t('quiz.yourAnswer', { answer: localCard(item, entry.choice) })}</p>}
                    {answerDetail(item)}
                  </div>
                </details>
              </li>
            })}
          </ol>
        </section>
      </div>
    )
  }

  if (stage === 'setup') {
    return (
      <div className="solo-quiz-screen solo-quiz-setup" role="main">
        <div className="solo-quiz-card">
          <div className="flex items-center gap-3 rounded-(--radius-card) bg-[var(--color-primary-soft)] p-3">
            <Mascot species={buddy} mood="happy" size={82} />
            <div>
              <h1 ref={activeTitle} tabIndex={-1} className="text-2xl font-black">{t('quiz.setupTitle')}</h1>
              <p className="text-sm text-[var(--color-muted)]">{t(betaEnabled ? 'beta.quizHint' : 'quiz.setupHint')}</p>
              {!isGuestMode() && <Link to="/quiz" className="study-text-link mt-2">{t('quizRoom.liveRooms')}</Link>}
            </div>
          </div>

          <fieldset className="mt-5 space-y-3" disabled={generate.isPending}>
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
                    {starter.deck(deck.id, deck.title)} · {t('decks.cardCount', { count: deck.cardCount })}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
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

            <label className="solo-quiz-timing">
              <input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} />
              <span>{t('quiz.timedPractice', { count: secondsPerQuestion })}</span>
            </label>

            {setupError && (
              <p className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--color-danger-text)]">
                {t(setupError)}
              </p>
            )}
            {generate.isError && (
              <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--color-danger-text)]">
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
              disabled={cardsQuery.isLoading || generate.isPending || !selectedDeck}
            >
              {cardsQuery.isLoading ? t('common.loading') : t('quiz.practiceSaved')}
            </Button>
            <Link to="/study/decks" className="block text-center text-xs font-bold text-[var(--color-muted)]">
              {t('decks.backToDecks')}
            </Link>
          </fieldset>
        </div>
      </div>
    )
  }

  if (stage === 'ready') {
    return <div className="solo-quiz-screen solo-quiz-ready" role="main">
      <div className="solo-quiz-card text-center space-y-4">
        <h1 ref={activeTitle} tabIndex={-1} className="text-2xl font-extrabold">{t('quiz.readyTitle')}</h1>
        <p className="study-muted">
          {t('quiz.questionTotal', { count: total })} · {t(timed ? 'quiz.timedPractice' : 'quiz.untimed', { count: secondsPerQuestion })}
        </p>
        <Button full size="lg" onClick={startQuiz}>{t('quiz.startQuiz')} <Icon name="arrowRight" size={18} /></Button>
        <Button full variant="secondary" onClick={() => openFlashcards('before')}>
          <Icon name="cards" size={18} /> {t('quiz.studyAsCards')}
        </Button>
        <button type="button" className="study-text-link" onClick={reset}>{t('quiz.backToSetup')}</button>
      </div>
    </div>
  }

  if (stage === 'flashcards-before' || stage === 'flashcards-after') {
    const item = questions[flashIndex]
    const move = (step: number) => {
      setFlashIndex((position) => Math.min(total - 1, Math.max(0, position + step)))
      setFlipped(false)
    }
    return <div className="solo-quiz-screen solo-quiz-flashcards" role="main">
      <header className="text-center space-y-2">
        <h1 ref={activeTitle} tabIndex={-1} className="text-2xl font-extrabold">{t('quiz.flashcardsTitle')}</h1>
        <p className="solo-quiz-position" role="status">{t('workspace.cardPosition', { current: flashIndex + 1, total })}</p>
      </header>
      <button type="button" className="solo-quiz-flip solo-quiz-card" aria-label={t('quiz.flipCard')}
        aria-pressed={flipped} aria-describedby="solo-quiz-card-content" onClick={() => setFlipped(!flipped)}>
        <span className="solo-quiz-flip-face" key={flipped ? 'answer' : 'question'}>
          <span className="solo-quiz-card-side">{t(flipped ? 'review.back' : 'review.front')}</span>
          <span id="solo-quiz-card-content">
            {flipped
              ? <><strong>{localCard(item, item.back)}</strong>{explanationFor(item) && <span className="mt-3 block text-sm">{explanationFor(item)}</span>}</>
              : <strong>{localCard(item, item.front)}</strong>}
          </span>
          <span className="solo-quiz-card-side"><Icon name="reset" size={16} /> {t('quiz.flipCard')}</span>
        </span>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={flashIndex === 0} onClick={() => move(-1)}>{t('quiz.previousCard')}</Button>
        <Button variant="secondary" disabled={flashIndex + 1 === total} onClick={() => move(1)}>{t('quiz.nextCard')}</Button>
      </div>
      {stage === 'flashcards-before' ? <>
        <Button full onClick={startQuiz}>{t('quiz.startQuiz')}</Button>
        <button type="button" className="study-text-link self-center" onClick={() => setStage('ready')}>{t('common.back')}</button>
      </> : <Button full onClick={() => setStage('results')}>{t('quiz.backToScore')}</Button>}
    </div>
  }

  if (!round || !question) return null

  const position = t('quiz.questionProgress', { current: round.index + 1, total })
  return (
    <div className="solo-quiz-screen solo-quiz-play" role="main">
      <header className="solo-quiz-play-heading">
        <button type="button" onClick={() => navigate('/study')} className="solo-quiz-exit" aria-label={t('common.exit')}>
          <Icon name="arrowLeft" size={20} />
        </button>
        <strong className="min-w-0 [overflow-wrap:anywhere]">{starter.deck(question.starterDeckId, question.deckTitle)}</strong>
      </header>

      <div className="solo-quiz-progress">
        <ProgressBar label={position} value={round.index + Number(Boolean(outcome))} max={total} size="sm" />
        <div className="solo-quiz-position">
          <span>{position}</span>
          {round.deadline !== null && !outcome && (
            <Countdown key={round.index} deadline={round.deadline} onExpire={() => settle(null)} />
          )}
        </div>
      </div>

      <div className="solo-quiz-prompt">
        <h1 ref={activeTitle} tabIndex={-1} className="solo-quiz-question" id="quiz-question">
          {localCard(question, question.front)}
        </h1>
      </div>

      <div className="solo-quiz-choices" role="group" aria-labelledby="quiz-question">
        {question.choices.map((choice, index) => {
          const right = choice === question.back
          const chosen = outcome && 'choice' in outcome && outcome.choice === choice
          const tone = outcome && right ? 'correct' : chosen ? 'incorrect' : undefined
          return <button key={choice} type="button" className="solo-quiz-choice" data-tone={tone}
            data-chosen={Boolean(chosen)} disabled={Boolean(outcome)} onClick={() => settle(choice)}>
            <span className="solo-quiz-letter">{'ABCD'[index]}</span>
            <span>{localCard(question, choice)}</span>
            {tone && <Icon name={right ? 'checkCircle' : 'xCircle'} size={18} />}
          </button>
        })}
      </div>

      {outcome && <div className="solo-quiz-feedback">
        <div role="status" className="solo-quiz-feedback-detail" data-outcome={outcome.kind}>
          <p className="text-base font-extrabold">{t(`quiz.outcome.${outcome.kind}`)}</p>
          {answerDetail(question)}
        </div>
        <Button ref={nextAction} full size="lg" className="solo-quiz-next" onClick={next}>
          {round.index + 1 === total ? t('quiz.seeResults') : t('quiz.next')}
          <Icon name="arrowRight" size={18} />
        </Button>
      </div>}
    </div>
  )
}
