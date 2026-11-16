import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
import { countPendingAnswers, offlineDb } from '../lib/offlineDb'
import { useAuth } from '../lib/auth'

export function SyncIndicator() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(async () => {
      const n = await countPendingAnswers(user.id)
      setPending(n)
    }, 5000)
    void (async () => {
      const n = await countPendingAnswers(user.id)
      setPending(n)
    })()
    return () => clearInterval(interval)
  }, [user?.id])

  if (!user || pending === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] border border-[var(--color-accent)] px-3 py-1.5 text-xs font-black text-[var(--color-accent-text)] shadow-[var(--shadow-md)] animate-pulse">
      <Icon name="cloud" size={12} />
      {t('shell.offlineQueued', { count: pending })}
    </div>
  )