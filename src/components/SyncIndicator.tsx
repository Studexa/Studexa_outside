import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { liveQuery } from 'dexie'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Icon } from './Icon'
import { ApiError, reviewApi, type ReviewRating } from '../lib/api'
import { isGuestMode, useAuth } from '../lib/auth'
import { getPendingAnswers, markPendingAnswerUnavailable, removePendingAnswer, type PendingAnswer } from '../lib/offlineDb'
import { dueCardsOptions, studyKeys } from '../lib/study'
import { useOnline } from '../lib/useSettings'

export function SyncIndicator() {
  const userId = useAuth((state) => state.status === 'authenticated' ? state.user?.id : undefined)
  return userId && !isGuestMode() ? <AccountSyncIndicator key={userId} userId={userId} /> : null
}

function AccountSyncIndicator({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const online = useOnline()
  const [answers, setAnswers] = useState<PendingAnswer[]>([])
  const [syncing, setSyncing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [dismissFailed, setDismissFailed] = useState(false)
  const running = useRef<AbortController | null>(null)

  useEffect(() => {
    const subscription = liveQuery(() => getPendingAnswers(userId)).subscribe({
      next: setAnswers,
      error: () => setFailed(true),
    })
    return () => subscription.unsubscribe()
  }, [userId])

  const sync = useCallback(async () => {
    if (running.current || !navigator.onLine || useAuth.getState().user?.id !== userId) return

    const controller = new AbortController()
    running.current = controller
    const isCurrent = () => !controller.signal.aborted && useAuth.getState().user?.id === userId
    let acknowledged = false
    setSyncing(true)
    setFailed(false)

    const replay = async () => {
      const answers = await getPendingAnswers(userId)
      for (const answer of answers) {
        if (!isCurrent()) return
        if (answer.unavailable || answer.id === undefined) continue
        try {
          await reviewApi.answer({
            cardId: answer.cardId,
            rating: answer.rating.toUpperCase() as ReviewRating,
            msTaken: 0,
            clientReviewId: answer.clientReviewId,
          }, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
        } catch (error) {
          if (!isCurrent()) return
          if (error instanceof ApiError && error.status === 404 && error.code === 'NOT_FOUND') {
            await markPendingAnswerUnavailable(answer.id)
            continue
          }
          if (!(error instanceof ApiError && error.status === 409 && error.code === 'DUPLICATE_REVIEW')) {
            throw error
          }
        }
        if (!isCurrent()) return
        acknowledged = true
        await removePendingAnswer(answer.id)
      }
    }

    try {
      if (navigator.locks) {
        await navigator.locks.request(`studexa-review-sync-${userId}`, { signal: controller.signal }, replay)
      } else {
        await replay()
      }
    } catch {
      if (isCurrent()) setFailed(true)
    } finally {
      if (isCurrent() && acknowledged) {
        for (const queryKey of [
          studyKeys.decks(userId), studyKeys.dailyReviewProgress(userId),
          studyKeys.weakCards(userId), studyKeys.reviewQueue(userId), studyKeys.gameState(userId),
          studyKeys.gameXpHistory(userId),
        ]) {
          void queryClient.invalidateQueries({ queryKey })
        }
        const due = dueCardsOptions(userId)
        await queryClient.cancelQueries({ queryKey: due.queryKey })
        if (isCurrent()) {
          // Refresh IndexedDB even when the review page and its query are unmounted.
          void queryClient.fetchQuery({ ...due, staleTime: 0 }).catch(() => undefined)
        }
      }
      if (running.current === controller) {
        running.current = null
        if (isCurrent()) setSyncing(false)
      }
    }
  }, [queryClient, userId])

  useEffect(() => {
    const retry = () => { void sync() }
    window.addEventListener('online', retry)
    retry()
    return () => {
      window.removeEventListener('online', retry)
      running.current?.abort()
      running.current = null
    }
  }, [sync])

  const unavailable = answers.filter((answer) => answer.unavailable)
  const pending = answers.length - unavailable.length
  const dismiss = async () => {
    setDismissFailed(false)
    try {
      for (const { id } of unavailable) {
        if (useAuth.getState().user?.id !== userId) return
        if (id !== undefined) await removePendingAnswer(id)
      }
    } catch {
      setDismissFailed(true)
    }
  }

  if (!pending && !unavailable.length) return null

  return (
    <aside className="pointer-events-none fixed bottom-20 right-3 z-40 max-w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-(--color-border) bg-(--color-surface) p-2.5 text-xs text-(--color-text) shadow-(--shadow-md) md:bottom-4">
      {pending > 0 && (
        <div className="flex items-center gap-2">
          {!online && <Icon name="wifiOff" size={14} />}
          <p role="status">{t(syncing ? 'shell.syncingReviews' : failed && online ? 'shell.reviewSyncFailed' : 'shell.offlineQueued', { count: pending })}</p>
          {online && !syncing && <Button className="pointer-events-auto shrink-0" size="sm" variant="secondary" onClick={() => void sync()}>{t('shell.retryReviewSync')}</Button>}
        </div>
      )}
      {unavailable.length > 0 && (
        <div className="flex items-center gap-2">
          <p role="status">{t('shell.reviewSyncUnavailable', { count: unavailable.length })}</p>
          <Button className="pointer-events-auto shrink-0" size="sm" variant="secondary" onClick={() => void dismiss()}>{t('shell.dismissUnavailableReviews')}</Button>
        </div>
      )}
      {dismissFailed && <p role="alert">{t('shell.reviewSyncDismissFailed')}</p>}
    </aside>
  )
}
