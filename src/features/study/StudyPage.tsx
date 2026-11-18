import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '../../components/Icon'
import { StudyQueue } from '../../components/StudyQueue'
import { useDecks } from '../../lib/study'

const tools: { to: string; icon: IconName; mode: string }[] = [
  { to: '/study/quiz', icon: 'target', mode: 'quiz' },
  { to: '/study/timer', icon: 'timer', mode: 'timer' },
  { to: '/subjects', icon: 'bookmark', mode: 'subjects' },
  { to: '/study/boss', icon: 'sword', mode: 'boss' },
  { to: '/study/minigames', icon: 'gamepad', mode: 'minigames' },
]

export function StudyPage() {
  const { t } = useTranslation()
  const decksQuery = useDecks()
  const decks = decksQuery.data

  return (
    <div className="study-workspace">
      <header className="study-page-header">
        <h1>{t('study.title')}</h1>
        <p className="study-muted">{t('workspace.studyDescription')}</p>
      </header>

      <StudyQueue decksQuery={decksQuery} title={t('workspace.queue')} />

      <section className="study-panel" aria-labelledby="deck-library-title">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 id="deck-library-title" className="study-section-title">{t('workspace.deckLibrary')}</h2>
          <Link to="/study/decks" className="study-text-link">
            {t('workspace.browseDecks')} <Icon name="arrowRight" size={16} />
          </Link>
        </div>

        {decks?.length ? (
          <ul className="study-deck-list mt-2">
            {decks.slice(0, 4).map((deck) => (
              <li key={deck.id}>
                <Link to={'/study/decks/' + deck.id} className="study-deck-row">
                  <span className="study-icon study-icon-small"><Icon name="layers" size={18} /></span>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className="block font-semibold">{deck.title}</span>
                    <span className="study-muted block">{deck.subjectName || t('decks.noSubject')}</span>
                  </span>
                  <span className="study-deck-count">{t('decks.dueCount', { count: deck.dueCount })}</span>
                  <Icon name="chevronRight" size={17} className="shrink-0 text-(--color-muted)" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="study-muted mt-2">{t(decks ? 'decks.noDecks' : decksQuery.isError ? 'workspace.deckError' : 'common.loading')}</p>
        )}
      </section>

      <section className="study-panel" aria-labelledby="study-tools-title">
        <h2 id="study-tools-title" className="study-section-title">{t('workspace.studyTools')}</h2>
        <div className="study-shortcuts mt-3">
          {tools.map(({ to, icon, mode }) => (
            <Link key={to} to={to}><Icon name={icon} size={20} />{t('study.modes.' + mode)}</Link>
          ))}
        </div>
      </section>
    </div>
  )
}
