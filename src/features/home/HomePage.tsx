import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GoalRing } from '../../components/GoalRing'
import { Mascot } from '../../components/Mascot'
import { BossArt } from '../../components/BossArt'
import { Icon, type IconName } from '../../components/Icon'
import { ProgressBar } from '../../components/ProgressBar'
import { Badge } from '../../components/Badge'
import { daysUntil, useApp } from '../../lib/store'
import { useDecks } from '../../lib/study'

const questIcons: Record<string, IconName> = {
  warmup: 'bolt',
  focus: 'timer',
  builder: 'layers',
}

export function HomePage() {
  const { t, i18n } = useTranslation()
  const nickname = useApp((s) => s.nickname)
  const buddy = useApp((s) => s.buddy)
  const streak = useApp((s) => s.streak)
  const cardsToday = useApp((s) => s.cardsToday)
  const dailyGoal = useApp((s) => s.dailyGoal)
  const quests = useApp((s) => s.quests)
  const exams = useApp((s) => s.exams)
  const decksQuery = useDecks()

  const due = (decksQuery.data ?? []).reduce((sum, deck) => sum + deck.dueCount, 0)
  const nextExam = [...exams].sort((a, b) => a.date.localeCompare(b.date))[0]
  const examDays = nextExam ? daysUntil(nextExam.date) : 0
  const remaining = Math.max(0, dailyGoal - cardsToday)
  const [today] = useState(() =>
    new Intl.DateTimeFormat(i18n.language === 'km' ? 'km-KH' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(new Date()),
  )

  return (
    <div className="space-y-4">
      {/* Hero Banner: Today's Goal & Main Action */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-5 text-white shadow-[var(--shadow-lift)] sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 left-16 h-40 w-40 rounded-full bg-amber-300/15" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{today}</p>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                {t('home.dailyCadence')}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-4xl">
              {t('home.greeting', { name: nickname })}
            </h1>
            <p className="mt-1 max-w-sm text-sm text-white/80 sm:text-base">
              {remaining > 0 ? t('home.sublineLeft', { count: remaining }) : t('home.sublineDone')}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold ring-1 ring-white/20">
              <Icon name="flame" size={17} className="text-amber-300" />
              {t('home.streakChip', { count: streak })}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <GoalRing value={cardsToday} max={dailyGoal} size={112} stroke={10} tone="accent" label={t('home.todayGoal')}>
              <span className="text-2xl font-black leading-none">{cardsToday}</span>
              <span className="text-[11px] font-bold text-white/70">/ {dailyGoal}</span>
            </GoalRing>
            <div className="-mt-2">
              <Mascot species={buddy} mood={remaining === 0 ? 'sparkle' : 'happy'} size={64} />
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
          <Mascot species={buddy} mood="happy" size={44} />
          <p className="text-sm font-semibold text-white/90">{t('home.buddyLine')}</p>
        </div>

        <Link
          to="/study/review"
          className="relative mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-lg font-black text-[#0f172a] shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.99]"
        >
          <Icon name="play" size={22} className="text-[#2563eb]" />
          <span className="text-[#0f172a] font-black">{t('home.startStudying')}</span>
          <span className="rounded-full bg-[#eff6ff] text-[#1e40af] px-2.5 py-1 text-xs font-black">
            {t('home.cardsDue', { count: due })}
          </span>
        </Link>
      </section>

      {/* Operational 2-Column Grid: Daily Quests & Upcoming Exam Boss */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Section 1: Daily Quests */}
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold">{t('home.quests')}</h2>
              <Badge tone="primary" className="text-[10px] font-black uppercase tracking-wider">
                {t('home.dailyCadence')}
              </Badge>
            </div>
            <Link to="/study" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
              {t('common.seeAll')} <Icon name="chevronRight" size={14} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {quests.map((quest) => (
              <div key={quest.id} className="rounded-2xl bg-[var(--color-surface-alt)]/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]">
                    <Icon name={questIcons[quest.id] ?? 'bolt'} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-extrabold">{t(`quests.${quest.id}`)}</p>
                      {quest.completed ? (
                        <Badge tone="success">
                          <Icon name="check" size={12} /> {t('common.done')}
                        </Badge>
                      ) : (
                        <span className="shrink-0 text-[11px] font-bold text-[var(--color-muted)]">
                          {quest.progress}/{quest.target}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar value={quest.progress} max={quest.target} size="sm" tone={quest.completed ? 'success' : 'primary'} />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 pl-11 text-[11px] font-bold text-[var(--color-muted)]">
                  <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                    <Icon name="bolt" size={12} /> +{quest.rewardXp} XP
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                    <Icon name="coin" size={12} /> +{quest.rewardCoins}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Next Exam Milestone (Upcoming Event Cadence) */}
        {nextExam && (
          <section className="relative overflow-hidden rounded-[24px] bg-[var(--color-navy)] p-5 text-white shadow-[var(--shadow-md)]">
            <div className="pointer-events-none absolute -right-6 -top-8 h-36 w-36 rounded-full bg-blue-500/20 blur-xl" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">{t('home.examBoss')}</p>
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                    {t('home.upcomingCadence')}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-black leading-snug">{nextExam.title}</h2>
                <p className="mt-1 text-sm text-white/70">{nextExam.subject}</p>
              </div>
              <BossArt size={104} />
            </div>
            <div className="relative mt-2 flex items-end gap-2">
              <span className="text-5xl font-black text-amber-300">{examDays}</span>
              <span className="pb-1.5 text-sm font-bold text-white/80">{t('home.daysLeft')}</span>
            </div>
            <p className="relative mt-1 text-xs text-white/60">{t('home.examHint')}</p>
            <Link
              to="/study/boss"
              className="relative mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 font-bold ring-1 ring-white/25 transition hover:bg-white/25"
            >
              <Icon name="sword" size={18} /> {t('home.prepareBoss')}
            </Link>
          </section>
        )}
      </div>

      {/* Section 3: Weekly Retrospective Cadence */}
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="chart" size={18} className="text-[var(--color-primary)]" />
            <h2 className="text-base font-extrabold">{t('home.weeklySummary')}</h2>
            <Badge tone="neutral" className="text-[10px] font-black uppercase tracking-wider">
              {t('home.weeklyCadence')}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[var(--color-primary-soft)] p-3 text-center">
            <p className="text-xl font-black text-[var(--color-primary)]">48</p>
            <p className="text-[11px] font-bold text-[var(--color-muted)]">{t('home.weekCards')}</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-success-soft)] p-3 text-center">
            <p className="text-xl font-black text-[var(--color-success)]">3.5h</p>
            <p className="text-[11px] font-bold text-[var(--color-muted)]">{t('home.weekTime')}</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-accent-soft)] p-3 text-center">
            <p className="text-xl font-black text-[var(--color-accent)]">92%</p>
            <p className="text-[11px] font-bold text-[var(--color-muted)]">{t('home.weekAccuracy')}</p>
          </div>
        </div>
        <Link to="/stats" className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
          {t('home.seeStats')} <Icon name="arrowRight" size={13} />
        </Link>
      </section>
    </div>
  )
}
