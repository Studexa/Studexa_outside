import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/Icon'
import { Mascot } from '../../components/Mascot'
import { ProgressBar } from '../../components/ProgressBar'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import { celebrate } from '../../lib/confetti'
import { playSound } from '../../lib/sound'
import { type CardType, type DueCard, type ReviewRating } from '../../lib/api'
import { ApiError, questApi, reviewApi, type ReviewAnswerResponse } from '../../lib/api'
import { studyKeys, useDueCards } from '../../lib/study'
import { useApp } from '../../lib/store'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useSettings } from '../../lib/useSettings'
import { queuePendingAnswer, getPendingAnswers, removePendingAnswer } from '../../lib/offlineDb'

type Rating = 'again' | 'hard' | 'good' | 'easy'
type RatingLog = { rating: Rating; correct: boolean; xpEarned?: number }

const ratingStyles: Record<Rating, string> = {
  again: 'bg-[var(--color-danger-soft)] text-[#b91c1c] dark:text-[var(--color-danger)] hover:brightness-95',
  hard: 'bg-[var(--color-accent-soft)] text-[#92610a] dark:text-[var(--color-accent)] hover:brightness-95',
  good: 'bg-[var(--color-success-soft)] text-[#047857] dark:text-[var(--color-success)] hover:brightness-95',
  easy: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)] dark:text-[var(--color-primary)] hover:brightness-95',
}

