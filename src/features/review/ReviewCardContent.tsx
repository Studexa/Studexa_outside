import { useTranslation } from 'react-i18next'
import type { DueCard } from '../../lib/api'
import { useLocalizedStarter } from '../../lib/starterContent'

type CardContent = Pick<DueCard, 'deckId' | 'front' | 'back' | 'extra' | 'sourceTitle' | 'sourceExcerpt'>

export function ReviewCardContent({ card, flipped }: { card?: CardContent; flipped: boolean }) {
  const { t } = useTranslation()
  const starter = useLocalizedStarter()
  return (
    <span id="review-card-content" className="review-card-content" aria-live="polite">
      <span className="min-w-0">
        <span className="review-card-label">{t('review.front')}</span>
        <span className={flipped ? 'block text-base whitespace-pre-wrap' : 'review-card-text'}>{card && starter.card(card.deckId, card.front)}</span>
      </span>
      {flipped && (
        <span className="review-answer-content">
          <span className="review-card-label">{t('review.back')}</span>
          <span className="review-card-text">{card && starter.card(card.deckId, card.back)}</span>
          {typeof card?.extra?.explanation === 'string' && card.extra.explanation && (
            <span className="study-muted mt-3 block whitespace-pre-wrap">{card.extra.explanation}</span>
          )}
          {(card?.sourceTitle || card?.sourceExcerpt) && (
            <span className="mt-4 block rounded-xl bg-(--color-surface-alt) p-3 text-sm">
              <span className="block font-semibold">{card.sourceTitle || t('decks.source')}</span>
              {card.sourceExcerpt && <span className="study-muted mt-1 block whitespace-pre-wrap">{card.sourceExcerpt}</span>}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
