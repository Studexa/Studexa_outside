import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../components/EmptyState'
export function PlanPage() {
  const { t } = useTranslation()
  return <EmptyState title={t('nav.plan')} hint="Planner and exam countdown are coming in Step 14." />
}
