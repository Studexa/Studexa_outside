import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { LanguageSelector } from '../../components/LanguageSelector'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { betaEnabled, betaSupportEmail } from '../../lib/beta'
import studexaLogo from '../../assets/logo_studexa.png'
import studyCat from '../../assets/auth/study-cat.webp'
import './account.css'

type Mode = 'login' | 'register'
const errorKeys: Record<string, string> = {
  INVALID_CREDENTIALS: 'auth.invalidCredentials',
  EMAIL_TAKEN: 'auth.emailTaken',
  BETA_INVALID_INVITE: 'beta.invalidInvite',
  BETA_ADULT_REQUIRED: 'beta.adultRequired',
  BETA_ENROLLMENT_CLOSED: 'auth.enrollmentClosed',
  TOO_MANY_REQUESTS: 'auth.rateLimited',
}

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
  const [showPassword, setShowPassword] = useState(false)
  const [nickname, setNickname] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [adultConfirmed, setAdultConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const returnPath = (location.state as { from?: string } | null)?.from
  const from = returnPath?.startsWith('/') && !returnPath.startsWith('//') && !returnPath.startsWith('/\\') ? returnPath : '/'

  useEffect(() => {
    if (status === 'idle') void bootstrap()
  }, [status, bootstrap])

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || status === 'loading') return
    setError(null)
    setFields({})
    const invalidInputs = Array.from((event.currentTarget as HTMLFormElement).querySelectorAll('input'))
      .filter((input) => !input.validity.valid || (input.required && input.type !== 'checkbox' && !input.value.trim()))
    if (invalidInputs.length) {
      setFields(Object.fromEntries(invalidInputs.map((input) => [input.id, 'invalid'])))
      invalidInputs[0].focus()
      return
    }

    setBusy(true)
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
        setError(errorKeys[err.code] ?? 'auth.errorGeneric')
        setFields(err.fields ?? {})
      } else {
        setError('auth.errorGeneric')
      }
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (name: string) =>
    fields[name] ? <p id={name + '-error'} className="mt-1 text-xs font-semibold text-(--color-danger-text)">
      {t('auth.fieldErrors.' + name, { defaultValue: t('auth.errorGeneric') })}
    </p> : null

  const fieldErrorAttributes = (name: string) => ({
    'aria-invalid': fields[name] ? true : undefined,
    'aria-describedby': fields[name] ? name + '-error' : undefined,
  })

  return (
    <main className="auth-screen" data-mode={mode}>
      <div className="auth-card">
        <section className="auth-form-pane" aria-labelledby="auth-title">
          <div className="auth-form-content">
            <header className="auth-brandbar">
              <div className="auth-brand">
                <img src={studexaLogo} alt="" width={40} height={40} />
                <span>{t('app.name')}</span>
              </div>
              <LanguageSelector />
            </header>

            <h1 id="auth-title" className="auth-heading">
              {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h1>
            <p className="auth-subtitle">
              {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>

            <form className="auth-form" onSubmit={onSubmit} noValidate>
              {mode === 'register' && (
                <div className="auth-field">
                  <label className="block text-sm font-bold" htmlFor="nickname">
                    {t('auth.nickname')}
                  </label>
                  <input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={t('auth.nicknamePlaceholder')}
                    autoComplete="nickname"
                    {...fieldErrorAttributes('nickname')}
                    maxLength={50}
                    required
                    className="auth-input"
                  />
                  {fieldError('nickname')}
                </div>
              )}

              <div className="auth-field">
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
                  maxLength={320}
                  {...fieldErrorAttributes('email')}
                  required
                  className="auth-input"
                />
                {fieldError('email')}
              </div>

              <div className="auth-field">
                <label className="block text-sm font-bold" htmlFor="password">
                  {t('auth.password')}
                </label>
                <div className="auth-password">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    autoCapitalize="none"
                    spellCheck={false}
                    {...fieldErrorAttributes('password')}
                    minLength={8}
                    maxLength={mode === 'register' ? 72 : undefined}
                    required
                    className="auth-input"
                  />
                  <button type="button" aria-controls="password" aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                    onClick={() => setShowPassword((visible) => !visible)} className="auth-password-toggle">
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={19} />
                  </button>
                </div>
                {fieldError('password')}
              </div>

              {betaEnabled && mode === 'register' && (
                <>
                  <label htmlFor="inviteCode" className="auth-field block text-sm font-bold">
                    {t('beta.inviteCode')}
                    <input id="inviteCode" autoComplete="off" spellCheck={false} required maxLength={128}
                      className="auth-input"
                      {...fieldErrorAttributes('inviteCode')}
                      value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
                    {fieldError('inviteCode')}
                  </label>
                  <div>
                    <label className="auth-confirm" htmlFor="adultConfirmed">
                      <input type="checkbox" id="adultConfirmed" required checked={adultConfirmed}
                        {...fieldErrorAttributes('adultConfirmed')}
                        onChange={(event) => setAdultConfirmed(event.target.checked)} />
                      {t('beta.adultConfirm')}
                    </label>
                    {fieldError('adultConfirmed')}
                  </div>
                </>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-2xl bg-[var(--color-danger-soft,var(--color-surface-alt))] px-3 py-2 text-sm font-bold text-[var(--color-danger-text)]"
                >
                  {t(error)}
                </p>
              )}

              <Button type="submit" full className="auth-submit" disabled={busy || status === 'loading'}>
                {busy ? t('common.loading') : mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
                <Icon name="arrowRight" size={19} />
              </Button>
            </form>

            {!betaEnabled && (
              <Button
                type="button"
                variant="secondary"
                full
                className="auth-demo"
                onClick={() => {
                  loginAsGuest()
                  navigate(from, { replace: true })
                }}
              >
                <Icon name="sparkles" size={19} />
                {t('auth.guestButton', 'Continue in Demo / Offline Mode')}
              </Button>
            )}

            <p className="auth-account-link">
              {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
              <Link
                to={mode === 'login' ? '/register' : '/login'}
                state={location.state}
                className="font-black text-[var(--color-primary)]"
              >
                {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
              </Link>
            </p>
            {betaEnabled && mode === 'login' && (
              <p className="auth-support">
                {t('beta.support')}{betaSupportEmail && (
                  <> <a href={`mailto:${betaSupportEmail}`} className="underline">{betaSupportEmail}</a></>
                )}
              </p>
            )}
          </div>
        </section>
        <div className="auth-illustration" aria-hidden="true">
          <img src={studyCat} alt="" width={880} height={1100} fetchPriority="high" />
        </div>
      </div>
    </main>
  )
}
