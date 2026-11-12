import { useState } from 'react'
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
      <h1 className="text-2xl font-extrabold">{t('design.title')}</h1>
      <p className="text-[var(--color-muted)]">{t('design.components')}</p>
      <Card title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button onClick={celebrate}>Celebrate</Button>
        </div>
      </Card>
      <Card title="Progress / Badge / Spinner">
        <div className="space-y-3">
          <ProgressBar value={65} />
          <div className="flex gap-2"><Badge>Neutral</Badge><Badge tone="success">Success</Badge><Badge tone="accent">Accent</Badge></div>
          <Spinner label={t('common.loading')} />
        </div>
      </Card>
      <Card title="Toast / Modal">
        <div className="space-y-2">
          <Toast message="Info toast" />
          <Toast kind="success" message="Success toast" />
          <Toast kind="error" message="Error toast" />
          <Button variant="secondary" onClick={() => setOpen(true)}>Open modal</Button>
        </div>
      </Card>
      <Card title="Empty state"><EmptyState /></Card>
      <Modal open={open} title="Example modal" onClose={() => setOpen(false)}>
        <p className="mb-3 text-sm text-[var(--color-muted)]">Modal content works with keyboard Escape and tap outside.</p>
        <Button full onClick={() => setOpen(false)}>{t('common.close')}</Button>
      </Modal>
    </div>
  )
}
