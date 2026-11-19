import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { sessionApi } from '../../lib/api/quiz'
import { useAuth } from '../../lib/auth'
import { LiveRoomError, LiveRoomLayout } from './LiveRoomLayout'

const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

export function JoinRoomPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const profileName = useAuth((state) => state.profile?.nickname)
  const accountId = useAuth((state) => state.user?.id)
  const [code, setCode] = useState(() => normalizeCode(params.get('code') ?? ''))
  const [nickname, setNickname] = useState(() => (profileName ?? '').slice(0, 50))

  const join = useMutation({
    mutationFn: async () => {
      const room = await sessionApi.getRoom(code)
      if (useAuth.getState().user?.id !== accountId) throw new Error('Session changed')
      if (!room.players.some((player) => player.userId === accountId)) {
        await sessionApi.joinSession(room.session.id, { roomCode: code, nickname: nickname.trim() })
      }
      return room.session.roomCode
    },
    onSuccess: (roomCode) => navigate(`/quiz/lobby/${roomCode}`, { replace: true }),
  })

  return <LiveRoomLayout title={t('quizRoom.title')}>
    <p className="text-[var(--color-muted)]">{t('quizRoom.subtitle')}</p>
    <form className="study-panel max-w-md space-y-4" onSubmit={(event) => { event.preventDefault(); join.mutate() }}>
      <label className="block space-y-1 font-bold">
        <span>{t('quizRoom.roomCodeLabel')}</span>
        <input name="roomCode" type="text" required autoCapitalize="characters" spellCheck={false}
          disabled={join.isPending} value={code} onChange={(event) => setCode(normalizeCode(event.target.value))}
          placeholder={t('quizRoom.roomCodePlaceholder')} className="w-full rounded-xl px-3 py-2 font-mono tracking-wider" />
      </label>
      <label className="block space-y-1 font-bold">
        <span>{t('quizRoom.nicknameLabel')}</span>
        <input name="nickname" type="text" required maxLength={50} disabled={join.isPending}
          value={nickname} onChange={(event) => setNickname(event.target.value)}
          placeholder={t('quizRoom.nicknamePlaceholder')} className="w-full rounded-xl px-3 py-2" />
      </label>
      <LiveRoomError error={join.error} />
      <Button full type="submit" disabled={code.length !== 6 || !nickname.trim() || join.isPending}>
        {t(join.isPending ? 'quizRoom.joining' : 'quizRoom.joinButton')}
      </Button>
    </form>
  </LiveRoomLayout>
}
