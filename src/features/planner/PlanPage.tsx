import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { Badge } from '../../components/Badge'
import { ProgressBar } from '../../components/ProgressBar'
import { daysUntil, todayISO, useApp, type Importance } from '../../lib/store'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useDueCards, useGameState } from '../../lib/study'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const importanceTone: Record<Importance, 'danger' | 'accent' | 'primary'> = {
  high: 'danger',
  medium: 'accent',
  low: 'primary',
}

export function PlanPage() {
  const { t, i18n } = useTranslation()
  const { profile, updateProfile } = useAuth()
  const exams = useApp((s) => s.exams)
  const tasks = useApp((s) => s.tasks)
  const toggleTask = useApp((s) => s.toggleTask)
  const addTask = useApp((s) => s.addTask)
  const addExam = useApp((s) => s.addExam)
  const loadExams = useApp((s) => s.loadExams)
  const loadTasks = useApp((s) => s.loadTasks)
  const dailyGoal = useApp((s) => s.dailyGoal)

  const cardsDueQuery = useDueCards()
  const gameQuery = useGameState(!isGuestMode())

  const cardsDue = cardsDueQuery.data ?? []
  const gameState = gameQuery.data
  const streak = gameState?.streakCurrent ?? 0

  useEffect(() => {
    loadExams()
    loadTasks(todayISO())
  }, [loadExams, loadTasks])

  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [examOpen, setExamOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [entryError, setEntryError] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [examSubject, setExamSubject] = useState('')
  const [examDate, setExamDate] = useState(todayISO())
  const [importance, setImportance] = useState<Importance>('high')
  const [goalCards, setGoalCards] = useState(profile?.dailyGoalCards ?? dailyGoal)
  const [goalMinutes, setGoalMinutes] = useState(profile?.dailyGoalMinutes ?? 30)

  const today = todayISO()
  const todaysTasks = tasks.filter((task) => task.date === today)
  const doneToday = todaysTasks.filter((task) => task.done).length
  const examDates = useMemo(() => new Set(exams.map((exam) => exam.date)), [exams])

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return date
    })
  }, [cursor])

  const locale = i18n.language === 'km' ? 'km-KH' : 'en-US'
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor)
  const sortExams = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  const createTask = async () => {
    if (!taskTitle.trim()) return
    setSavingEntry(true)
    setEntryError(false)
    try {
      await addTask(taskTitle.trim(), today)
      setTaskTitle('')
      setTaskOpen(false)
    } catch {
      setEntryError(true)
    } finally {
      setSavingEntry(false)
    }
  }

  const createExam = async () => {
    if (!examTitle.trim() || !examDate) return
    setSavingEntry(true)
    setEntryError(false)
    try {
      await addExam({
        title: examTitle.trim(),
        subject: examSubject.trim() || examTitle.trim(),
        date: examDate,
        importance,
      })
      setExamTitle('')
      setExamSubject('')
      setExamOpen(false)
    } catch {
      setEntryError(true)
    } finally {
      setSavingEntry(false)
    }
  }

  const saveGoals = async () => {
    const cards = Math.max(1, Math.min(500, goalCards))
    const minutes = Math.max(1, Math.min(600, goalMinutes))
    setGoalCards(cards)
    setGoalMinutes(minutes)
    try {
      await updateProfile({ dailyGoalCards: cards, dailyGoalMinutes: minutes })
    } catch {
      // updateProfile already falls back to local state on error
    }
    setGoalOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t('plan.title')}</h1>
          <p className="text-sm text-[var(--color-muted)]">{t('plan.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTaskOpen(true)}>
            <Icon name="plus" size={17} /> {t('plan.addTask')}
          </Button>
          <Button onClick={() => setExamOpen(true)}>
            <Icon name="calendar" size={17} /> {t('plan.addExam')}
          </Button>
          <Button variant="ghost" onClick={() => setGoalOpen(true)}>
            <Icon name="target" size={17} /> {t('plan.setGoals')}
          </Button>
        </div>
      </div>

      {/* Daily goals set by the user */}
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t('plan.dailyGoals')}</h2>
          <Button size="sm" onClick={() => setGoalOpen(true)}>
            {t('plan.edit')}
          </Button>
        </div>
        <p className="text-xs font-semibold text-[var(--color-muted)] mb-3">
          {t('plan.goalsSetByYou')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--color-surface-alt)]/60 p-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
              {t('plan.cardsPerDay')}
            </p>
            <p className="text-2xl font-black">{goalCards}</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface-alt)]/60 p-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
              {t('plan.minutesPerDay')}
            </p>
            <p className="text-2xl font-black">{goalMinutes}</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={Math.min(cardsDue.length, goalCards)}
            max={goalCards}
            size="sm"
            tone="primary"
          />
          <div className="mt-1 flex justify-between text-[10px] font-bold text-[var(--color-muted)]">
            <span>{cardsDue.length} {t('plan.cardsDueToday')}</span>
            <span>{t('plan.ofGoal', { count: goalCards })}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]"
              aria-label={t('plan.prevMonth')}
            >
              <Icon name="chevronLeft" size={19} />
            </button>
            <p className="font-extrabold capitalize">{monthLabel}</p>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]"
              aria-label={t('plan.nextMonth')}
            >
              <Icon name="chevronRight" size={19} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => (
              <span key={d} className="pb-1 text-[10px] font-black uppercase tracking-wide text-[var(--color-muted)]">
                {t(`plan.weekdays.${d}`)}
              </span>
            ))}
            {cells.map((date) => {
              const key = dateKey(date)
              const inMonth = date.getMonth() === cursor.getMonth()
              const isToday = key === today
              const hasExam = examDates.has(key)
              return (
                <div
                  key={key}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-bold ${
                    isToday
                      ? 'bg-[var(--color-primary)] text-white'
                      : inMonth
                        ? 'text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                        : 'text-[var(--color-muted)]/40'
                  }`}
                >
                  <span>{date.getDate()}</span>
                  {hasExam && (
                    <span
                      className={`absolute bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                        isToday ? 'bg-white text-[var(--color-primary)]' : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                      }`}
                    >
                      <Icon name="sword" size={9} />
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
                <Icon name="sword" size={9} />
              </span>
              {t('plan.examDay')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-[var(--color-primary)]" /> {t('plan.today')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
                <Icon name="flame" size={9} />
              </span>
              {t('plan.streak', { count: streak })}
            </span>
          </div>
        </section>

        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{t('plan.todayPlan')}</h2>
            <Badge tone="primary">
              {doneToday}/{todaysTasks.length}
            </Badge>
          </div>
          <div className="mt-1">
            <ProgressBar value={doneToday} max={todaysTasks.length || 1} size="sm" tone="success" />
          </div>
          <div className="mt-3 space-y-2">
            {todaysTasks.length === 0 && <p className="text-sm text-[var(--color-muted)]">{t('plan.noTasks')}</p>}
            {todaysTasks.map((task) => (
              <label
                key={task.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-[var(--color-surface-alt)]/60 px-3 py-2 transition hover:bg-[var(--color-surface-alt)]"
              >
                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} className="sr-only" />
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    task.done
                      ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  }`}
                >
                  {task.done && <Icon name="check" size={13} />}
                </span>
                <span className={`text-sm font-bold ${task.done ? 'text-[var(--color-muted)] line-through' : ''}`}>
                  {task.title}
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t('plan.upcomingExams')}</h2>
          <Link to="/study/boss" className="text-xs font-bold text-[var(--color-primary)]">
            {t('plan.bossBattles')}
          </Link>
        </div>
        <div className="space-y-3">
          {sortExams.length === 0 && (
            <p className="text-sm text-[var(--color-muted)] text-center py-4">
              {t('plan.noExams')}
            </p>
          )}
          {sortExams.map((exam) => {
            const days = daysUntil(exam.date)
            const progress = Math.min(100, Math.max(8, 100 - days * 3))
            const milestones = [t('plan.milestones.start'), t('plan.milestones.review'), t('plan.milestones.practice'), t('plan.milestones.exam')]
            const reached = Math.round((progress / 100) * milestones.length)
            return (
              <div key={exam.id} className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold">{exam.title}</h3>
                      <Badge tone={importanceTone[exam.importance]}>{t(`plan.importance.${exam.importance}`)}</Badge>
                    </div>
                    <p className="text-xs font-semibold text-[var(--color-muted)]">
                      {exam.subject} · {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(`${exam.date}T12:00:00`))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[var(--color-primary)]">{days}</p>
                    <p className="text-[10px] font-bold text-[var(--color-muted)]">{t('home.daysLeft')}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={progress} max={100} size="sm" />
                  <div className="mt-2 flex items-center justify-between">
                    {milestones.map((milestone, i) => (
                      <span key={milestone} className="flex flex-1 flex-col items-center gap-1">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                            i < reached
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
                          }`}
                        >
                          {i < reached ? <Icon name="check" size={10} /> : i + 1}
                        </span>
                        <span className="text-[9px] font-bold text-[var(--color-muted)]">{milestone}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <Link to="/study/boss" className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-primary)]">
                  <Icon name="sword" size={16} /> {t('home.prepareBoss')}
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      <Modal open={taskOpen} title={t('plan.addTask')} onClose={() => { setTaskOpen(false); setEntryError(false) }}>
        <label className="text-sm font-bold" htmlFor="task-title">{t('plan.taskTitle')}</label>
        <input
          id="task-title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder={t('plan.taskPlaceholder')}
          className="mt-1 w-full rounded-2xl px-4 py-2.5"
          autoFocus
        />
        {entryError && <p role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{t('plan.saveError')}</p>}
        <Button full className="mt-3" onClick={createTask} disabled={!taskTitle.trim() || savingEntry}>
          {t('plan.addTask')}
        </Button>
      </Modal>

      <Modal open={examOpen} title={t('plan.addExam')} onClose={() => { setExamOpen(false); setEntryError(false) }}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold" htmlFor="exam-title">{t('plan.examTitle')}</label>
            <input
              id="exam-title"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder={t('plan.examPlaceholder')}
              className="mt-1 w-full rounded-2xl px-4 py-2.5"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="exam-subject">{t('plan.subject')}</label>
            <input
              id="exam-subject"
              value={examSubject}
              onChange={(e) => setExamSubject(e.target.value)}
              placeholder={t('plan.subjectPlaceholder')}
              className="mt-1 w-full rounded-2xl px-2.5"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="exam-date">{t('plan.date')}</label>
            <input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-1 w-full rounded-2xl px-2.5"
            />
          </div>
          <div>
            <p className="text-sm font-bold">{t('plan.importanceLabel')}</p>
            <div className="mt-1 flex gap-2">
              {(['low', 'medium', 'high'] as Importance[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setImportance(level)}
                  aria-pressed={importance === level}
                  className={`min-h-10 flex-1 rounded-xl border-2 px-2 text-xs font-bold ${
                    importance === level
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {t(`plan.importance.${level}`)}
                </button>
              ))}
            </div>
          </div>
          {entryError && <p role="alert" className="text-sm text-[var(--color-danger)]">{t('plan.saveError')}</p>}
          <Button full onClick={createExam} disabled={!examTitle.trim() || !examDate || savingEntry}>
            {t('plan.addExam')}
          </Button>
        </div>
      </Modal>

      <Modal open={goalOpen} title={t('plan.dailyGoals')} onClose={() => setGoalOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            {t('plan.goalsDescription')}
          </p>
          <div>
            <label className="text-sm font-bold" htmlFor="goal-cards">{t('plan.cardsPerDay')}</label>
            <input
              id="goal-cards"
              type="number"
              min="1"
              max="500"
              value={goalCards}
              onChange={(e) => setGoalCards(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-2xl px-4 py-2.5"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="goal-minutes">{t('plan.minutesPerDay')}</label>
            <input
              id="goal-minutes"
              type="number"
              min="1"
              max="600"
              value={goalMinutes}
              onChange={(e) => setGoalMinutes(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-2xl px-4 py-2.5"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGoalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveGoals}>{t('plan.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
