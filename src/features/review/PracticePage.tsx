import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { ProgressBar } from '../../components/ProgressBar'
import { Spinner } from '../../components/Spinner'
import { useAuth } from '../../lib/auth'
import { useWeakCards } from '../../lib/study'
import { useLocalizedStarter } from '../../lib/starterContent'
import { ReviewCardContent } from './ReviewCardContent'

export function PracticePage() {
  const { t } = useTranslation()
  const userId = useAuth((state) => state.user?.id)
  const { cards, query } = useWeakCards()

  if (query.isLoading) {
    return <main className="review-workspace review-centered"><Spinner label={t('common.loading')} /></main>
  }
  if (cards.length > 0) return <PracticeSession key={userId} initialCards={cards} />

  const unavailable = query.data === undefined && (query.isError || query.isPaused)
  return (
    <main className="review-workspace review-centered gap-4">
      <h1 className="text-2xl font-semibold">{t('practice.title')}</h1>
      <p className="study-muted" role="status">{t(unavailable ? 'practice.loadError' : 'stats.noWeakCards')}</p>
      {unavailable && !query.isPaused && <Button onClick={() => void query.refetch()}>{t('common.retry')}</Button>}
      <BackToStats />
    </main>
  )
}

function BackToStats() {
  const { t } = useTranslation()
  return <Link to="/stats" className="study-text-link"><Icon name="arrowLeft" size={16} />{t('practice.backToStats')}</Link>
}

function PracticeSession({ initialCards }: { initialCards: ReturnType<typeof useWeakCards>['cards'] }) {
  const { t } = useTranslation()
  const starter = useLocalizedStarter()
  const [cards] = useState(initialCards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const reveal = useRef<HTMLButtonElement>(null)
  const summary = useRef<HTMLHeadingElement>(null)
  const card = cards[index]

  useEffect(() => {
    if (!index) return
    if (card) reveal.current?.focus()
    else summary.current?.focus()
    window.scrollTo({ top: 0 })
  }, [card, index])

  if (!card) {
    return (
      <main className="review-workspace review-centered gap-4">
        <h1 ref={summary} tabIndex={-1} className="text-2xl font-semibold">{t('practice.complete')}</h1>
        <BackToStats />
      </main>
    )
  }

  return (
    <main className="review-workspace min-h-dvh">
      <header className="review-session-header">
        <div className="review-session-inner">
          <BackToStats />
          <h1 className="min-w-0 flex-1 font-semibold">{t('practice.title')}</h1>
          <p className="review-position text-sm font-semibold tabular-nums">{t('workspace.cardPosition', { current: index + 1, total: cards.length })}</p>
        </div>
      </header>
      <div className="review-session-body">
        <ProgressBar value={index} max={cards.length} size="sm" label={t('workspace.reviewProgress')} />
        <p className="review-card-meta study-muted [overflow-wrap:anywhere]">{starter.deck(card.deckId, card.deckTitle)}</p>
        <button ref={reveal} type="button" className="study-panel review-card" aria-label={t('review.flipLabel')}
          aria-pressed={flipped} aria-describedby="review-card-content" onClick={() => setFlipped((previous) => !previous)}>
          <ReviewCardContent card={card} flipped={flipped} />
          <span className="review-reveal-label">
            <Icon name={flipped ? 'chevronUp' : 'chevronDown'} size={18} />
            {t(flipped ? 'workspace.hideAnswer' : 'workspace.showAnswer')}
          </span>
        </button>
        {flipped && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => {
              setFlipped(false)
              setIndex(index + 1)
            }}>{t(index + 1 === cards.length ? 'practice.finish' : 'common.next')}</Button>
          </div>
        )}
      </div>
    </main>
  )
}
