import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { Toast } from '../../components/Toast'
import { getHealth, API_URL } from '../../lib/api'
import { Button } from '../../components/Button'

export function HomePage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: ['health'], queryFn: getHealth, retry: 0 })
  const ok = q.data?.status === 'ok'
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 p-5 text-white shadow-[var(--shadow-md)]">
        <h1 className="text-2xl font-extrabold">{t('home.welcome')}</h1>
        <p className="mt-1 opacity-90">{t('app.tagline')}</p>
      </div>
      <Card title={t('home.health')}>
        {q.isLoading && <Spinner label={t('common.loading')} />}
        {q.isError && (
          <div className="space-y-2">
            <Toast kind="error" message={`${t('home.unhealthy')}. ${t('home.healthHelp', { url: API_URL })}`} />
            <Button variant="secondary" onClick={() => q.refetch()}>{t('common.retry')}</Button>
          </div>
        )}
        {q.isSuccess && <Toast kind={ok ? 'success' : 'error'} message={ok ? `${t('home.healthy')} (${q.data.status})` : t('home.unhealthy')} />}
      </Card>
    </div>
  )
}
