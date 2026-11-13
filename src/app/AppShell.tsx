import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '../components/Icon'
import { Modal } from '../components/Modal'
import { ProgressBar } from '../components/ProgressBar'
import { Mascot } from '../components/Mascot'
import { AiPet } from '../components/AiPet'
import { GoalRing } from '../components/GoalRing'
import { celebrate } from '../lib/confetti'
import { playSound } from '../lib/sound'
import { useOnline, useSettings } from '../lib/useSettings'
import { updateSettings } from '../lib/settings'
import { levelTitleKey, useApp, xpForNext } from '../lib/store'

type NavItem = { to: string; label: string; icon: IconName }

const mobileNav: NavItem[] = [
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/study', label: 'nav.study', icon: 'book' },
  { to: '/notes', label: 'nav.notes', icon: 'note' },
  { to: '/plan', label: 'nav.plan', icon: 'calendar' },
  { to: '/profile', label: 'nav.profile', icon: 'user' },
]

const sideNav: NavItem[] = [
  ...mobileNav,
  { to: '/subjects', label: 'nav.subjects', icon: 'layers' },
  { to: '/stats', label: 'nav.stats', icon: 'chart' },
  { to: '/explore', label: 'nav.explore', icon: 'compass' },
]

const immersiveRoutes = ['/study/review', '/study/boss', '/study/timer']

