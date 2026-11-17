import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
import type { DeckSummary } from '../lib/api'

export const DeckTile = memo(function DeckTile({ deck }: { deck: DeckSummary }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/study/decks/${deck.id}`}
      className="pressable surface-card block p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black"
          style={{ background: `${deck.color}22`, color: deck.color }}
        >
          {deck.icon || '📚'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{deck.title}</p>
          <p className="truncate text-xs font-semibold text-[var(--color-muted)]">
            {deck.subjectName || t('decks.noSubject')}
          </p>
        </div>
        {deck.dueCount > 0 && (
          <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-black text-[#3b2503]">
            {t('decks.dueCount', { count: deck.dueCount })}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-bold text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1">
          <Icon name="cards" size={14} /> {t('decks.cardCount', { count: deck.cardCount })}
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--color-primary)]">
          {t('decks.open')} <Icon name="arrowRight" size={13} />
        </span>
      </div>
    </Link>
  )
})
