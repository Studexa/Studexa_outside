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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">{t('shell.settings')}</h1>
        <p className="text-sm text-[var(--color-muted)]">{t('settings.subtitle')}</p>
      </div>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Icon name="compass" size={18} className="text-[var(--color-primary)]" /> {t('common.language')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => i18n.changeLanguage('en')}
            aria-pressed={i18n.language === 'en'}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold ${
              i18n.language === 'en'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <span className="text-xl">🇬🇧</span> {t('common.english')}
          </button>
          <button
            onClick={() => i18n.changeLanguage('km')}
            aria-pressed={i18n.language === 'km'}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold ${
              i18n.language === 'km'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <span className="text-xl">🇰🇭</span> {t('common.khmer')}
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Icon name="sun" size={18} className="text-[var(--color-accent)]" /> {t('common.theme')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            aria-pressed={settings.theme === 'light'}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold ${
              settings.theme === 'light'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <Icon name="sun" size={18} /> {t('common.light')}
          </button>
          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            aria-pressed={settings.theme === 'dark'}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold ${
              settings.theme === 'dark'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <Icon name="moon" size={18} /> {t('common.dark')}
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Icon name="book" size={18} className="text-[var(--color-primary)]" /> {t('settings.textSize')}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {fontSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => updateSettings({ fontSize: size.id })}
              aria-pressed={settings.fontSize === size.id}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 font-bold ${
                settings.fontSize === size.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              <span className={size.id === 'sm' ? 'text-sm' : size.id === 'lg' ? 'text-xl' : 'text-base'}>{size.sample}</span>
              <span className="text-[11px] text-[var(--color-muted)]">{t(size.label)}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{t('settings.textSizeHint')}</p>
      </section>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Icon name="volume" size={18} className="text-[var(--color-success)]" /> {t('common.sound')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              updateSettings({ sound: true })
              window.setTimeout(() => playSound('success'), 0)
            }}
            aria-pressed={settings.sound}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold ${
              settings.sound
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <Icon name="volume" size={17} /> {t('common.on')}
          </button>
          <button
            onClick={() => updateSettings({ sound: false })}
            aria-pressed={!settings.sound}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold ${
              !settings.sound
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <Icon name="volumeOff" size={17} /> {t('common.off')}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-[var(--color-surface-alt)]/60 p-3">
          <div>
            <p className="text-sm font-bold">{t('common.reducedMotion')}</p>
            <p className="text-[11px] text-[var(--color-muted)]">{t('settings.motionHint')}</p>
          </div>
          <button
            onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
            aria-pressed={settings.reducedMotion}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${settings.reducedMotion ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${settings.reducedMotion ? 'left-7' : 'left-1'}`}
            />
            <span className="sr-only">{t('common.reducedMotion')}</span>
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Icon name="user" size={18} className="text-[var(--color-primary)]" /> {t('settings.account')}
        </h2>
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-alt)]/60 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] font-black text-white">
            {nickname.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{nickname}</p>
            <p className="truncate text-[11px] text-[var(--color-muted)]">
              {user?.email ?? t('settings.accountHint')}
            </p>
          </div>
          <button
            onClick={() => {
              replayOnboarding()
              navigate('/onboarding')
            }}
            className="min-h-10 rounded-xl bg-[var(--color-surface)] px-3 text-xs font-bold text-[var(--color-primary)]"
          >
            {t('settings.replay')}
          </button>
        </div>
        <Button variant="secondary" full className="mt-3" onClick={() => void signOut()}>
          <Icon name="arrowRight" size={17} /> {t('settings.signOut')}
        </Button>
        <Button variant="danger" full className="mt-2" onClick={() => setResetOpen(true)}>
          <Icon name="trash" size={17} /> {t('settings.reset')}
        </Button>
        <p className="mt-2 text-center text-[11px] text-[var(--color-muted)]">{t('settings.resetHint')}</p>
      </section>

      <p className="pb-2 text-center text-xs font-semibold text-[var(--color-muted)]">
        {t('app.name')} · {t('settings.version')} 1.0 · {t('app.tagline')}
      </p>

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
