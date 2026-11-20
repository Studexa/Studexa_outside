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
import { useOnline } from '../../lib/useSettings'
import { queuePendingAnswer } from '../../lib/offlineDb'
import { ReviewCardContent } from './ReviewCardContent'

type Rating = 'again' | 'hard' | 'good' | 'easy'
type RatingLog = { rating: Rating; correct: boolean; response: ReviewAnswerResponse | null }

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
  const userId = useAuth((state) => state.user?.id)
  const dueQuery = useDueCards()

  if (dueQuery.data) {
    return <ReviewSession key={userId} dueQuery={dueQuery} initialCards={dueQuery.data} userId={userId} />
  }

  if (dueQuery.isError) {
    return (
      <main className="review-workspace review-centered">
        <EmptyState
          title={t('review.loadError')}
          hint={dueQuery.error.message}
          action={<Button onClick={() => void dueQuery.refetch()}>{t('common.retry')}</Button>}
        />
        <Link className="study-text-link" to="/study"><Icon name="arrowLeft" size={16} />{t('nav.study')}</Link>
      </main>
    )
  }

  return <main className="review-workspace grid min-h-dvh place-items-center"><Spinner label={t('common.loading')} /></main>
}

function ReviewSession({ dueQuery, initialCards, userId }: {
  dueQuery: ReturnType<typeof useDueCards>
  initialCards: DueCard[]
  userId?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const recordReviewSession = useApp((s) => s.recordReviewSession)
  const buddy = useApp((s) => s.buddy)
  const online = useOnline()

  const [savedQueue, setQueue] = useState(() => initialCards.length ? shuffle(initialCards) : null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [ratings, setRatings] = useState<RatingLog[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [undoCardId, setUndoCardId] = useState<string | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [actionError, setActionError] = useState<'rating' | 'undo' | null>(null)
  const actionPending = useRef(false)
  const undoTimer = useRef<number | null>(null)
  const committed = useRef(false)
  const touchStart = useRef<number | null>(null)
  const swiped = useRef(false)
  const revealButton = useRef<HTMLButtonElement>(null)
  const summaryTitle = useRef<HTMLHeadingElement>(null)
  const restoreFocus = useRef(false)

  // Clean up undo timer on unmount (BUG-K02: memory leak / stale closure)
  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    }
  }, [])

  const { mutateAsync: submitRating, isPending: savingRating } = useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, rating, msTaken, clientReviewId }: { id: string; rating: ReviewRating; msTaken: number; clientReviewId: string }) => {
      if (isGuestMode()) {
        useApp.getState().reviewGuestCard(id, rating === 'AGAIN')
        return null
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
        return null
      }
    },
    onSuccess: (response, variables) => {
      if (useAuth.getState().user?.id !== userId) return
      void queryClient.invalidateQueries({ queryKey: studyKeys.due(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.decks(userId) })

      // Report quest progress: warmup counts reviewed cards toward daily quest
      if (response && userId) {
        void queryClient.invalidateQueries({ queryKey: studyKeys.dailyReviewProgress(userId) })
        void queryClient.invalidateQueries({ queryKey: studyKeys.weakCards(userId) })
        void questApi.progress({ code: 'warmup', source: 'review_card', referenceId: variables.clientReviewId })
          .then(() => queryClient.invalidateQueries({ queryKey: studyKeys.questsToday(userId) }))
          .catch(() => undefined)
      }
    },
  })

  const queue = savedQueue ?? initialCards
  const current = queue[index]
  const total = queue.length
  const correct = ratings.filter((entry) => entry.correct).length
  const awardedXp = ratings.reduce((sum, entry) => sum + (entry.response?.xpEarned ?? 0), 0)
  const xpEarned = ratings.some((entry) => entry.response) ? awardedXp : ratings.length * 3 + correct * 2 + (ratings.length >= 5 ? 20 : 0)
  const busy = savingRating || undoing

  useEffect(() => {
    if (finished) return
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [finished])

  useEffect(() => {
    if (!finished || committed.current) return
    committed.current = true
    if (ratings.length > 0) recordReviewSession(ratings.length, correct)
    celebrate()
    playSound('success')
  }, [finished, ratings.length, correct, recordReviewSession])

  useEffect(() => {
    if (!restoreFocus.current) return
    restoreFocus.current = false
    if (finished) summaryTitle.current?.focus()
    else revealButton.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [finished, index])

  const rate = useCallback(async (rating: Rating) => {
    if (!current || finished || !flipped || actionPending.current) return
    actionPending.current = true
    setActionError(null)
    try {
      const response = await submitRating({
        id: current.id,
        rating: rating.toUpperCase() as ReviewRating,
        msTaken: 0,
        clientReviewId: crypto.randomUUID(),
      })
      if (useAuth.getState().user?.id !== userId) return

      const correct = rating === 'good' || rating === 'easy'
      setRatings((previous) => [...previous, { rating, correct, response }])
      playSound(correct ? 'success' : 'error')
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
      setUndoCardId(response ? current.id : null)
      if (response) undoTimer.current = window.setTimeout(() => setUndoCardId(null), 5000)

      if (rating === 'again') setQueue([...queue, current])
      else {
        if (!savedQueue) setQueue(queue)
        if (index + 1 === total) setFinished(true)
      }
      restoreFocus.current = true
      setIndex(index + 1)
      setFlipped(false)
    } catch {
      setActionError('rating')
    } finally {
      actionPending.current = false
    }
  }, [current, finished, flipped, index, queue, savedQueue, submitRating, total, userId])

  const undo = async () => {
    if (!undoCardId || actionPending.current || !online) return
    actionPending.current = true
    setUndoing(true)
    setActionError(null)
    try {
      await reviewApi.undo(undoCardId)
      if (useAuth.getState().user?.id !== userId) return
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
      setUndoCardId(null)
      if (ratings.at(-1)?.rating === 'again') setQueue(queue.slice(0, -1))
      setRatings((previous) => previous.slice(0, -1))
      restoreFocus.current = true
      setIndex((previous) => Math.max(0, previous - 1))
      setFlipped(false)
      void queryClient.invalidateQueries({ queryKey: studyKeys.due(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.decks(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.dailyReviewProgress(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.weakCards(userId) })
    } catch {
      setActionError('undo')
    } finally {
      setUndoing(false)
      actionPending.current = false
    }
  }

  const restart = async () => {
    const result = await dueQuery.refetch()
    if (result.isError) {
      setActionError('rating')
      return
    }
    if (!result.data?.length) {
      navigate('/study/decks')
      return
    }
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    committed.current = false
    restoreFocus.current = true
    setQueue(shuffle(result.data))
    setIndex(0)
    setFlipped(false)
    setRatings([])
    setElapsed(0)
    setUndoCardId(null)
    setActionError(null)
    setFinished(false)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (
        event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))
      ) return

      if (event.code === 'Space' && !finished && current && !actionPending.current) {
        if (target instanceof HTMLElement && target.closest('button, a, summary, [role="button"]')) return
        event.preventDefault()
        setFlipped((visible) => !visible)
        return
      }
      const shortcuts: Record<string, Rating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
      const rating = shortcuts[event.key]
      if (rating && flipped && !finished) {
        event.preventDefault()
        void rate(rating)
      }
      if (event.key === 'Escape') navigate('/study')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, finished, flipped, navigate, rate])

  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.touches[0]?.clientX ?? null
    swiped.current = false
  }
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStart.current === null) return
    const dx = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) < 60 || !flipped) return
    swiped.current = true
    void rate(dx < 0 ? 'again' : 'good')
  }

  if (!total && dueQuery.isFetching) {
    return <main className="review-workspace grid min-h-dvh place-items-center"><Spinner label={t('common.loading')} /></main>
  }

  if (!total) {
    return (
      <main className="review-workspace review-centered">
        <EmptyState title={t('review.emptyTitle')} hint={t('review.emptyHint')} action={
          <Link to="/study/decks" className="study-action">{t('workspace.browseDecks')}</Link>
        } />
        <Link className="study-text-link" to="/study"><Icon name="arrowLeft" size={16} />{t('nav.study')}</Link>
      </main>
    )
  }

  if (finished) {
    const accuracy = Math.round((correct / Math.max(1, ratings.length)) * 100)
    const time = Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0')
    const leveledUp = ratings.findLast((entry) => entry.response?.leveledUp)?.response
    let combo = 0
    let bestCombo = 0
    for (const entry of ratings) {
      combo = entry.correct ? combo + 1 : 0
      bestCombo = Math.max(bestCombo, combo)
    }
    const summary = [
      { label: 'review.cardsReviewed', value: ratings.length },
      { label: 'review.accuracy', value: accuracy + '%' },
      { label: 'review.time', value: time },
      { label: 'review.xpEarned', value: '+' + xpEarned },
    ]
    return (
      <main className="review-workspace review-centered">
        <div className="study-panel review-summary w-full">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="study-icon mb-4"><Icon name="checkCircle" size={25} /></div>
              <h1 className="text-2xl font-semibold sm:text-3xl" ref={summaryTitle} tabIndex={-1}>{t('review.endTitle')}</h1>
              <p className="study-muted mt-2">{t('review.endHint')}</p>
            </div>
            <Mascot species={buddy} mood="sparkle" size={40} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            {summary.map(({ label, value }) => (
              <div className="rounded-xl bg-(--color-surface-alt) p-3 sm:p-4" key={label}>
                <dt className="study-muted">{t(label)}</dt>
                <dd className="text-xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {leveledUp && <p className="study-muted mt-4">{t('review.levelReached', { level: leveledUp.newLevel })}</p>}
          {bestCombo >= 3 && <p className="study-muted mt-2">{t('review.bestCombo', { count: bestCombo })}</p>}
          {actionError && <p className="mt-3 text-(--color-danger-text)" role="alert">{t('review.loadError')}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link className="study-action" to="/">{t('review.doneToday')}<Icon name="arrowRight" size={18} /></Link>
            <Button variant="secondary" onClick={() => void restart()} disabled={dueQuery.isFetching}>{t('review.keepGoing')}</Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="review-workspace min-h-dvh">
      <header className="review-session-header">
        <div className="review-session-inner">
          <Link to="/study" className="study-header-action" aria-label={t('common.exit')}>
            <Icon name="arrowLeft" size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-(--study-ink)">{t('review.title')}</p>
            <h1 className="review-deck-title font-semibold [overflow-wrap:anywhere]">{current?.deckTitle}</h1>
          </div>
          <p className="review-position text-sm font-semibold tabular-nums">{t('workspace.cardPosition', { current: index + 1, total })}</p>
        </div>
      </header>

      <div className="review-session-body">
        <ProgressBar value={index} max={total} size="sm" label={t('workspace.reviewProgress')} />
        <div className="review-card-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {current?.deckSubject && <span className="font-semibold [overflow-wrap:anywhere]">{current.deckSubject}</span>}
          <span className="study-muted">{t('decks.types.' + typeKey[current?.type ?? 'BASIC'])}</span>
        </div>

        <button ref={revealButton} type="button" className="study-panel review-card"
          aria-label={t('review.flipLabel')} aria-pressed={flipped} aria-describedby="review-card-content"
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touchStart.current = null }}
          onClick={(event) => {
            if (swiped.current && event.detail > 0) {
              swiped.current = false
              return
            }
            if (!actionPending.current) setFlipped((visible) => !visible)
          }}
        >
          <ReviewCardContent card={current} flipped={flipped} />
          <span className="review-reveal-label">
            <Icon name={flipped ? 'chevronUp' : 'chevronDown'} size={18} />
            {t(flipped ? 'workspace.hideAnswer' : 'workspace.showAnswer')}
          </span>
        </button>

        {!flipped && <p className="study-muted mt-4 hidden sm:block">{t('review.spaceHint')}</p>}
        {(flipped || (undoCardId && online) || actionError) && (
          <div className="review-action-tray">
            {flipped && (
              <section aria-label={t('review.rateHint')}>
                <p className="review-rate-hint study-muted mb-2">{t('review.rateHint')}</p>
                <div className="review-ratings">
                  {(['again', 'hard', 'good', 'easy'] as Rating[]).map((rating, i) => (
                    <button key={rating} type="button" data-rating={rating} className="review-rating"
                      aria-disabled={busy} onClick={() => void rate(rating)}>
                      <span className="font-semibold">{t('review.ratings.' + rating)}</span>
                      <span className="study-muted">{t('review.intervals.' + rating)}</span>
                      <kbd className="review-key">{i + 1}</kbd>
                    </button>
                  ))}
                </div>
                <p className="review-swipe-hint study-muted mt-2">{t('review.swipeHint')}</p>
              </section>
            )}
            {undoCardId && online && (
              <Button className={flipped ? 'mt-2' : ''} variant="ghost" size="sm" disabled={busy} onClick={() => void undo()}>
                <Icon name="undo" size={16} />{t('common.undo')}
              </Button>
            )}
            {actionError && (
              <p className="mt-2 text-sm text-(--color-danger-text)" role="alert">
                {t(actionError === 'undo' ? 'workspace.undoError' : 'workspace.ratingError')}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
