import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'

const configuredUrl = import.meta.env.VITE_TELEGRAM_URL?.trim()
const telegramUrl = /^https:\/\/t\.me\/(?:[A-Za-z][A-Za-z0-9_]*|(?:\+|joinchat\/)[A-Za-z0-9_-]+)\/?$/.test(configuredUrl ?? '')
  ? configuredUrl
  : undefined

export function TelegramLink({ footer = false }: { footer?: boolean }) {
  const { t } = useTranslation()
  if (!telegramUrl) return null

  return (
    <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={footer ? 'study-text-link' : 'study-nav-link'}>
      <Icon name="send" size={18} />
      <span>{t(footer ? 'workspace.joinTelegram' : 'workspace.telegram')}</span>
    </a>
  )
}