const typeKey: Record<CardType, string> = {
  BASIC: 'basic',
  REVERSED: 'reverse',
  CLOZE: 'cloze',
  MULTIPLE_CHOICE: 'choice',
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function ReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const recordReviewSession = useApp((s) => s.recordReviewSession)
  const buddy = useApp((s) => s.buddy)
  const userId = useAuth((s) => s.user?.id)
  const settings = useSettings()
  const dueQuery = useDueCards()

  const [queue, setQueue] = useState<DueCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [ratings, setRatings] = useState<RatingLog[]>([])
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [float, setFloat] = useState<{ key: number; amount: number } | null>(null)
  const [cheer, setCheer] = useState(false)
  const [lastRating, setLastRating] = useState<RatingLog | null>(null)
  const [serverXp, setServerXp] = useState(0)
  const [leveledUp, setLeveledUp] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const [undoCardId, setUndoCardId] = useState<string | null>(null)
  const undoTimer = useRef<number | null>(null)
  const initialized = useRef(false)
  const committed = useRef(false)
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    if (initialized.current || !dueQuery.data) return
    initialized.current = true
    setQueue(shuffle(dueQuery.data))
  }, [dueQuery.data])

  // Clean up undo timer on unmount (BUG-K02: memory leak / stale closure)
  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    }
  }, [])

  // Replay pending offline answers when the component mounts or comes back online
  useEffect(() => {
    if (!userId) return
    let synced = false
    let disposed = false
    const isCurrent = () => !disposed && useAuth.getState().user?.id === userId
    const syncPending = async () => {
      if (synced || !isCurrent()) return
      synced = true
      try {
        const pending = await getPendingAnswers(userId)
        for (const p of pending) {
          if (!isCurrent()) break
          await reviewApi.answer({
            cardId: p.cardId,
            rating: p.rating.toUpperCase() as ReviewRating,
            msTaken: 0,
            clientReviewId: p.clientReviewId,
          })
          if (p.id !== undefined) await removePendingAnswer(p.id)
        }
      } finally {
        synced = false
      }
    }
    const retryPending = () => { void syncPending().catch(() => undefined) }

    retryPending()
    window.addEventListener('online', retryPending)
    return () => {
      disposed = true
      window.removeEventListener('online', retryPending)
    }
  }, [userId])

  const review = useMutation({
    mutationFn: async ({ id, rating, msTaken, clientReviewId }: { id: string; rating: ReviewRating; msTaken: number; clientReviewId: string }) => {
      if (isGuestMode()) {
        useApp.getState().reviewGuestCard(id, rating === 'AGAIN')
        return { xpEarned: 0, leveledUp: false, newLevel: 1 } as ReviewAnswerResponse
      }
      try {
        return await reviewApi.answer({ cardId: id, rating, msTaken, clientReviewId })
      } catch (error) {
        // Offline: queue the answer to replay when reconnected.
        // The backend's idempotency key (clientReviewId) makes replay safe.
        if (error instanceof ApiError || !userId || useAuth.getState().user?.id !== userId) {
          throw error
        }
        if (error instanceof TypeError || !navigator.onLine) {
          await queuePendingAnswer(userId, id, rating.toLowerCase() as 'again' | 'hard' | 'good' | 'easy', clientReviewId)
        } else {
          throw error
        }
        // Return a synthetic response so the UI stays responsive offline
        return { xpEarned: 0, leveledUp: false, newLevel: 1 } as ReviewAnswerResponse
      }
    },
    onSuccess: async (response: ReviewAnswerResponse, variables) => {
      if (useAuth.getState().user?.id !== userId) return
      setServerXp(response.xpEarned)
      setLeveledUp(response.leveledUp)
      setNewLevel(response.newLevel)
      void queryClient.invalidateQueries({ queryKey: studyKeys.due(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.decks(userId) })

      // Report quest progress: warmup counts reviewed cards toward daily quest
      if (!isGuestMode() && navigator.onLine && userId) {
        void questApi.progress({ code: 'warmup', source: 'review_card', referenceId: variables.clientReviewId }).catch(() => undefined)
      }
    },
    onError: () => {
      setRatings((prev) => prev.slice(0, -1))
      setFlipped(true)
      setIndex((i) => Math.max(0, i - 1))
    },
  })

  const isRating = review.isPending

  const current = queue[index]
  const total = queue.length
  const correct = ratings.filter((r) => r.correct).length
  const xpEarned = serverXp > 0 ? serverXp : ratings.length * 3 + correct * 2 + (ratings.length >= 5 ? 20 : 0)

  useEffect(() => {
    if (finished) return
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [finished])

  useEffect(() => {
    if (!finished || committed.current) return
    committed.current = true
    if (ratings.length > 0) recordReviewSession(ratings.length, correct)
    celebrate()
    playSound('success')
  }, [finished, ratings.length, correct, recordReviewSession])

  const rate = useCallback((rating: Rating) => {
    if (!current || finished || !flipped || isRating) return
    const isCorrect = rating === 'good' || rating === 'easy'
    const log: RatingLog = { rating, correct: isCorrect }
    setRatings((prev) => [...prev, log])
    setLastRating(log)
    setFlipped(false)
    const localXp = rating === 'again' ? 3 : rating === 'hard' ? 4 : 5
    setFloat({ key: Date.now(), amount: localXp })
    playSound(isCorrect ? 'success' : 'error')
    review.mutate({
      id: current.id,
      rating: rating.toUpperCase() as ReviewRating,
      msTaken: 0,
      clientReviewId: crypto.randomUUID(),
    })

    if (isCorrect) {
      const nextCombo = combo + 1
      setCombo(nextCombo)
      setMaxCombo((m) => Math.max(m, nextCombo))
      setCheer(true)
      window.setTimeout(() => setCheer(false), 650)
    } else {
      setCombo(0)
    }

    // Set up undo: available for 5 seconds after each rating
    setUndoCardId(current.id)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndoCardId(null), 5000)

    let isLast = index + 1 >= queue.length
    if (rating === 'again') {
      // Re-insert "Again" card so it reappears before the session ends (BUG-C09)
      setQueue((prev) => [...prev, current])
      isLast = false
    }

    if (isLast) {
      setFinished(true)
      setIndex(index + 1)
    } else {
      setIndex(index + 1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, finished, flipped, isRating, combo, index, queue.length, review])

  const restart = async () => {
    const result = await dueQuery.refetch()
    const next = result.data ?? []
    if (next.length === 0) {
      navigate('/study/decks')
      return
    }
    committed.current = false
    setQueue(shuffle(next))
    setIndex(0)
    setFlipped(false)
    setRatings([])
    setCombo(0)
    setMaxCombo(0)
    setElapsed(0)
    setFinished(false)
    setFloat(null)
    setCheer(false)
    setLastRating(null)
    setServerXp(0)
    setLeveledUp(false)
    setNewLevel(1)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      // BUG-C02: Ignore shortcuts when typing in an input/textarea/select/contenteditable, or during IME composition.
      const target = event.target as HTMLElement
      if (
        event.isComposing ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      ) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (!finished) setFlipped((f) => !f)
        return
      }
      const map: Record<string, Rating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
      const rating = map[event.key]
      if (rating) {
        event.preventDefault()
        rate(rating)
      }
      if (event.key === 'Escape') navigate('/study')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, flipped, rate])

  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStart.current === null) return
    const dx = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) < 60) return
    if (dx < 0) rate('again')
    else rate('good')
  }

  if (dueQuery.isLoading) {
    return <div className="flex min-h-dvh items-center justify-center"><Spinner label={t('common.loading')} /></div>
  }

  if (dueQuery.isError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-5">
        <EmptyState
          title={t('review.loadError')}
          hint={dueQuery.error.message}
          action={<Button onClick={() => void dueQuery.refetch()}>{t('common.retry')}</Button>}
        />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-5">
        <EmptyState
          title={t('review.emptyTitle')}
          hint={t('review.emptyHint')}
          action={
            <div className="mt-2 flex gap-2">
              <Link to="/study/decks"><Button variant="secondary">{t('nav.study')}</Button></Link>
              <Link to="/"><Button>{t('nav.home')}</Button></Link>
            </div>
          }
        />
      </div>
    )
  }

  if (finished) {
    const accuracy = ratings.length ? Math.round((correct / ratings.length) * 100) : 0
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 p-4 sm:p-6">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)]">
          <div className="mx-auto w-fit animate-pop-in">
            <Mascot species={buddy} mood="sparkle" size={150} accessory="hat" />
          </div>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-success)]">{t('review.endKicker')}</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{t('review.endTitle')}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t('review.endHint')}</p>

          <div className="mt-5 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-2xl bg-[var(--color-primary-soft)] p-3">
              <p className="text-2xl font-black text-[var(--color-primary)]">{ratings.length}</p>
              <p className="text-xs font-bold text-[var(--color-muted)]">{t('review.cardsReviewed')}</p>
            </div>
            <div className="rounded-2xl bg-[var(--color-success-soft)] p-3">
              <p className="text-2xl font-black text-[var(--color-success)]">{accuracy}%</p>
              <p className="text-xs font-bold text-[var(--color-muted)]">{t('review.accuracy')}</p>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface-alt)] p-3">
              <p className="text-2xl font-black">{minutes}:{String(seconds).padStart(2, '0')}</p>
              <p className="text-xs font-bold text-[var(--color-muted)]">{t('review.time')}</p>
            </div>
            <div className="rounded-2xl bg-[var(--color-accent-soft)] p-3">
              <p className="text-2xl font-black text-[var(--color-accent)]">+{xpEarned}</p>
              <p className="text-xs font-bold text-[var(--color-muted)]">{t('review.xpEarned')}</p>
            </div>
          </div>

          {leveledUp && (
            <div className="mt-3 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-black text-[var(--color-accent)]">
              {t('shell.levelUp')} {t('review.levelReached', { level: newLevel })}
            </div>
          )}

          {maxCombo >= 3 && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-black text-[var(--color-accent)]">
              <Icon name="bolt" size={13} /> {t('review.bestCombo', { count: maxCombo })}
            </p>
          )}

          <div className="mt-5 space-y-2">
            <Button full size="lg" onClick={() => void restart()}>
              <Icon name="reset" size={19} /> {t('review.keepGoing')}
            </Button>
            <Button full variant="secondary" onClick={() => navigate('/')}>
              {t('review.doneToday')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            onClick={() => navigate('/study')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
            aria-label={t('common.exit')}
          >
            <Icon name="close" size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--color-muted)]">
              <span className="truncate">{current?.deckTitle ?? t('review.title')}</span>
              <span>
                {index + 1} / {total}
              </span>
            </div>
            <ProgressBar value={index} max={total} size="sm" />
          </div>
          <div className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2.5 text-sm font-black text-[var(--color-accent)]">
            <Icon name="bolt" size={16} /> {combo}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-3 py-4 sm:px-5">
        <div className="mb-2 flex min-h-8 items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black text-white"
              style={{ background: current?.deckColor }}
            >
              {current?.deckSubject}
            </span>
            <span className="text-[11px] font-bold text-[var(--color-muted)]">
              {t(`decks.types.${typeKey[current?.type ?? 'BASIC']}`)}
            </span>
          </div>
          {combo >= 3 && (
            <span className="animate-pop-in inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-black text-[#3b2503]">
              <Icon name="bolt" size={12} /> {t('review.combo', { count: combo })}
            </span>
          )}
        </div>

        <div className="flip-scene relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="block w-full text-left"
            aria-label={t('review.flipLabel')}
          >
            <div className={`flip-card h-[330px] w-full sm:h-[400px] ${flipped ? 'is-flipped' : ''} ${settings.theme === 'antigravity' ? 'animate-antigravity-float' : ''}`}>
              <div className="flip-face flex h-full w-full flex-col items-center justify-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)] sm:p-10">
                <span className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  {t('review.front')}
                </span>
                <p className="text-2xl font-extrabold leading-snug sm:text-3xl">{current?.front}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-muted)]">
                  <Icon name="reset" size={14} /> {t('review.tapToFlip')}
                </span>
              </div>
              <div className="flip-back flex h-full w-full flex-col items-center justify-center overflow-y-auto rounded-[28px] border-2 border-[var(--color-success)]/40 bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)] sm:p-10">
                <span className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-success)]">
                  {t('review.back')}
                </span>
                <p className="text-2xl font-extrabold leading-snug sm:text-3xl">{current?.back}</p>
                {typeof current?.extra?.explanation === 'string' && current.extra.explanation && (
                  <p className="mt-3 max-w-md text-sm font-semibold text-[var(--color-muted)]">
                    {current.extra.explanation}
                  </p>
                )}
                {(current?.sourceTitle || current?.sourceExcerpt) && (
                  <div className="mt-4 max-w-md rounded-2xl bg-[var(--color-surface-alt)] p-3 text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                      {t('decks.source')}{current?.sourceTitle ? `: ${current.sourceTitle}` : ''}
                    </p>
                    {current?.sourceExcerpt && (
                      <p className="mt-1 text-xs italic text-[var(--color-muted)]">“{current.sourceExcerpt}”</p>
                    )}
                  </div>
                )}
                <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">
                  {current?.deckTitle}
                </span>
              </div>
            </div>
          </button>

          {float && (
            <span
              key={float.key}
              className="animate-float-up pointer-events-none absolute right-5 top-5 rounded-full bg-[var(--color-accent)] px-3 py-1 text-sm font-black text-[#3b2503] shadow-[var(--shadow-sm)]"
            >
              +{float.amount} XP
            </span>
          )}

          <div className={`pointer-events-none absolute -top-16 right-2 transition-opacity ${cheer ? 'animate-cheer opacity-100' : 'opacity-70'} ${settings.theme === 'antigravity' ? 'animate-antigravity-drift' : ''}`}>
            <Mascot species={buddy} mood={cheer ? 'sparkle' : 'happy'} size={72} />
          </div>
        </div>

        <p className="mt-3 min-h-5 text-center text-sm font-semibold text-[var(--color-muted)]">
          {!flipped
            ? t('review.spaceHint')
            : ratings.length > 0 && !lastRating?.correct
              ? t('review.almost')
              : t('review.rateHint')}
        </p>

        <div className="mt-2 grid grid-cols-4 gap-2">
          {(['again', 'hard', 'good', 'easy'] as Rating[]).map((rating, i) => (
            <button
              key={rating}
              onClick={() => rate(rating)}
              disabled={!flipped || isRating}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl px-1 py-2 font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${ratingStyles[rating]}`}
            >
              <span className="text-sm">{t(`review.ratings.${rating}`)}</span>
              <span className="text-[11px] font-bold opacity-70">{t(`review.intervals.${rating}`)}</span>
              <span className="mt-0.5 hidden text-[9px] font-bold opacity-50 sm:block">{i + 1}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">{t('review.swipeHint')}</span>
          {undoCardId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await reviewApi.undo(undoCardId)
                setUndoCardId(null)
                if (undoTimer.current) window.clearTimeout(undoTimer.current)
                void queryClient.invalidateQueries({ queryKey: studyKeys.due(userId) })
                setIndex((i) => Math.max(0, i - 1))
                setFlipped(false)
                setRatings((prev) => prev.slice(0, -1))
              }}
            >
              {t('common.undo')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
