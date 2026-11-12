import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../components/EmptyState'
export function NotesPage() {
  const { t } = useTranslation()
  return <EmptyState title={t('nav.notes')} hint="Notes editor is coming in Step 12." />
}
