import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BossArt } from '../../components/BossArt'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Mascot } from '../../components/Mascot'
import { ProgressBar } from '../../components/ProgressBar'
import { celebrate } from '../../lib/confetti'
import { playSound } from '../../lib/sound'
import { useApp } from '../../lib/store'
import { useAllStudyCards, type StudyCardWithDeck } from '../../lib/study'
import type { DeckSummary, StudyCard } from '../../lib/api'
import { Spinner } from '../../components/Spinner'

type Question = { card: StudyCard; deck: DeckSummary; choices: string[] }

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildQuestions(items: StudyCardWithDeck[]): Question[] {
  const all = items.filter(({ card }) => card.front.trim() && card.back.trim())
  if (all.length < 4) return []
  const picked = shuffle(all).slice(0, 5)
  return picked.map(({ card, deck }) => {
    const backs = Array.from(new Set(all.map((item) => item.card.back))).filter((back) => back !== card.back)
    const wrong = shuffle(backs).slice(0, 3)
    return { card, deck, choices: shuffle([card.back, ...wrong]) }
  })
}

export function BossPage() {
  const { t } = useTranslation()
  const { cards, isLoading } = useAllStudyCards()
  if (isLoading) {
    return <div className="flex min-h-dvh items-center justify-center"><Spinner label={t('common.loading')} /></div>
  }
  return <BossGame items={cards} />
}

