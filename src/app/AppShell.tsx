import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '../components/Icon'
import { Modal } from '../components/Modal'
import { ProgressBar } from '../components/ProgressBar'
import { AiPet } from '../components/AiPet'
import { BetaTutor } from '../components/BetaTutor'
import { TelegramLink } from '../components/TelegramLink'
import { useOnline } from '../lib/useSettings'
import { useApp, xpForNext } from '../lib/store'
import { useGameState } from '../lib/study'
import { isGuestMode } from '../lib/auth'
import { betaEnabled } from '../lib/beta'
import studexaLogo from '../assets/logo_studexa.png'

type NavItem = { to: string; label: string; icon: IconName }

const primaryNav: NavItem[] = [
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/study', label: 'nav.study', icon: 'book' },
  { to: '/notes', label: 'nav.notes', icon: 'note' },
  { to: '/plan', label: 'nav.plan', icon: 'calendar' },
]

const secondaryNav: NavItem[] = [
  { to: '/subjects', label: 'nav.subjects', icon: 'layers' },
  { to: '/stats', label: 'nav.stats', icon: 'chart' },
  { to: '/profile', label: 'nav.profile', icon: 'user' },
  { to: '/explore', label: 'nav.explore', icon: 'compass' },
]

const immersiveRoutes = ['/study/review', '/study/boss', '/study/timer']

function WorkspaceNavLink({ item, mobile }: { item: NavItem; mobile?: boolean }) {
  const { t } = useTranslation()
  return (
    <NavLink className={mobile ? 'study-tab' : 'study-nav-link'} to={item.to} end={item.to === '/'}>
      <Icon name={item.icon} size={19} />
      <span>{t(item.label)}</span>
    </NavLink>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const guest = isGuestMode()
  const workspaceSecondaryNav: NavItem[] = guest ? secondaryNav : [
    { to: '/library', label: 'library.title', icon: 'book' }, ...secondaryNav,
  ]
  const game = useGameState(!guest).data
  const onboarded = useApp((state) => state.onboarded)
  const localStreak = useApp((state) => state.streak)
  const localBestStreak = useApp((state) => state.bestStreak)
  const localCoins = useApp((state) => state.coins)
  const localLevel = useApp((state) => state.level)
  const localXp = useApp((state) => state.xp)
  const owned = useApp((state) => state.owned)
  const online = useOnline()
  const [showProgress, setShowProgress] = useState(false)
  const mobileMore = useRef<HTMLDetailsElement>(null)
  const moreTrigger = useRef<HTMLElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLElement>(null)

  const immersive = immersiveRoutes.some((route) => location.pathname === route || location.pathname.startsWith(route + '/'))
  const hideTutor = location.pathname.startsWith('/study/quiz') || location.pathname.startsWith('/study/minigames')

  useLayoutEffect(() => {
    const shellElement = shell.current
    const headerElement = header.current
    if (!shellElement || !headerElement) return
    const measure = () => shellElement.style.setProperty('--study-header-offset', `${headerElement.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(headerElement)
    return () => observer.disconnect()
  }, [immersive, onboarded])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    if (mobileMore.current) mobileMore.current.open = false
  }, [location.pathname])

  if (!onboarded && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />

  if (immersive) {
    return (
      <div className="min-h-dvh bg-(--color-bg) text-(--color-text)">
        <Outlet />
      </div>
    )
  }

  const level = guest ? localLevel : game?.level
  const xp = guest ? localXp : game?.xpInLevel
  const stats = [
    { label: 'shell.streakDays', value: guest ? localStreak : game?.streakCurrent },
    { label: 'shell.bestStreak', value: guest ? localBestStreak : game?.streakBest },
    { label: 'shell.coinsEarned', value: guest ? localCoins : game?.coins },
    { label: 'shell.freezes', value: guest ? owned.filter((id) => id === 'freeze').length : game?.streakFreezes },
  ]

  return (
    <div className="app-shell min-h-dvh" ref={shell}>
      <a href="#main-content" className="skip-link">{t('shell.skipContent')}</a>

      <header className="study-shell-header" ref={header}>
        <div className="study-shell-header-inner">
          <Link to="/" className="study-brand">
            <img className="study-brand-mark" src={studexaLogo} alt="" width={34} height={34} />
            <span>{t('app.name')}</span>
          </Link>

          <div className="study-header-actions">
            {!hideTutor && (betaEnabled ? !guest && <BetaTutor /> : <AiPet />)}
            <button className="study-header-action" onClick={() => setShowProgress(true)} aria-label={t('workspace.progress')}>
              <Icon name="chart" size={19} /><span className="study-header-label">{t('workspace.progress')}</span>
            </button>
            <NavLink to="/settings" className="study-header-action" aria-label={t('shell.settings')}>
              <Icon name="settings" size={19} />
            </NavLink>
          </div>
        </div>
        {!online && (
          <p className="flex items-center justify-center gap-2 bg-(--color-accent-soft) p-2 text-center text-sm text-(--color-accent-text)" role="status">
            <Icon name="wifiOff" size={16} />{t('shell.offline')}
          </p>
        )}
      </header>

      <div className="study-shell-body">
        <aside className="study-sidebar">
          <nav aria-label={t('nav.main')} className="space-y-1">
            <div className="space-y-1">
              {primaryNav.map((item) => <WorkspaceNavLink key={item.to} item={item} />)}
            </div>
            <div className="mt-5 space-y-1 border-t border-(--study-border) pt-4">
              {workspaceSecondaryNav.map((item) => <WorkspaceNavLink key={item.to} item={item} />)}
              <TelegramLink />
            </div>
          </nav>
        </aside>
        <main id="main-content" tabIndex={-1} className="app-content study-shell-main">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
            <footer className="study-shell-footer"><TelegramLink footer /></footer>
          </div>
        </main>
      </div>

      <nav className="study-bottom-bar" aria-label={t('nav.main')}>
        <div className="mx-auto grid max-w-md grid-cols-5">
          {primaryNav.map((item) => <WorkspaceNavLink key={item.to} item={item} mobile />)}
          <details ref={mobileMore} className="mobile-more relative" onKeyDown={(event) => {
            if (event.key === 'Escape' && mobileMore.current?.open) {
              mobileMore.current.open = false
              moreTrigger.current?.focus()
            }
          }}>
            <summary ref={moreTrigger} className="study-tab list-none">
              <Icon name="layers" size={19} /><span>{t('shell.more')}</span>
            </summary>
            <div className="study-more-menu">
              {workspaceSecondaryNav.map((item) => <WorkspaceNavLink key={item.to} item={item} />)}
              <TelegramLink />
            </div>
          </details>
        </div>
      </nav>

      <Modal open={showProgress} title={t('workspace.progress')} onClose={() => setShowProgress(false)}>
        {level !== undefined && xp !== undefined && (
          <div className="space-y-2">
            <p className="font-semibold">{t('shell.levelShort', { level })}</p>
            <ProgressBar value={xp} max={xpForNext(level)} label={t('shell.levelProgress')} showLabel />
          </div>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-2">
          {stats.map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-(--color-surface-alt) p-3">
              <dt className="study-muted">{t(label)}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-x-5">
          <Link to="/stats" className="study-text-link" onClick={() => setShowProgress(false)}>{t('home.seeStats')}</Link>
          <Link to="/profile" className="study-text-link" onClick={() => setShowProgress(false)}>{t('nav.profile')}</Link>
        </div>
      </Modal>
    </div>
  )
}
