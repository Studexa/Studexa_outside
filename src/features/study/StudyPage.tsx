import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../components/EmptyState'
export function StudyPage() {
  const { t } = useTranslation()
  return <EmptyState title={t('nav.study')} hint="Subjects, decks and reviews will appear here in upcoming steps." />
}
