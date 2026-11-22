import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import i18n from '../lib/i18n'
import { Button } from './Button'
import { Icon } from './Icon'

type Props = { children: ReactNode }
type State = { hasError: boolean; error?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] p-6">
          <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 max-w-lg text-center shadow-[var(--shadow-lg)]">
            <Icon name="xCircle" size={48} className="mb-4 text-[var(--color-danger-text)]" />
            <h2 className="text-2xl font-black mb-2">{i18n.t('error.title')}</h2>
            <p className="text-sm text-[var(--color-muted)] mb-6">{i18n.t('error.message')}</p>
            <Button onClick={() => window.location.reload()} full>
              {i18n.t('common.refresh')}
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}