import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { LanguageSelector } from '../../components/LanguageSelector'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/Icon'
import { ApiError } from '../../lib/api/client'
import './liveRoom.css'

export function LiveRoomLayout({ title, back = '/quiz', children }: PropsWithChildren<{ title: string; back?: string }>) {
  const { t } = useTranslation()
  return <main className="live-room-sheet min-h-dvh px-4 py-5 text-[var(--color-text)] sm:px-6 sm:py-8">
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={back} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--color-primary)]">
          <Icon name="arrowLeft" size={17} />{t('common.back')}
        </Link>
        <LanguageSelector />
      </div>
      <h1 className="text-3xl font-black [overflow-wrap:anywhere]">{title}</h1>
      {children}
    </div>
  </main>
}

const errorKeys: Record<string, string> = {
  NOT_FOUND: 'roomMissing',
  ROOM_CLOSED: 'roomClosed',
  NICKNAME_TAKEN: 'nicknameTaken',
  QUESTION_IN_PROGRESS: 'questionInProgress',
  QUESTION_NOT_ACTIVE: 'questionChanged',
  ANSWER_TIME_EXPIRED: 'timeUp',
}

export function LiveRoomError({ error }: { error: unknown }) {
  const { t } = useTranslation()
  if (!error) return null
  const key = error instanceof ApiError ? errorKeys[error.code] : undefined
  return <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm font-semibold text-[var(--color-danger-text)]">
    {t(`quizRoom.${key ?? 'requestFailed'}`)}
  </p>
}
