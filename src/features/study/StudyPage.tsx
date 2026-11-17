import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '../../components/Icon'
import { DeckTile } from '../../components/DeckTile'
import { DeckTileSkeleton } from '../../components/Skeleton'
import { useDecks } from '../../lib/study'

type Mode = {
  to: string
  icon: IconName
  title: string
  desc: string
  reward: string
  tone: string
  iconTone: string
}

const modes: Mode[] = [
  {
    to: '/study/review',
    icon: 'cards',
    title: 'study.modes.flashcards',
    desc: 'study.modes.flashcardsDesc',
    reward: 'study.rewards.review',
    tone: 'from-blue-500/10 to-transparent',
    iconTone: 'bg-blue-600 text-white shadow-sm shadow-blue-500/25',
  },
  {
    to: '/study/quiz',
    icon: 'target',
    title: 'study.modes.quiz',
    desc: 'study.modes.quizDesc',
    reward: 'study.rewards.quiz',
    tone: 'from-sky-500/10 to-transparent',
    iconTone: 'bg-sky-500 text-white shadow-sm shadow-sky-500/25',
  },
  {
    to: '/study/minigames',
    icon: 'gamepad',
    title: 'study.modes.minigames',
    desc: 'study.modes.minigamesDesc',
    reward: 'study.rewards.minigames',
    tone: 'from-rose-500/10 to-transparent',
    iconTone: 'bg-rose-500 text-white shadow-sm shadow-rose-500/25',
  },
  {
    to: '/study/boss',
    icon: 'sword',
    title: 'study.modes.boss',
    desc: 'study.modes.bossDesc',
    reward: 'study.rewards.boss',
    tone: 'from-violet-500/10 to-transparent',
    iconTone: 'bg-violet-600 text-white shadow-sm shadow-violet-500/25',
  },
  {
    to: '/study/timer',
    icon: 'timer',
    title: 'study.modes.timer',
    desc: 'study.modes.timerDesc',
    reward: 'study.rewards.timer',
    tone: 'from-emerald-500/10 to-transparent',
    iconTone: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25',
  },
  {
    to: '/subjects',
    icon: 'bookmark',
    title: 'study.modes.subjects',
    desc: 'study.modes.subjectsDesc',
    reward: 'study.rewards.subjects',
    tone: 'from-indigo-500/10 to-transparent',
    iconTone: 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25',
  },
  {
    to: '/study/decks',
    icon: 'layers',
    title: 'study.modes.decks',
    desc: 'study.modes.decksDesc',
    reward: 'study.rewards.decks',
    tone: 'from-amber-500/10 to-transparent',
    iconTone: 'bg-amber-500 text-white shadow-sm shadow-amber-500/25',
  },
]

export function StudyPage() {
  const { t } = useTranslation()
  const decksQuery = useDecks()
  const decks = decksQuery.data ?? []
  const due = decks.reduce((sum, deck) => sum + deck.dueCount, 0)

  return (
    <div className="space-y-5">
      <section className="premium-hero rounded-[24px] p-6 text-white sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">{t('study.kicker')}</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{t('study.title')}</h1>
        <p className="mt-1 max-w-md text-sm text-white/80">{t('study.subtitle')}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold ring-1 ring-white/20">
            <Icon name="cards" size={16} /> {t('study.dueToday', { count: due })}
          </span>
          <Link
            to="/study/review"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f172a] shadow-md hover:bg-slate-100 transition active:scale-[0.98]"
          >
            <Icon name="play" size={16} className="text-[#2563eb]" />
            <span className="text-[#0f172a]">{t('study.startReview')}</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">{t('study.chooseMode')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((mode) => (
            <Link
              key={mode.to}
              to={mode.to}
              className="pressable surface-card group relative flex items-start gap-4 p-5 text-[var(--color-text)]"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${mode.iconTone}`}>
                <Icon name={mode.icon} size={23} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[var(--color-text)]">{t(mode.title)}</p>
                <p className="mt-0.5 text-xs font-semibold leading-snug text-[var(--color-muted)]">{t(mode.desc)}</p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                  <Icon name="bolt" size={11} /> {t(mode.reward)}
                </p>
              </div>
              <Icon name="chevronRight" size={18} className="mt-1 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-text)]" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t('study.yourDecks')}</h2>
          <Link to="/study/decks" className="text-xs font-bold text-[var(--color-primary)]">
            {t('common.seeAll')}
          </Link>
        </div>
        {decksQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <DeckTileSkeleton />
            <DeckTileSkeleton />
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[var(--color-border)] p-6 text-center">
            <p className="font-bold">{t('decks.noDecks')}</p>
            <Link to="/study/decks" className="mt-2 inline-flex text-sm font-bold text-[var(--color-primary)]">
              {t('decks.newDeck')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {decks.slice(0, 4).map((deck) => (
              <DeckTile key={deck.id} deck={deck} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
