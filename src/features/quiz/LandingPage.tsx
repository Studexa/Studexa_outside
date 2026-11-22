import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/Icon'
import { LiveRoomLayout } from './LiveRoomLayout'

export function LandingPage() {
  const { t } = useTranslation()
  return <LiveRoomLayout title={t('quizRoom.liveRooms')} back="/study">
    <p className="text-[var(--color-muted)]">{t('quizRoom.liveHint')}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Link className="study-panel live-room-entry pressable flex items-center gap-3 p-4 font-bold" to="/quiz/create">
        <Icon name="plus" className="text-[var(--color-primary)]" />{t('quizRoom.createRoom')}
      </Link>
      <Link className="study-panel live-room-entry pressable flex items-center gap-3 p-4 font-bold" to="/quiz/join">
        <Icon name="users" className="text-[var(--color-primary)]" />{t('quizRoom.joinButton')}
      </Link>
    </div>
  </LiveRoomLayout>
}
