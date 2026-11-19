import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { sessionApi } from '../../lib/api/quiz'
import { useAuth } from '../../lib/auth'
import { useRoomUpdates } from '../../lib/websocket'
import { LiveRoomError, LiveRoomLayout } from './LiveRoomLayout'

function RoomInvite({ roomCode }: { roomCode: string }) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/quiz/lobby/${roomCode}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      input.current?.focus()
      input.current?.select()
    }
  }

  return <section className="study-panel space-y-3">
    <h2 className="text-lg font-bold">{t('quizRoom.shareTitle')}</h2>
    <p className="text-sm text-[var(--color-muted)]">{t('quizRoom.shareSubtitle')}</p>
    <div className="flex flex-wrap items-center gap-4">
      <QRCodeSVG value={link} size={128} marginSize={4} role="img" aria-label={t('quizRoom.scanQR')} className="rounded-xl bg-white" />
      <div className="min-w-0 flex-1 space-y-2">
        <label className="block space-y-1 text-sm font-bold">
          <span>{t('quizRoom.roomLink')}</span>
          <input ref={input} readOnly value={link} className="w-full rounded-xl px-3 py-2 text-sm font-normal" />
        </label>
        <Button variant="secondary" onClick={() => void copyLink()}>{t('quizRoom.copyLink')}</Button>
        {copied && <p className="text-sm" role="status">{t('quizRoom.linkCopied')}</p>}
      </div>
    </div>
  </section>
}

export function LobbyPage() {
  const { t } = useTranslation()
  const { code = '' } = useParams()
  const [params] = useSearchParams()
  const roomCode = code.toUpperCase()
  const navigate = useNavigate()
  const accountId = useAuth((state) => state.user?.id)
  const profileName = useAuth((state) => state.profile?.nickname)
  const [nickname, setNickname] = useState(() => (params.get('nickname') ?? profileName ?? '').slice(0, 50))
  const room = useQuery({
    queryKey: ['live-room', accountId, roomCode],
    queryFn: () => sessionApi.getRoom(roomCode),
    enabled: /^[A-Z0-9]{6}$/.test(roomCode),
    retry: false,
    refetchInterval: (query) => query.state.data?.session.status === 'WAITING' ? 5_000 : false,
  })
  const data = room.data
  const session = data?.session
  const member = data?.players.find((player) => player.userId === accountId)
  const host = !!accountId && session?.hostId === accountId

  useRoomUpdates(member && session?.status === 'WAITING' ? roomCode : undefined, room.refetch)

  useEffect(() => {
    if (!member || !session) return
    if (session.status === 'ACTIVE') void navigate(`/quiz/play/${session.id}`, { replace: true })
    if (session.status === 'ENDED') void navigate(`/quiz/results/${session.id}`, { replace: true })
  }, [member, session, navigate])

  const join = useMutation({
    mutationFn: (id: string) => sessionApi.joinSession(id, { roomCode, nickname: nickname.trim() }),
    onSuccess: () => room.refetch(),
  })
  const start = useMutation({ mutationFn: sessionApi.startSession, onSuccess: () => room.refetch() })

  return <LiveRoomLayout title={data?.title ?? t('quizRoom.lobby')}>
    {!data && (room.isFetching ? <p role="status">{t('common.loading')}</p> : <div className="space-y-3">
      {room.isError ? <LiveRoomError error={room.error} /> : <p role="alert">{t('quizRoom.roomMissing')}</p>}
      <Link className="study-text-link" to="/quiz/join">{t('quizRoom.title')}</Link>
    </div>)}
    {data && <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-xl bg-[var(--color-primary-soft)] px-3 py-2 font-mono text-lg font-bold tracking-wider text-[var(--color-primary)]">
          {t('quizRoom.roomCode', { code: roomCode })}
        </span>
        <p className="text-sm text-[var(--color-muted)]">{t('quizRoom.roomSettings', { count: data.questionCount, seconds: data.timePerQuestion })}</p>
      </div>
      <section className="study-panel space-y-3">
        <h2 className="text-lg font-bold">{t('quizRoom.players', { count: data.players.length })}</h2>
        <ul className="divide-y divide-[var(--color-border)]">
          {data.players.map((player) => <li key={player.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{player.nickname}
              {member?.id === player.id && <span className="ml-2 text-sm text-[var(--color-muted)]">{t('quizRoom.you')}</span>}
            </span>
            {player.isHost && <span className="text-sm font-bold text-[var(--color-primary)]">{t('quizRoom.host')}</span>}
          </li>)}
        </ul>
        {data.session.status === 'WAITING' && (host ? <>
          <LiveRoomError error={start.error} />
          <Button disabled={!data.questionCount || start.isPending} onClick={() => start.mutate(data.session.id)}>
            {t(start.isPending ? 'quizRoom.starting' : 'quizRoom.start')}
          </Button>
        </> : member ? <p role="status" className="text-sm text-[var(--color-muted)]">{t('quizRoom.waiting')}</p> : <form className="space-y-3"
          onSubmit={(event) => { event.preventDefault(); join.mutate(data.session.id) }}>
          <label className="block space-y-1 font-bold">
            <span>{t('quizRoom.nicknameLabel')}</span>
            <input type="text" required maxLength={50} value={nickname} disabled={join.isPending}
              onChange={(event) => setNickname(event.target.value)} className="w-full rounded-xl px-3 py-2" />
          </label>
          <LiveRoomError error={join.error} />
          <Button type="submit" disabled={!nickname.trim() || join.isPending}>{t(join.isPending ? 'quizRoom.joining' : 'quizRoom.joinButton')}</Button>
        </form>)}
        {data.session.status !== 'WAITING' && !member && <p role="alert">{t('quizRoom.roomClosed')}</p>}
      </section>
      {host && data.session.status === 'WAITING' && <RoomInvite roomCode={roomCode} />}
    </>}
  </LiveRoomLayout>
}
