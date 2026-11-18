import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Mascot } from '../../components/Mascot'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { betaEnabled, betaSupportEmail } from '../../lib/beta'

type Mode = 'login' | 'register'

export function AuthPage({ mode }: { mode: Mode }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAuth((s) => s.status)
  const bootstrap = useAuth((s) => s.bootstrap)
  const login = useAuth((s) => s.login)
  const register = useAuth((s) => s.register)
  const loginAsGuest = useAuth((s) => s.loginAsGuest)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [adultConfirmed, setAdultConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    if (status === 'idle') void bootstrap()
  }, [status, bootstrap])

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        navigate(from, { replace: true })
      } else {
        await register({
          email: email.trim(),
          password,
          nickname: nickname.trim(),
          language: i18n.language === 'km' ? 'km' : 'en',
          ...(betaEnabled && { inviteCode: inviteCode.trim(), adultConfirmed }),
        })
        navigate('/onboarding', { replace: true })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 'BETA_INVALID_INVITE' ? t('beta.invalidInvite')
          : err.code === 'BETA_ADULT_REQUIRED' ? t('beta.adultRequired') : err.message)
        setFields(err.fields ?? {})
      } else {
        setError(t('auth.errorGeneric'))
      }
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (name: string) =>
    fields[name] ? <p className="mt-1 text-xs font-bold text-[var(--color-danger)]">{fields[name]}</p> : null

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1fr_1fr] md:px-8 lg:gap-16">
        <section className="premium-hero relative hidden min-h-[620px] overflow-hidden rounded-[28px] p-10 text-white md:flex md:flex-col md:justify-between">
          <div className="relative flex items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Icon name="sparkles" size={24} />
            </span>
            <span className="text-xl font-black">{t('app.name')}</span>
          </div>
          <div className="relative my-12 flex flex-col items-start">
            <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-6"><Mascot species="owl" mood="happy" size={120} /></div>
            <p className="max-w-sm text-4xl font-semibold leading-tight tracking-tight text-white">
              {t('auth.kicker')}
            </p>
          </div>
          <ul className="relative space-y-2 text-sm font-semibold text-white/85">
            <li className="flex items-center gap-2">
              <Icon name="cards" size={17} className="text-amber-300" /> {t('auth.featureMemory')}
            </li>
            <li className="flex items-center gap-2">
              <Icon name="flame" size={17} className="text-amber-300" /> {t('auth.featureStreak')}
            </li>
            <li className="flex items-center gap-2">
              <Icon name="shield" size={17} className="text-amber-300" /> {t('auth.featureSafe')}
            </li>
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
                <Icon name="sparkles" size={22} />
              </span>
              <span className="text-lg font-black">{t('app.name')}</span>
            </div>
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'km' ? 'en' : 'km')}
              aria-label={t('shell.switchLanguage')}
              className="min-h-11 rounded-full border border-[var(--color-border)] px-3 text-sm font-bold"
            >
              {t('shell.languageToggle')}
            </button>
          </div>

          <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 shadow-[var(--shadow-md)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              {mode === 'login' ? t('auth.welcomeBack') : t('auth.start')}
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>

            <form className="mt-4 space-y-3" onSubmit={onSubmit}>
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-bold" htmlFor="nickname">
                    {t('auth.nickname')}
                  </label>
                  <input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={t('auth.nicknamePlaceholder')}
                    autoComplete="nickname"
                    maxLength={50}
                    required
                    className="mt-1 w-full rounded-[16px] px-4 py-3 font-semibold"
                  />
                  {fieldError('nickname')}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold" htmlFor="email">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  required
                  className="mt-1 w-full rounded-[16px] px-4 py-3 font-semibold"
                />
                {fieldError('email')}
              </div>

              <div>
                <label className="block text-sm font-bold" htmlFor="password">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                  className="mt-1 w-full rounded-[16px] px-4 py-3 font-semibold"
                />
                {fieldError('password')}
              </div>

              {betaEnabled && mode === 'register' && (
                <>
                  <label className="block text-sm font-bold">
                    {t('beta.inviteCode')}
                    <input autoComplete="off" spellCheck={false} required maxLength={128}
                      className="mt-1 w-full rounded-[16px] px-4 py-3"
                      value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" required checked={adultConfirmed}
                      onChange={(event) => setAdultConfirmed(event.target.checked)} />
                    {t('beta.adultConfirm')}
                  </label>
                </>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-2xl bg-[var(--color-danger-soft,var(--color-surface-alt))] px-3 py-2 text-sm font-bold text-[var(--color-danger)]"
                >
                  {error}
                </p>
              )}

              <Button type="submit" full size="lg" disabled={busy || status === 'loading'}>
                {busy ? t('common.loading') : mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
                <Icon name="arrowRight" size={19} />
              </Button>
            </form>

            {!betaEnabled && <>
            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border)]" />
              </div>
              <span className="relative bg-[var(--color-surface)] px-3 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                {t('common.or', 'or')}
              </span>
            </div>

            <Button
              type="button"
              variant="secondary"
              full
              size="lg"
              onClick={() => {
                loginAsGuest()
                navigate(from, { replace: true })
              }}
            >
              <Icon name="sparkles" size={19} />
              {t('auth.guestButton', 'Continue in Demo / Offline Mode')}
            </Button>
            </>}

            <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
              {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
              <Link
                to={mode === 'login' ? '/register' : '/login'}
                className="font-black text-[var(--color-primary)]"
              >
                {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
              </Link>
            </p>
            {betaEnabled && mode === 'login' && (
              <p className="mt-3 text-center text-sm text-[var(--color-muted)]">
                {t('beta.support')}{betaSupportEmail && (
                  <> <a href={`mailto:${betaSupportEmail}`} className="underline">{betaSupportEmail}</a></>
                )}
              </p>
            )}
          </div>

          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'km' ? 'en' : 'km')}
            className="mx-auto mt-4 hidden min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] md:flex"
          >
            <Icon name="compass" size={16} />
            {i18n.language === 'km' ? t('common.english') : t('common.khmer')}
          </button>
        </section>
      </div>
    </div>
  )
}