function Logo() {
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(79,70,229,0.28)]">
      <svg viewBox="0 0 32 32" width="24" height="24" fill="none" aria-hidden="true">
        <path d="M7 8h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-8l-5 4v-4H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Z" fill="currentColor" opacity="0.22" />
        <path d="M7 8h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-8l-5 4v-4H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M16 11.5l1.2 2.8 2.8 1.2-2.8 1.2L16 19.5l-1.2-2.8L12 15.5l2.8-1.2L16 11.5Z" fill="#fbbf24" />
      </svg>
    </span>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const onboarded = useApp((s) => s.onboarded)
  const nickname = useApp((s) => s.nickname)
  const buddy = useApp((s) => s.buddy)
  const streak = useApp((s) => s.streak)
  const bestStreak = useApp((s) => s.bestStreak)
  const coins = useApp((s) => s.coins)
  const level = useApp((s) => s.level)
  const xp = useApp((s) => s.xp)
  const cardsToday = useApp((s) => s.cardsToday)
  const dailyGoal = useApp((s) => s.dailyGoal)
  const owned = useApp((s) => s.owned)
  const settings = useSettings()
  const online = useOnline()
  const [summary, setSummary] = useState<'streak' | 'level' | 'coins' | null>(null)
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const prevLevel = useRef(level)
  const nextXp = xpForNext(level)

  const immersive = immersiveRoutes.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
  const hidePet = location.pathname.startsWith('/study/quiz') || location.pathname.startsWith('/study/minigames')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    if (level > prevLevel.current) {
      setLevelUp(level)
      celebrate()
      playSound('success')
      const timer = window.setTimeout(() => setLevelUp(null), 2400)
      prevLevel.current = level
      return () => window.clearTimeout(timer)
    }
    prevLevel.current = level
  }, [level])

  if (!onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (immersive) {
    return (
      <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
        <Outlet />
      </div>
    )
  }

  const freezeCount = owned.filter((id) => id === 'freeze').length

  return (
    <div className="min-h-dvh text-[var(--color-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-5">
          <Link to="/" className="flex min-h-11 items-center gap-2 rounded-2xl pr-1" aria-label={t('app.name')}>
            <Logo />
            <span className="hidden leading-tight sm:block">
              <span className="block text-lg font-black tracking-tight">{t('app.name')}</span>
              <span className="block text-[11px] font-semibold text-[var(--color-muted)]">{t('app.tagline')}</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setSummary('streak')}
              className="flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm font-extrabold hover:bg-[var(--color-surface-alt)]"
              aria-label={t('shell.streakSummary')}
            >
              <Icon name="flame" size={18} className="text-[var(--color-accent)]" />
              {streak}
            </button>

            <button
              onClick={() => setSummary('level')}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 hover:bg-[var(--color-surface-alt)]"
              aria-label={t('shell.levelSummary')}
            >
              <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-black leading-tight text-white">
                {t('shell.levelShort', { level })}
              </span>
              <span className="hidden h-1.5 w-10 overflow-hidden rounded-full bg-[var(--color-surface-alt)] sm:block">
                <span
                  className="block h-full rounded-full bg-[var(--color-primary)]"
                  style={{ width: `${Math.min(100, (xp / nextXp) * 100)}%` }}
                />
              </span>
            </button>

            <button
              onClick={() => setSummary('coins')}
              className="flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm font-extrabold hover:bg-[var(--color-surface-alt)]"
              aria-label={t('shell.coinsSummary')}
            >
              <Icon name="coin" size={18} className="text-[var(--color-accent)]" />
              {coins}
            </button>

            <button
              onClick={() => updateSettings({ sound: !settings.sound })}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
              aria-label={settings.sound ? t('shell.mute') : t('shell.unmute')}
              aria-pressed={!settings.sound}
            >
              <Icon name={settings.sound ? 'volume' : 'volumeOff'} size={19} />
            </button>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--color-surface-alt)] ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                }`
              }
              aria-label={t('shell.settings')}
            >
              <Icon name="settings" size={19} />
            </NavLink>
          </div>
        </div>
        <div className="h-0.5 w-full bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${Math.min(100, (xp / nextXp) * 100)}%` }}
          />
        </div>
      </header>

      {!online && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-2 text-center text-xs font-bold text-[#92610a] dark:text-[var(--color-accent)]">
          <span className="inline-flex items-center gap-2">
            <Icon name="wifiOff" size={15} />
            {t('shell.offline')}
          </span>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col p-4 md:flex">
          <nav className="space-y-1" aria-label={t('nav.main')}>
            {sideNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition ${
                    isActive
                      ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                <Icon name={item.icon} size={20} />
                {t(item.label)}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2">
              <Mascot species={buddy} mood="happy" size={54} />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{nickname}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{t(`profile.titles.${levelTitleKey(level)}`)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[var(--color-muted)]">
              <span>{t('home.todayGoal')}</span>
              <span>
                {cardsToday}/{dailyGoal}
              </span>
            </div>
            <div className="mt-1">
              <ProgressBar value={cardsToday} max={dailyGoal} size="sm" />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-5 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl md:hidden"
        aria-label={t('nav.main')}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                }`
              }
            >
              <Icon name={item.icon} size={21} />
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {!hidePet && <AiPet />}

      <Modal open={summary === 'streak'} title={t('shell.streakSummary')} onClose={() => setSummary(null)}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Icon name="flame" size={34} />
          </div>
          <div>
            <p className="text-3xl font-black">{streak}</p>
            <p className="text-sm text-[var(--color-muted)]">{t('shell.streakDays')}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-[var(--color-surface-alt)] p-3">
            <p className="text-[var(--color-muted)]">{t('shell.bestStreak')}</p>
            <p className="text-lg font-extrabold">{bestStreak}</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface-alt)] p-3">
            <p className="text-[var(--color-muted)]">{t('shell.freezes')}</p>
            <p className="text-lg font-extrabold">{freezeCount}/2</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--color-muted)]">{t('shell.streakHint')}</p>
      </Modal>

      <Modal open={summary === 'level'} title={t('shell.levelSummary')} onClose={() => setSummary(null)}>
        <div className="flex items-center gap-4">
          <GoalRing value={xp} max={nextXp} size={92} stroke={9}>
            <span className="text-lg font-black">{level}</span>
          </GoalRing>
          <div className="min-w-0">
            <p className="text-lg font-extrabold">{t(`profile.titles.${levelTitleKey(level)}`)}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {t('shell.xpToNext', { xp: nextXp - xp, level: level + 1 })}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={xp} max={nextXp} showLabel label={t('shell.levelProgress')} />
        </div>
      </Modal>

      <Modal open={summary === 'coins'} title={t('shell.coinsSummary')} onClose={() => setSummary(null)}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Icon name="coin" size={34} />
          </div>
          <div>
            <p className="text-3xl font-black">{coins}</p>
            <p className="text-sm text-[var(--color-muted)]">{t('shell.coinsEarned')}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--color-muted)]">{t('shell.coinsHint')}</p>
        <Link
          to="/profile"
          onClick={() => setSummary(null)}
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 font-bold text-white"
        >
          {t('shell.spendCoins')}
        </Link>
      </Modal>

      {levelUp !== null && (
        <button
          onClick={() => setLevelUp(null)}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[var(--color-navy)]/80 p-6 text-center text-white backdrop-blur-sm"
          aria-label={t('shell.dismiss')}
        >
          <div className="animate-pop-in">
            <Mascot species={buddy} mood="sparkle" size={180} accessory="hat" />
          </div>
          <div className="animate-pop-in rounded-[28px] bg-white/10 px-8 py-5 ring-1 ring-white/25">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">{t('shell.levelUp')}</p>
            <p className="text-5xl font-black">{levelUp}</p>
            <p className="mt-1 text-sm text-white/80">{t('shell.levelUpHint')}</p>
          </div>
        </button>
      )}
    </div>
  )
}
