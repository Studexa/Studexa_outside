import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { updateSettings, type FontSize } from '../../lib/settings'
import { useSettings } from '../../lib/useSettings'
import { playSound } from '../../lib/sound'
import { useApp } from '../../lib/store'
import { useAuth } from '../../lib/auth'

const fontSizes: { id: FontSize; label: string; sample: string }[] = [
  { id: 'sm', label: 'settings.fontSmall', sample: 'Aa' },
  { id: 'md', label: 'settings.fontMedium', sample: 'Aa' },
  { id: 'lg', label: 'settings.fontLarge', sample: 'Aa' },
]

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useSettings()
  const replayOnboarding = useApp((s) => s.replayOnboarding)
  const resetAll = useApp((s) => s.resetAll)
  const nickname = useApp((s) => s.nickname)
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const [resetOpen, setResetOpen] = useState(false)

  const confirmReset = () => {
    resetAll()
    setResetOpen(false)
    navigate('/onboarding', { replace: true })
  }

  const signOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-6">
      {/* Page Header */}
      <div className="px-1">
        <h1 className="text-2xl font-black text-[var(--color-text)] sm:text-3xl">{t('shell.settings')}</h1>
        <p className="mt-0.5 text-xs text-[var(--color-muted)] sm:text-sm">{t('settings.subtitle')}</p>
      </div>

      {/* Section 1: Account Profile */}
      <section>
        <h2 className="mb-1.5 px-1 text-xs font-black uppercase tracking-wider text-[var(--color-muted)]">
          {t('settings.account')}
        </h2>
        <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:rounded-[24px]">
          <div className="flex flex-col gap-3.5 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-lg font-black text-white shadow-sm ring-2 ring-white/20 sm:h-14 sm:w-14 sm:text-xl">
                {nickname ? nickname.slice(0, 1).toUpperCase() : 'U'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[var(--color-text)] sm:text-base">{nickname}</p>
                <p className="truncate text-xs font-semibold text-[var(--color-muted)]">
                  {user?.email ?? t('settings.accountHint')}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--color-primary-text)]">
                  <Icon name="checkCircle" size={11} /> {t('common.ready', 'Active')}
                </span>
              </div>
            </div>

            {/* Mobile: 2-column balanced action buttons */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                onClick={() => {
                  replayOnboarding()
                  navigate('/onboarding')
                }}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]/70 active:scale-[0.98]"
              >
                <Icon name="reset" size={14} className="text-[var(--color-primary)]" />
                <span className="truncate">{t('settings.replay')}</span>
              </button>
              <button
                onClick={() => void signOut()}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)]/50 px-3 text-xs font-bold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)] active:scale-[0.98]"
              >
                <Icon name="arrowRight" size={14} />
                <span className="truncate">{t('settings.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Experience & Audio */}
      <section>
        <h2 className="mb-1.5 px-1 text-xs font-black uppercase tracking-wider text-[var(--color-muted)]">
          {t('settings.experience')}
        </h2>
        <div className="divide-y divide-[var(--color-border)]/60 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:rounded-[24px]">
          {/* Language Row */}
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
                <Icon name="compass" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--color-text)]">{t('common.language')}</p>
                <p className="text-xs text-[var(--color-muted)]">{t('settings.langDesc')}</p>
              </div>
            </div>

            {/* Segmented selector with high contrast in both themes */}
            <div className="grid w-full grid-cols-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1 sm:w-auto sm:flex">
              <button
                onClick={() => i18n.changeLanguage('en')}
                aria-pressed={i18n.language === 'en'}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs transition-all sm:min-h-9 ${
                  i18n.language === 'en'
                    ? 'bg-[var(--color-primary)] text-white font-black shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] font-extrabold'
                }`}
              >
                <span>🇬🇧</span> English
              </button>
              <button
                onClick={() => i18n.changeLanguage('km')}
                aria-pressed={i18n.language === 'km'}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs transition-all sm:min-h-9 ${
                  i18n.language === 'km'
                    ? 'bg-[var(--color-primary)] text-white font-black shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] font-extrabold'
                }`}
              >
                <span>🇰🇭</span> ភាសាខ្មែរ
              </button>
            </div>
          </div>

          {/* Sound Effects Row */}
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-success-soft)] text-[var(--color-success)] shadow-xs">
                <Icon name={settings.sound ? 'volume' : 'volumeOff'} size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--color-text)]">{t('common.sound')}</p>
                <p className="text-xs text-[var(--color-muted)] line-clamp-1 sm:line-clamp-none">{t('settings.soundDesc')}</p>
              </div>
            </div>

            <button
              role="switch"
              aria-checked={settings.sound}
              onClick={() => {
                const nextSound = !settings.sound
                updateSettings({ sound: nextSound })
                if (nextSound) {
                  window.setTimeout(() => playSound('success'), 0)
                }
              }}
              className={`relative flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
                settings.sound ? 'bg-[var(--color-primary)]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  settings.sound ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
              <span className="sr-only">{t('common.sound')}</span>
            </button>
          </div>

          {/* Reduced Motion Row */}
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
                <Icon name="sparkles" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--color-text)]">{t('common.reducedMotion')}</p>
                <p className="text-xs text-[var(--color-muted)] line-clamp-1 sm:line-clamp-none">{t('settings.motionHint')}</p>
              </div>
            </div>

            <button
              role="switch"
              aria-checked={settings.reducedMotion}
              onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
              className={`relative flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
                settings.reducedMotion ? 'bg-[var(--color-primary)]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
              <span className="sr-only">{t('common.reducedMotion')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Display & Appearance */}
      <section>
        <h2 className="mb-1.5 px-1 text-xs font-black uppercase tracking-wider text-[var(--color-muted)]">
          {t('settings.appearance')}
        </h2>
        <div className="divide-y divide-[var(--color-border)]/60 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:rounded-[24px]">
          {/* Theme Row */}
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-xs">
                <Icon name={settings.theme === 'antigravity' ? 'sparkles' : settings.theme === 'dark' ? 'moon' : 'sun'} size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--color-text)]">{t('common.theme')}</p>
                <p className="text-xs text-[var(--color-muted)]">{t('settings.themeDesc')}</p>
              </div>
            </div>

            {/* Segmented Theme Control */}
            <div className="grid w-full grid-cols-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1 sm:w-auto sm:flex">
              <button
                onClick={() => updateSettings({ theme: 'light' })}
                aria-pressed={settings.theme === 'light'}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs transition-all sm:min-h-9 ${
                  settings.theme === 'light'
                    ? 'bg-[var(--color-primary)] text-white font-black shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] font-extrabold'
                }`}
              >
                <Icon name="sun" size={14} /> {t('common.light')}
              </button>
              <button
                onClick={() => updateSettings({ theme: 'dark' })}
                aria-pressed={settings.theme === 'dark'}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs transition-all sm:min-h-9 ${
                  settings.theme === 'dark'
                    ? 'bg-[var(--color-primary)] text-white font-black shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] font-extrabold'
                }`}
              >
                <Icon name="moon" size={14} /> {t('common.dark')}
              </button>
              <button
                onClick={() => updateSettings({ theme: 'antigravity' })}
                aria-pressed={settings.theme === 'antigravity'}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs transition-all sm:min-h-9 ${
                  settings.theme === 'antigravity'
                    ? 'bg-[var(--color-primary)] text-white font-black shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] font-extrabold'
                }`}
              >
                <Icon name="sparkles" size={14} /> {t('common.themeAntigravity')}
              </button>
            </div>
          </div>

          {/* Text Size Row */}
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
                <Icon name="book" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--color-text)]">{t('settings.textSize')}</p>
                <p className="text-xs text-[var(--color-muted)]">{t('settings.textSizeHint')}</p>
              </div>
            </div>

            {/* Segmented Text Size Control */}
            <div className="grid w-full grid-cols-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1 sm:w-auto sm:flex">
              {fontSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => updateSettings({ fontSize: size.id })}
                  aria-pressed={settings.fontSize === size.id}
                  className={`flex min-h-11 items-center justify-center gap-1 rounded-lg px-2.5 text-xs transition-all sm:min-h-9 ${
                    settings.fontSize === size.id
                      ? 'bg-[var(--color-primary)] text-white font-black shadow-xs'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] font-extrabold'
                  }`}
                >
                  <span className={size.id === 'sm' ? 'text-xs' : size.id === 'lg' ? 'text-base' : 'text-sm'}>
                    {size.sample}
                  </span>
                  <span className="truncate">{t(size.label)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Notifications & Reminders */}
      <section>
        <h2 className="mb-1.5 px-1 text-xs font-black uppercase tracking-wider text-[var(--color-muted)]">
          {t('settings.notifications')}
        </h2>
        <div className="divide-y divide-[var(--color-border)]/60 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:rounded-[24px]">
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs">
                <Icon name="cards" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[var(--color-text)]">{t('settings.dailyReminder')}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{t('settings.dailyReminderFreq')}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2.5 py-1 text-xs font-black text-[var(--color-success-text)] ring-1 ring-[var(--color-success)]/30">
              <Icon name="check" size={12} /> {t('common.on')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-xs">
                <Icon name="flame" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[var(--color-text)]">{t('settings.streakAlert')}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{t('settings.streakAlertFreq')}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2.5 py-1 text-xs font-black text-[var(--color-success-text)] ring-1 ring-[var(--color-success)]/30">
              <Icon name="check" size={12} /> {t('common.on')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] shadow-xs">
                <Icon name="chart" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[var(--color-text)]">{t('settings.weeklyDigest')}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{t('settings.weeklyDigestFreq')}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2.5 py-1 text-xs font-black text-[var(--color-success-text)] ring-1 ring-[var(--color-success)]/30">
              <Icon name="check" size={12} /> {t('common.on')}
            </span>
          </div>
        </div>
      </section>

      {/* Section 5: Data & Reset (Danger Zone) */}
      <section>
        <h2 className="mb-1.5 px-1 text-xs font-black uppercase tracking-wider text-[var(--color-danger)]">
          {t('settings.dangerZone')}
        </h2>
        <div className="overflow-hidden rounded-[20px] border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)]/30 p-3.5 shadow-[var(--shadow-sm)] dark:bg-[var(--color-danger-soft)]/20 sm:rounded-[24px] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[var(--color-danger)]">{t('settings.reset')}</p>
              <p className="text-xs text-[var(--color-muted)]">{t('settings.resetHint')}</p>
            </div>
            <Button variant="danger" onClick={() => setResetOpen(true)} className="w-full shrink-0 sm:w-auto">
              <Icon name="trash" size={17} /> {t('settings.reset')}
            </Button>
          </div>
        </div>
      </section>

      {/* App Version Info Footer */}
      <footer className="pt-2 text-center text-xs font-semibold text-[var(--color-muted)]">
        <p>
          {t('app.name')} · {t('settings.version')} 1.0 · {t('app.tagline')}
        </p>
      </footer>

      {/* Reset Confirmation Modal */}
      <Modal open={resetOpen} title={t('settings.reset')} onClose={() => setResetOpen(false)}>
        <p className="text-sm text-[var(--color-muted)]">{t('settings.resetConfirm')}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" full onClick={() => setResetOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" full onClick={confirmReset}>
            {t('common.confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
