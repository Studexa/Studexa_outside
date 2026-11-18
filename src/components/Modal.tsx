import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Icon } from './Icon'

export function Modal({ open, title, onClose, children }: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    if (!element || !open) return
    const previousFocus = document.activeElement as HTMLElement | null
    element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])
  return (
    <dialog ref={dialog} aria-labelledby={titleId} className="app-dialog"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      {open && <>
        <div className="app-dialog-header">
          <h3 id={titleId} className="text-xl font-semibold [overflow-wrap:anywhere]">{title}</h3>
          <Button className="shrink-0" variant="ghost" onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={18} /></Button>
        </div>
        <div className="app-dialog-body">{children}</div>
      </>}
    </dialog>
  )
}
