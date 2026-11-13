import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Modal } from '../../components/Modal'
import { Toast } from '../../components/Toast'
import { ProgressBar } from '../../components/ProgressBar'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import { celebrate } from '../../lib/confetti'

export function DesignPage() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
        <div>
          <h2 className="font-extrabold text-sm text-blue-900 dark:text-blue-200">Stageshow Hero Demo</h2>
          <p className="text-xs text-blue-700 dark:text-blue-300">Interactive flashcard flip & mascot reward mockup.</p>
        </div>
        <Link to="/demo" className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors">
          View Demo ↗
        </Link>
      </div>

      <h1 className="text-2xl font-extrabold">{t('design.title')}</h1>
      <p className="text-[var(--color-muted)]">{t('design.components')}</p>
      <Card title={t('design.buttons')}>
        <div className="flex flex-wrap gap-2">
          <Button>{t('design.primary')}</Button>
          <Button variant="secondary">{t('design.secondary')}</Button>
          <Button variant="ghost">{t('design.ghost')}</Button>
          <Button variant="danger">{t('design.danger')}</Button>
          <Button onClick={celebrate}>{t('design.celebrate')}</Button>
        </div>
      </Card>
      <Card title={t('design.progressBadges')}>
        <div className="space-y-3">
          <ProgressBar value={65} />
          <div className="flex gap-2"><Badge>{t('design.neutral')}</Badge><Badge tone="success">{t('design.success')}</Badge><Badge tone="accent">{t('design.accent')}</Badge></div>
          <Spinner label={t('common.loading')} />
        </div>
      </Card>
      <Card title={t('design.toastModal')}>
        <div className="space-y-2">
          <Toast message={t('design.infoToast')} />
          <Toast kind="success" message={t('design.successToast')} />
          <Toast kind="error" message={t('design.errorToast')} />
          <Button variant="secondary" onClick={() => setOpen(true)}>{t('design.openModal')}</Button>
        </div>
      </Card>
      <Card title={t('design.emptyState')}><EmptyState /></Card>
      <Modal open={open} title={t('design.exampleModal')} onClose={() => setOpen(false)}>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{t('design.modalContent')}</p>
        <Button full onClick={() => setOpen(false)}>{t('common.close')}</Button>
      </Modal>
    </div>
  )
}
