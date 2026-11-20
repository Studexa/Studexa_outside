import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { useApp, type Note } from '../../lib/store'
import { openStudyBuddy } from '../../lib/aiStudy'
import { betaEnabled } from '../../lib/beta'
import { isGuestMode, useAuth } from '../../lib/auth'
import { PassageTools } from '../passages/PassageTools'
import { NoteAttachments } from './NoteAttachments'
import { NoteStudy, type NoteStudySource } from './NoteStudy'

export function NoteEditorPage() {
  const { t } = useTranslation()
  const { noteId } = useParams()
  const notes = useApp((s) => s.notes)
  const loadNotes = useApp((s) => s.loadNotes)
  const note = notes.find((n) => n.id === noteId)

  useEffect(() => {
    void loadNotes().catch(() => undefined)
  }, [loadNotes])

  if (!note) {
    return (
      <EmptyState
        title={t('notes.notFound')}
        hint={t('notes.notFoundHint')}
        action={<Link to="/notes"><Button>{t('notes.backToNotes')}</Button></Link>}
      />
    )
  }
  return <NoteEditor key={note.id} note={note} />
}

function NoteEditor({ note }: { note: Note }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userId = useAuth((state) => state.user?.id)
  const accountId = isGuestMode() ? undefined : userId
  const updateNote = useApp((s) => s.updateNote)
  const deleteNote = useApp((s) => s.deleteNote)

  const [title, setTitle] = useState(note.title)
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [selectedText, setSelectedText] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [studySource, setStudySource] = useState<NoteStudySource>()
  const passageSource = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<number | null>(null)
  const initial = { title: note.title, content: note.content }
  const latest = useRef(initial)
  const saved = useRef(initial)
  const saving = useRef<Promise<void>>(Promise.resolve())

  const flush = () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = null
    setStatus('saving')
    const snapshot = latest.current
    const request = saving.current.then(async () => {
      if (useAuth.getState().user?.id !== userId) return
      if (snapshot !== saved.current) {
        await updateNote(note.id, snapshot)
        saved.current = snapshot
      }
      if (latest.current === snapshot) setStatus('saved')
    })
    saving.current = request.catch(() => { setStatus('error') })
    return request
  }

  const queueSave = (patch: { title?: string; content?: string }) => {
    latest.current = { ...latest.current, ...patch }
    setStatus('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => { void flush().catch(() => undefined) }, 600)
  }

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'tiptap prose-none min-h-[42vh] px-4 py-4 outline-none sm:px-6',
      },
    },
    onUpdate: ({ editor: current }) => queueSave({ content: current.getHTML() }),
    onSelectionUpdate: ({ editor: current }) => {
      const { from, to } = current.state.selection
      const text = current.state.doc.textBetween(from, to, '\n').trim()
      setSelectedText(text)
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [])

  const confirmDelete = async () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    await saving.current
    if (useAuth.getState().user?.id !== userId) return
    await deleteNote(note.id)
    navigate('/notes')
  }

  const bodyText = useEditorState({ editor, selector: ({ editor }) => editor?.getText({ blockSeparator: '\n' }).trim() ?? '' }) ?? ''
  const words = bodyText.split(/\s+/).filter(Boolean).length
  const canStudy = !!accountId && !betaEnabled

  const insertSummary = (summary: string) => {
    if (!editor) return
    const paragraphs = summary.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const inserted = editor.commands.insertContentAt(editor.state.doc.content.size, [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: t('notes.study.summary') }] },
      ...paragraphs.map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] })),
    ])
    if (inserted) {
      setStudySource(undefined)
      void flush().catch(() => undefined)
    }
  }

  const tools = [
    { icon: 'bold' as const, label: t('notes.bold'), active: editor?.isActive('bold'), run: () => editor?.chain().focus().toggleBold().run() },
    { icon: 'italic' as const, label: t('notes.italic'), active: editor?.isActive('italic'), run: () => editor?.chain().focus().toggleItalic().run() },
    { icon: 'heading' as const, label: t('notes.heading'), active: editor?.isActive('heading', { level: 2 }), run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: 'list' as const, label: t('notes.bulletList'), active: editor?.isActive('bulletList'), run: () => editor?.chain().focus().toggleBulletList().run() },
    { icon: 'note' as const, label: t('notes.quote'), active: editor?.isActive('blockquote'), run: () => editor?.chain().focus().toggleBlockquote().run() },
    { icon: 'undo' as const, label: t('common.undo'), active: false, run: () => editor?.chain().focus().undo().run() },
  ]

  const noteEditor = (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            void flush().then(() => navigate('/notes')).catch(() => undefined)
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
          aria-label={t('common.back')}
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--color-primary)]">
            {note.subject}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-muted)]" role="status">
            <Icon name={status === 'saved' ? 'checkCircle' : 'reset'} size={14} className={status === 'saving' ? 'animate-spin' : ''} />
            {status === 'error' ? t('notes.saveError') : status === 'saved' ? t('notes.saved') : t('notes.saving')}
          </span>
          {status === 'error' && (
            <button type="button" className="text-xs font-bold underline"
              onClick={() => void flush().catch(() => undefined)}>{t('common.retry')}</button>
          )}
        </div>
        {!betaEnabled && <Button variant="secondary" size="sm" disabled={!editor?.getText().trim()}
          onClick={(event) => openStudyBuddy({ title, text: selectedText || editor?.getText({ blockSeparator: '\n' }) || '' }, event.currentTarget)}>
          <Icon name="sparkles" size={16} /> {t('pet.studyNote')}
        </Button>}
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
          aria-label={t('notes.deleteNote')}
        >
          <Icon name="trash" size={19} />
        </button>
      </div>

      {canStudy && <section aria-label={t('notes.study.title')} className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!bodyText}
          onClick={() => setStudySource({ kind: 'note', title, text: bodyText })}>
          <Icon name="sparkles" size={16} /> {t('notes.study.useNote')}
        </Button>
        <Button variant="secondary" size="sm" disabled={!selectedText}
          onClick={() => setStudySource({ kind: 'selection', title, text: selectedText })}>
          {t('notes.study.useSelection')}
        </Button>
      </section>}

      <div className="study-editor-surface study-panel">
        <div className="border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              queueSave({ title: e.target.value })
            }}
            placeholder={t('notes.titlePlaceholder')}
            className="w-full border-0 bg-transparent px-0 py-1 text-2xl font-semibold"
            aria-label={t('notes.titlePlaceholder')}
          />
          <div className="study-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{t('notes.wordCount', { count: words })}</span>
            <span>·</span>
            <span>{t('notes.autosaveHint')}</span>
          </div>
        </div>

        <div className="study-note-tools flex flex-wrap items-center gap-1 px-2 py-2" role="group" aria-label={t('notes.formatting')}>
          {tools.map((tool) => (
            <button
              key={tool.label}
              onClick={tool.run}
              aria-label={tool.label}
              aria-pressed={!!tool.active}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                tool.active
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon name={tool.icon} size={18} />
            </button>
          ))}
          <div className="ml-auto hidden items-center gap-1 pr-1 text-[11px] font-bold text-[var(--color-muted)] sm:flex">
            <Icon name="sparkles" size={13} /> {t('notes.selectHint')}
          </div>
        </div>

        <div ref={passageSource}><EditorContent editor={editor} /></div>
      </div>
    </>
  )

  return (
    <div className="space-y-3">
      {accountId ? <NoteAttachments key={accountId} noteId={note.id} userId={accountId}
        onStudy={canStudy ? (file) => setStudySource({ kind: 'attachment', file }) : undefined}>
        {noteEditor}
      </NoteAttachments> : noteEditor}

      {studySource && accountId && canStudy && <NoteStudy noteId={note.id} userId={accountId} source={studySource}
        onClose={() => setStudySource(undefined)} onInsertSummary={insertSummary} onCardsSaved={(count) => {
          setStudySource(undefined)
          setFlash(t('notes.study.savedCards', { count }))
          window.setTimeout(() => setFlash(null), 2600)
        }} />}

      {flash && (
        <p role="status" className="rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-center text-sm font-bold text-[var(--color-success)]">
          {flash}
        </p>
      )}

      <PassageTools source={passageSource} title={title} />

      <Modal open={deleteOpen} title={t('notes.deleteNote')} onClose={() => setDeleteOpen(false)}>
        <p className="text-sm text-[var(--color-muted)]">{t('notes.deleteHint')}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" full onClick={() => setDeleteOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" full onClick={confirmDelete}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
