import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '../../components/Icon'
import { StudyQueue } from '../../components/StudyQueue'
import { useDecks } from '../../lib/study'
import { isGuestMode } from '../../lib/auth'

const tools: { to: string; icon: IconName; title: string; accountOnly?: boolean }[] = [
  { to: '/study/quiz', icon: 'target', title: 'study.modes.quiz' },
  { to: '/study/timer', icon: 'timer', title: 'study.modes.timer' },
  { to: '/subjects', icon: 'bookmark', title: 'study.modes.subjects' },
  { to: '/study/boss', icon: 'sword', title: 'study.modes.boss' },
  { to: '/study/minigames', icon: 'gamepad', title: 'study.modes.minigames' },
  { to: '/study/slides', icon: 'layers', title: 'slides.title', accountOnly: true },
  { to: '/quiz', icon: 'users', title: 'quizRoom.liveRooms', accountOnly: true },
  { to: '/library', icon: 'book', title: 'library.title', accountOnly: true },
]

export function StudyPage() {
  const { t } = useTranslation()
  const decksQuery = useDecks()
  const decks = decksQuery.data
  const guest = isGuestMode()

  return (
    <div className="study-workspace">
      <header className="study-page-header study-feature-header study-hub-header">
        <div>
          <h1>{t('study.title')}</h1>
          <p className="study-muted">{t('workspace.studyDescription')}</p>
        </div>
        <span className="study-hub-sticker" aria-hidden="true"><Icon name="bolt" size={33} /></span>
      </header>

      <StudyQueue decksQuery={decksQuery} />

      <div className="study-hub-grid">
        <section className="study-panel study-hub-tools" aria-labelledby="study-tools-title">
          <h2 id="study-tools-title" className="study-section-title">{t('workspace.studyTools')}</h2>
          <div className="study-shortcuts mt-3">
            {tools.filter((tool) => !guest || !tool.accountOnly).map(({ to, icon, title }) => (
              <Link key={to} to={to}>
                <span className="study-icon study-icon-small"><Icon name={icon} size={19} /></span>
                <span>{t(title)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="study-panel" aria-labelledby="deck-library-title">
          <div className="flex flex-wrap items-center justify-between gap-x-4">
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
      </div>
    </div>
  )
}
