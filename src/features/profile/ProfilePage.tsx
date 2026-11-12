import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../components/EmptyState'
export function ProfilePage() {
  const { t } = useTranslation()
  return <EmptyState title={t('nav.profile')} hint="Profile and progress will appear after authentication and game steps." />
}
