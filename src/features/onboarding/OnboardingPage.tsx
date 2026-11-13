import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Mascot } from '../../components/Mascot'
import { Icon } from '../../components/Icon'
import { celebrate } from '../../lib/confetti'
import { playSound } from '../../lib/sound'
import { useApp, type BuddySpecies, type LevelOfStudy } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { ApiError } from '../../lib/api'

const levels: { id: LevelOfStudy; icon: 'book' | 'target' | 'trophy' | 'sparkles' }[] = [
  { id: 'middle', icon: 'book' },
  { id: 'highschool', icon: 'target' },
  { id: 'university', icon: 'trophy' },
  { id: 'self', icon: 'sparkles' },
]

const goals = [10, 15, 20, 30]
const buddies: BuddySpecies[] = ['owl', 'cat', 'fox', 'elephant']

export function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const finishOnboarding = useApp((s) => s.finishOnboarding)
  const profile = useAuth((s) => s.profile)
  const updateProfile = useAuth((s) => s.updateProfile)
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState<LevelOfStudy>('highschool')
  const [nickname, setNickname] = useState(() => profile?.nickname ?? '')
  const [goal, setGoal] = useState(profile?.dailyGoalCards ?? 10)
  const [buddy, setBuddy] = useState<BuddySpecies>('owl')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = 5

  const persistProfile = async (name: string) => {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        nickname: name,
        language: i18n.language === 'km' ? 'km' : 'en',
        levelOfStudy: level,
        dailyGoalCards: goal,
      })
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('onboarding.saveError'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const next = async () => {
    if (step < total - 1) {
      setStep(step + 1)
      playSound('tap')
      return
    }

    const name = nickname.trim() || profile?.nickname || 'Sokha'
    if (!(await persistProfile(name))) return
    finishOnboarding({ nickname: name, buddy, levelOfStudy: level, dailyGoal: goal, language: i18n.language })
    celebrate()
    navigate('/', { replace: true })
  }

  const skip = async () => {
    const name = nickname.trim() || profile?.nickname || 'Sokha'
    if (!(await persistProfile(name))) return
    finishOnboarding({ nickname: name, buddy, levelOfStudy: level, dailyGoal: goal, language: i18n.language })
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] px-4 py-5 text-[var(--color-text)]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
            <Icon name="sparkles" size={22} />
          </span>
          <span className="text-lg font-black">{t('app.name')}</span>
        </div>
        <button
          onClick={() => void skip()}
          disabled={saving}
          className="min-h-11 rounded-full px-3 text-sm font-bold text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] disabled:opacity-50"
        >
          {t('common.skip')}
        </button>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-5xl items-center gap-1.5" aria-label={t('onboarding.progress')}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)]'
            }`}
          />
        ))}
      </div>

      <div className="mx-auto mt-6 grid w-full max-w-5xl flex-1 items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden flex-col items-center justify-center rounded-[32px] bg-gradient-to-b from-[var(--color-primary-soft)] to-transparent p-8 md:flex">
          <Mascot
            species={buddy}
            mood={step === 4 ? 'sparkle' : 'happy'}
            size={240}
            accessory={step === 4 ? 'hat' : null}
            className="animate-gentle-bounce"
          />
          <p className="mt-4 max-w-xs text-center text-sm font-semibold text-[var(--color-muted)]">{t('onboarding.buddyLine')}</p>
        </div>

        <div className="animate-pop-in rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] sm:p-8">
          {step === 0 && (
            <section>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">{t('onboarding.step', { n: 1 })}</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{t('onboarding.languageTitle')}</h1>
              <p className="mt-2 text-[var(--color-muted)]">{t('onboarding.languageHint')}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => i18n.changeLanguage('en')}
                  aria-pressed={i18n.language === 'en'}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-[22px] border-2 p-4 font-bold transition ${
                    i18n.language === 'en'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  <span className="text-3xl">🇬🇧</span>
                  {t('common.english')}
                </button>
                <button
                  onClick={() => i18n.changeLanguage('km')}
                  aria-pressed={i18n.language === 'km'}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-[22px] border-2 p-4 font-bold transition ${
                    i18n.language === 'km'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  <span className="text-3xl">🇰🇭</span>
                  {t('common.khmer')}
                </button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">{t('onboarding.step', { n: 2 })}</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{t('onboarding.levelTitle')}</h1>
              <p className="mt-2 text-[var(--color-muted)]">{t('onboarding.levelHint')}</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {levels.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setLevel(option.id)}
                    aria-pressed={level === option.id}
                    className={`flex min-h-16 items-center gap-3 rounded-[20px] border-2 p-3 text-left font-bold transition ${
                      level === option.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                    }`}
                  >
                    <Icon name={option.icon} size={22} />
                    <span>{t(`onboarding.levels.${option.id}`)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">{t('onboarding.step', { n: 3 })}</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{t('onboarding.nicknameTitle')}</h1>
              <p className="mt-2 text-[var(--color-muted)]">{t('onboarding.nicknameHint')}</p>
              <label className="mt-6 block text-sm font-bold" htmlFor="nickname">
                {t('onboarding.nicknameLabel')}
              </label>
              <input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 18))}
                placeholder={t('onboarding.nicknamePlaceholder')}
                autoFocus
                className="mt-2 w-full rounded-[18px] px-4 py-3 text-lg font-bold"
              />
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[var(--color-surface-alt)] p-3">
                <Mascot species={buddy} size={52} />
                <p className="text-sm font-semibold text-[var(--color-muted)]">
                  {nickname ? t('onboarding.nicknameEcho', { name: nickname }) : t('onboarding.nicknameEcho', { name: 'Sokha' })}
                </p>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">{t('onboarding.step', { n: 4 })}</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{t('onboarding.goalTitle')}</h1>
              <p className="mt-2 text-[var(--color-muted)]">{t('onboarding.goalHint')}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {goals.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    aria-pressed={goal === g}
                    className={`flex min-h-24 flex-col items-center justify-center rounded-[22px] border-2 p-3 font-bold transition ${
                      goal === g
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                    }`}
                  >
                    <span className="text-3xl font-black">{g}</span>
                    <span className="text-xs text-[var(--color-muted)]">{t('onboarding.cardsPerDay')}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm text-[var(--color-muted)]">{t('onboarding.goalHintSmall')}</p>
            </section>
          )}

          {step === 4 && (
            <section>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">{t('onboarding.step', { n: 5 })}</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{t('onboarding.buddyTitle')}</h1>
              <p className="mt-2 text-[var(--color-muted)]">{t('onboarding.buddyHint')}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {buddies.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBuddy(b)}
                    aria-pressed={buddy === b}
                    className={`flex flex-col items-center gap-1 rounded-[22px] border-2 p-2 font-bold transition ${
                      buddy === b
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                    }`}
                  >
                    <Mascot species={b} mood="happy" size={78} />
                    <span className="text-xs">{t(`onboarding.buddies.${b}`)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-2xl bg-[var(--color-surface-alt)] px-3 py-2 text-sm font-bold text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>
                <Icon name="arrowLeft" size={18} />
                {t('common.back')}
              </Button>
            )}
            <Button full onClick={() => void next()} size="lg" className="ml-auto" disabled={saving}>
              {saving ? t('common.saving') : step === total - 1 ? t('onboarding.finish') : t('common.next')}
              <Icon name="arrowRight" size={19} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
