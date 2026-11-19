import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { ApiError, noteAttachmentsApi, type NoteAttachment } from '../../lib/api'
import { useAuth } from '../../lib/auth'

const maxFileBytes = 5 * 1024 * 1024
const fileErrorKeys: Record<string, string> = {
  EMPTY_FILE: 'emptyFile',
  FILE_TOO_LARGE: 'fileTooLarge',
  UNSUPPORTED_FILE: 'unsupportedFile',
  INVALID_FILE: 'invalidFile',
  NOTE_FILE_LIMIT: 'noteFileLimit',
  ACCOUNT_FILE_LIMIT: 'accountFileLimit',
}

type Props = PropsWithChildren<{
  noteId: string
  userId: string
  onStudy?: (attachment: NoteAttachment) => void
}>

export function NoteAttachments({ noteId, userId, onStudy, children }: Props) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const key = ['note-attachments', userId, noteId] as const
  const attachments = useQuery({ queryKey: key, queryFn: () => noteAttachmentsApi.list(noteId) })
  const input = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const uploadingRef = useRef(false)
  const mounted = useRef(true)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState('')
  const [errors, setErrors] = useState<{ filename: string; reason: string }[]>([])
  const [notice, setNotice] = useState('')
  const [downloadId, setDownloadId] = useState<string>()
  const [removeTarget, setRemoveTarget] = useState<NoteAttachment>()
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const upload = async (files: File[]) => {
    if (!files.length || uploadingRef.current) return
    uploadingRef.current = true
    setErrors([])
    setNotice('')
    let saved = 0
    try {
      for (const file of files) {
        if (!mounted.current || useAuth.getState().user?.id !== userId) break
        setUploading(file.name)
        try {
          if (file.size > maxFileBytes) throw new ApiError(413, 'FILE_TOO_LARGE', '')
          await noteAttachmentsApi.upload(noteId, file)
          saved += 1
        } catch (error) {
          const reason = error instanceof ApiError ? fileErrorKeys[error.code] : undefined
          setErrors((current) => [...current, { filename: file.name, reason: t(`notes.files.${reason ?? 'uploadFailed'}`) }])
        }
      }
      if (saved > 0) {
        void queryClient.invalidateQueries({ queryKey: key })
        setNotice(t('notes.files.uploaded', { count: saved }))
      }
    } finally {
      uploadingRef.current = false
      setUploading('')
    }
  }

  const download = async (attachment: NoteAttachment) => {
    setDownloadId(attachment.id)
    setNotice('')
    setErrors([])
    try {
      const blob = await noteAttachmentsApi.download(noteId, attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setErrors([{ filename: attachment.filename, reason: t('notes.files.downloadFailed') }])
    } finally {
      setDownloadId(undefined)
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    setRemoveError(false)
    try {
      await noteAttachmentsApi.remove(noteId, removeTarget.id)
      void queryClient.invalidateQueries({ queryKey: key })
      setNotice(t('notes.files.removed'))
      setRemoveTarget(undefined)
    } catch {
      setRemoveError(true)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-3" onPasteCapture={(event) => {
      const files = Array.from(event.clipboardData.files)
      if (!files.length) return
      event.preventDefault()
      event.stopPropagation()
      void upload(files)
    }} onDragEnter={(event) => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      dragDepth.current += 1
      setDragging(true)
    }} onDragOver={(event) => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      event.dataTransfer.dropEffect = uploadingRef.current ? 'none' : 'copy'
    }} onDragLeave={() => {
      if (dragDepth.current > 0) dragDepth.current -= 1
      if (dragDepth.current === 0) setDragging(false)
    }} onDropCapture={(event) => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      event.stopPropagation()
      dragDepth.current = 0
      setDragging(false)
      void upload(Array.from(event.dataTransfer.files))
    }}>
      <section className={`rounded-[24px] border border-dashed p-4 ${dragging
        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
        : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`} aria-label={t('notes.files.title')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold">{t('notes.files.title')}</h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{t('notes.files.hint')}</p>
          </div>
          <input ref={input} type="file" accept=".pdf,.docx,.txt,.md" multiple hidden onChange={(event) => {
            void upload(Array.from(event.target.files ?? []))
            event.target.value = ''
          }} />
          <Button type="button" variant="secondary" size="sm" disabled={!!uploading} onClick={() => input.current?.click()}>
            <Icon name="plus" size={16} />{t('notes.files.attach')}
          </Button>
        </div>
        {attachments.isError && <div className="mt-2 flex items-center gap-2 text-sm" role="alert">
          {t('notes.files.loadFailed')}
          <Button variant="ghost" size="sm" onClick={() => void attachments.refetch()}>{t('common.retry')}</Button>
        </div>}
        {!!attachments.data?.length && <ul className="mt-3 divide-y divide-[var(--color-border)]">
          {attachments.data.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Icon name="note" size={18} className="shrink-0 text-[var(--color-primary)]" />
                <div className="min-w-0">
                  <p className="font-semibold [overflow-wrap:anywhere]">{file.filename}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(Math.max(0.1, file.sizeBytes / 1024))} KB
                    {!file.hasText && ` · ${t('notes.files.noText')}`}
                    {file.hasText && file.textTruncated && ` · ${t('notes.files.truncated')}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {onStudy && file.hasText && <Button variant="secondary" size="sm" onClick={() => onStudy(file)}>
                  <Icon name="sparkles" size={16} />{t('notes.study.useFile')}
                </Button>}
                <Button variant="ghost" size="sm" disabled={!!downloadId} onClick={() => void download(file)}
                  aria-label={`${t('notes.files.download')} ${file.filename}`} title={t('notes.files.download')}>
                  <Icon name="download" size={18} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setRemoveError(false); setRemoveTarget(file) }}
                  aria-label={`${t('notes.files.remove')} ${file.filename}`} title={t('notes.files.remove')}>
                  <Icon name="trash" size={18} />
                </Button>
              </div>
            </li>
          ))}
        </ul>}
        <p className="mt-2 text-xs" role="status" hidden={!uploading && !notice}>
          {uploading ? t('notes.files.uploading', { filename: uploading }) : notice}
        </p>
        {!!errors.length && <ul className="mt-2 space-y-1 text-sm text-[var(--color-danger)] [overflow-wrap:anywhere]" role="alert">
          {errors.map(({ filename, reason }, index) => <li key={index}>{filename} · {reason}</li>)}
        </ul>}
      </section>
      {children}
      <Modal open={!!removeTarget} title={t('notes.files.remove')} onClose={() => { if (!removing) setRemoveTarget(undefined) }}>
        <p className="text-sm [overflow-wrap:anywhere]">{t('notes.files.confirmRemove', { filename: removeTarget?.filename })}</p>
        {removeError && <p className="mt-2 text-sm text-[var(--color-danger)]" role="alert">{t('notes.files.removeFailed')}</p>}
        <div className="mt-4 flex gap-2">
          <Button full variant="secondary" disabled={removing} onClick={() => setRemoveTarget(undefined)}>{t('common.cancel')}</Button>
          <Button full variant="danger" disabled={removing} onClick={() => void remove()}>{t('common.delete')}</Button>
        </div>
      </Modal>
    </div>
  )
}