function BossGame({ items }: { items: StudyCardWithDeck[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const buddy = useApp((s) => s.buddy)
  const recordBoss = useApp((s) => s.recordBoss)
  const [questions, setQuestions] = useState<Question[]>(() => buildQuestions(items))
  const [qIndex, setQIndex] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [bossHp, setBossHp] = useState(() => questions.length)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [hurt, setHurt] = useState(false)
  const [shake, setShake] = useState(false)
  const [status, setStatus] = useState<'playing' | 'victory' | 'defeat'>('playing')
  const recorded = useRef(false)

  const question = questions[qIndex]
  const total = questions.length

  useEffect(() => {
    if (status === 'victory' && !recorded.current) {
      recorded.current = true
      recordBoss()
      celebrate()
      playSound('success')
    }
  }, [status, recordBoss])

  const restart = () => {
    const nextQuestions = buildQuestions(items)
    recorded.current = false
    setQuestions(nextQuestions)
    setQIndex(0)
    setHearts(3)
    setBossHp(nextQuestions.length)
    setSelected(null)
    setFeedback(null)
    setHurt(false)
    setShake(false)
    setStatus('playing')
  }

  const advance = () => setQIndex((i) => (i + 1 >= total ? 0 : i + 1))

  const answer = (choice: string) => {
    if (!question || selected || status !== 'playing') return
    setSelected(choice)
    const correct = choice === question.card.back
    if (correct) {
      const nextHp = bossHp - 1
      setFeedback('correct')
      setHurt(true)
      playSound('success')
      setBossHp(Math.max(0, nextHp))
      window.setTimeout(() => {
        setHurt(false)
        setFeedback(null)
        setSelected(null)
        if (nextHp <= 0) setStatus('victory')
        else advance()
      }, 750)
    } else {
      const nextHearts = hearts - 1
      setFeedback('wrong')
      setShake(true)
      playSound('error')
      setHearts(Math.max(0, nextHearts))
      window.setTimeout(() => {
        setShake(false)
        setFeedback(null)
        setSelected(null)
        if (nextHearts <= 0) setStatus('defeat')
        else advance()
      }, 900)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <Mascot species={buddy} mood="sleepy" size={140} />
        <h1 className="text-2xl font-black">{t('boss.noCardsTitle')}</h1>
        <p className="text-[var(--color-muted)]">{t('boss.noCardsHint')}</p>
        <Button onClick={() => navigate('/study/decks')}>{t('boss.addCards')}</Button>
      </div>
    )
  }

  if (status !== 'playing') {
    const won = status === 'victory'
    return (
      <div className={`flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-8 text-center ${won ? 'bg-gradient-to-b from-[var(--color-navy)] to-blue-950 text-white' : 'bg-[var(--color-bg)]'}`}>
        <Mascot species={buddy} mood={won ? 'sparkle' : 'sleepy'} size={170} accessory={won ? 'hat' : null} className={won ? 'animate-gentle-bounce' : ''} />
        <div className={`w-full max-w-md rounded-[28px] p-6 ${won ? 'bg-white/10 ring-1 ring-white/20' : 'border border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${won ? 'text-amber-300' : 'text-[var(--color-muted)]'}`}>
            {won ? t('boss.victoryKicker') : t('boss.defeatKicker')}
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{won ? t('boss.victoryTitle') : t('boss.defeatTitle')}</h1>
          <p className={`mt-2 text-sm ${won ? 'text-white/75' : 'text-[var(--color-muted)]'}`}>
            {won ? t('boss.victoryHint') : t('boss.defeatHint')}
          </p>

          {won && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-400/15 p-3 text-left ring-1 ring-amber-300/30">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-[#3b2503]">
                <Icon name="sword" size={24} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">{t('boss.badgeUnlocked')}</p>
                <p className="font-black">{t('badges.bossSlayer.name')}</p>
                <p className="text-[11px] text-white/60">+100 XP · +60 {t('shell.coin')}</p>
              </div>
            </div>
          )}

          {!won && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-muted)]">
              <Icon name="heart" size={18} className="text-[var(--color-danger)]" />
              {t('boss.retryHint')}
            </div>
          )}

          <div className="mt-5 space-y-2">
            <Button full size="lg" variant={won ? 'accent' : 'primary'} onClick={restart}>
              <Icon name="reset" size={19} /> {won ? t('boss.playAgain') : t('boss.retry')}
            </Button>
            <button
              onClick={() => navigate('/study')}
              className={`min-h-11 w-full rounded-2xl px-4 text-sm font-bold ${won ? 'text-white/80 hover:bg-white/10' : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]'}`}
            >
              {t('boss.backToStudy')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#172554] to-[#020617] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute left-1/4 top-10 h-40 w-40 rounded-full bg-blue-600 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-52 w-52 rounded-full bg-indigo-700 blur-3xl" />
      </div>

      <header className="relative flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => navigate('/study')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
          aria-label={t('common.exit')}
        >
          <Icon name="close" size={20} />
        </button>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-white/70">
            <span>{t('boss.title')}</span>
            <span>{qIndex + 1} / {total}</span>
          </div>
          <ProgressBar value={bossHp} max={total} size="sm" tone="danger" />
        </div>
        <div className="flex items-center gap-0.5" aria-label={t('boss.hearts', { count: hearts })}>
          {[0, 1, 2].map((i) => (
            <Icon
              key={i}
              name="heart"
              size={20}
              className={i < hearts ? 'fill-current text-[var(--color-danger)]' : 'text-white/25'}
            />
          ))}
        </div>
      </header>

      <div className={`relative flex flex-col items-center px-4 pt-2 ${shake ? 'animate-shake' : ''}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/70">{t('boss.bossName')}</p>
        <BossArt size={170} hurt={hurt} label={t('boss.bossName')} />
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-xl flex-1 px-4 pb-5">
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text)] shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--color-primary)]">
              {question.deck.subjectName ?? question.deck.title}
            </span>
            {feedback && (
              <span
                className={`animate-pop-in inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
                  feedback === 'correct'
                    ? 'bg-[var(--color-success-soft)] text-[#047857] dark:text-[var(--color-success)]'
                    : 'bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]'
                }`}
              >
                <Icon name={feedback === 'correct' ? 'check' : 'close'} size={12} />
                {feedback === 'correct' ? t('boss.correct') : t('boss.wrong')}
              </span>
            )}
          </div>
          <p className="mt-3 text-center text-xl font-extrabold leading-snug sm:text-2xl">{question.card.front}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.choices.map((choice) => {
              const isCorrect = choice === question.card.back
              const chosen = selected === choice
              let tone = 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
              if (selected) {
                if (isCorrect) tone = 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[#047857] dark:text-[var(--color-success)]'
                else if (chosen) tone = 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)]'
                else tone = 'border-[var(--color-border)] opacity-60'
              }
              return (
                <button
                  key={choice}
                  onClick={() => answer(choice)}
                  disabled={!!selected}
                  className={`min-h-12 rounded-2xl border-2 px-3 py-2.5 text-sm font-bold transition ${tone}`}
                >
                  {choice}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-white/60">
          <Mascot species={buddy} mood="happy" size={46} />
          {t('boss.cheer')}
        </div>
      </div>
    </div>
  )
}
