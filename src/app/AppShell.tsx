import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const nav = [
  { to: '/', label: 'nav.home', icon: '🏠' },
  { to: '/study', label: 'nav.study', icon: '📚' },
  { to: '/notes', label: 'nav.notes', icon: '📝' },
  { to: '/plan', label: 'nav.plan', icon: '🗓️' },
  { to: '/profile', label: 'nav.profile', icon: '👤' },
]

export function AppShell() {
  const { t, i18n } = useTranslation()
  const toggleLang = () => i18n.changeLanguage(i18n.language === 'km' ? 'en' : 'km')

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <p className="font-extrabold leading-tight">StudyQuest</p>
              <p className="text-xs text-[var(--color-muted)] leading-tight">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="rounded-lg px-2 py-1 text-sm hover:bg-[var(--color-surface-alt)]">{i18n.language === 'km' ? t('common.english') : t('common.khmer')}</button>
            <NavLink to="/settings" className="rounded-lg px-2 py-1 text-sm hover:bg-[var(--color-surface-alt)]">{t('shell.settings')}</NavLink>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:pb-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-1 py-2 text-xs ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`}>
              <span>{n.icon}</span>
              <span>{t(n.label)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <aside className="fixed left-4 top-24 hidden md:block">
        <div className="w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-sm)]">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 ${isActive ? 'bg-[var(--color-surface-alt)] font-semibold' : 'hover:bg-[var(--color-surface-alt)]'}`}>
              <span>{n.icon}</span>
              <span>{t(n.label)}</span>
            </NavLink>
          ))}
        </div>
      </aside>
    </div>
  )
}
