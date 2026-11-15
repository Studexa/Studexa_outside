import { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../../components/Button'
import { useTranslation } from 'react-i18next'

export function JoinRoomPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState(
    searchParams.get('nickname') ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Build the join link (relative to current origin)
  const joinLink = useMemo(() => {
    const code = roomCode.toUpperCase()
    const nick = encodeURIComponent(nickname)
    return `${window.location.origin}/quiz/lobby/${code}${
      nick ? `?nickname=${nick}` : ''
    }`
  }, [roomCode, nickname])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCopied(false)
    if (!roomCode || !nickname) {
      setError(t('quizRoom.roomCodeLabel') + ' and ' + t('quizRoom.nicknameLabel') + ' are required.')
      return
    }
    navigate(`/quiz/lobby/${roomCode.toUpperCase()}?nickname=${encodeURIComponent(nickname)}`)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available (e.g. insecure context); fall back to selecting text
      // The input below remains selectable so users can copy manually.
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="mb-6 inline-block text-[var(--primary)] hover:underline">
          ← {t('common.back')}
        </Link>
        <h1 className="text-2xl font-bold mb-2">{t('quizRoom.title')}</h1>
        <p className="text-[var(--text-muted)] mb-8">{t('quizRoom.subtitle')}</p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Join form */}
          <div className="space-y-5">
            <form onSubmit={handleJoin} className="space-y-4 p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text)]">
                  {t('quizRoom.roomCodeLabel')}
                </label>
                <input
                  name="roomCode"
                  type="text"
                  maxLength={6}
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder={t('quizRoom.roomCodePlaceholder')}
                  className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-center text-xl font-mono tracking-wider"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text)]">
                  {t('quizRoom.nicknameLabel')}
                </label>
                <input
                  name="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('quizRoom.nicknamePlaceholder')}
                  className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              {error && (
                <div className="text-sm text-[var(--danger-text)] bg-[var(--danger-fill)]/10 p-3 rounded">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full py-3 text-lg">
                {t('quizRoom.joinButton')}
              </Button>
            </form>

            <p className="text-center text-sm text-[var(--text-muted)] mt-2">
              {t('common.or')}{' '}
              <span className="font-medium cursor-pointer text-[var(--primary)] hover:underline">
                {t('quizRoom.scanQR')}
              </span>
            </p>
          </div>

          {/* QR code + share link */}
          <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <QRCodeSVG
                value={joinLink || window.location.origin + '/quiz/join'}
                size={180}
                level="M"
                style={{ background: 'var(--bg)' }}
                includeMargin
              />
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
                {t('quizRoom.scanQR')}
              </p>
            </div>

            <div className="w-full flex gap-2">
              <input
                type="text"
                readOnly
                value={joinLink}
                className="flex-1 px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-sm font-mono break-all text-[var(--text)]"
              />
              <Button
                onClick={handleCopyLink}
                className="px-4 py-2 text-sm"
              >
                {copied ? t('quizRoom.linkCopied') : t('quizRoom.copyLink')}
              </Button>
            </div>
            <p className="text-[var(--text-muted)] text-xs">
              {t('quizRoom.roomLink')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
