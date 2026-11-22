import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { useDecks } from '../lib/study'
import { Button } from './Button'
import { Icon } from './Icon'

export function StudyQueue({ decksQuery }: { decksQuery: ReturnType<typeof useDecks> }) {
  const { t } = useTranslation()
  const decks = decksQuery.data
  const due = decks?.reduce((count, deck) => count + deck.dueCount, 0) ?? 0

  return (
    <section className="study-panel study-queue" aria-labelledby="study-queue-title">
      <div className="study-queue-content">
        <div className="study-icon"><Icon name="cards" size={22} /></div>
        <div className="min-w-0">
          <h2 id="study-queue-title" className="study-section-title">
            {t('workspace.queue')}
          </h2>
          {decks ? (
            <p className="study-queue-count">{t(due ? 'workspace.cardsDue' : decks.length ? 'workspace.caughtUp' : 'decks.noDecks', { count: due })}</p>
          ) : decksQuery.isError ? (
            <p role="status" className="study-muted">{t('workspace.deckError')}</p>
          ) : (
            <p role="status" className="study-muted">{t('workspace.queueLoading')}</p>
          )}
          {decks && !due && (
            <p className="study-muted">{t(decks.length ? 'workspace.caughtUpHint' : 'workspace.firstDeckHint')}</p>
          )}
        </div>
      </div>

      {decks ? (
        <Link className="study-action" to={due ? '/study/review' : decks.length ? '/study/decks' : '/study/decks?create=1'}>
          {t(due ? 'study.startReview' : decks.length ? 'workspace.browseDecks' : 'decks.createDeck')}
          <Icon name="arrowRight" size={18} />
        </Link>
      ) : decksQuery.isError ? (
        <Button variant="secondary" onClick={() => void decksQuery.refetch()} disabled={decksQuery.isFetching}>
          {t('common.retry')}
        </Button>
      ) : null}

      <div className="study-card-art" aria-hidden="true"><Icon name="cards" size={38} /></div>
    </section>
  )
}
