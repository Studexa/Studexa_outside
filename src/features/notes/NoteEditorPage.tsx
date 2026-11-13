import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { useApp, type Note } from '../../lib/store'

export function NoteEditorPage() {
  const { t } = useTranslation()
  const { noteId } = useParams()
  const notes = useApp((s) => s.notes)
  const note = notes.find((n) => n.id === noteId)

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
  const decks = useApp((s) => s.decks)
  const updateNote = useApp((s) => s.updateNote)
  const deleteNote = useApp((s) => s.deleteNote)
  const addCard = useApp((s) => s.addCard)

  const [title, setTitle] = useState(note.title)
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const [selectedText, setSelectedText] = useState('')
  const [cardOpen, setCardOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cardFront, setCardFront] = useState('')
  const [cardBack, setCardBack] = useState('')
  const [deckId, setDeckId] = useState(decks[0]?.id ?? '')
  const [flash, setFlash] = useState<string | null>(null)
  const saveTimer = useRef<number | null>(null)
  const latest = useRef({ title: note.title, content: note.content })

  const queueSave = (patch: { title?: string; content?: string }) => {
    latest.current = { ...latest.current, ...patch }
    setStatus('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      updateNote(note.id, latest.current)
      setStatus('saved')
    }, 600)
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
      const text = current.state.doc.textBetween(from, to, ' ').trim()
      setSelectedText(text)
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [])

  const flush = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    updateNote(note.id, latest.current)
  }

  const openCardModal = () => {
    setCardFront(selectedText)
    setCardBack('')
    setDeckId(decks[0]?.id ?? '')
    setCardOpen(true)
  }

  const createCard = () => {
    if (!cardFront.trim() || !cardBack.trim() || !deckId) return
    addCard(deckId, cardFront.trim(), cardBack.trim())
    setCardOpen(false)
    setSelectedText('')
    setFlash(t('notes.flashcardCreated'))
    window.setTimeout(() => setFlash(null), 2600)
  }

  const confirmDelete = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    deleteNote(note.id)
    navigate('/notes')
  }

  const words = (editor?.getText() ?? '').trim().split(/\s+/).filter(Boolean).length

  const tools = [
    { icon: 'bold' as const, label: t('notes.bold'), active: editor?.isActive('bold'), run: () => editor?.chain().focus().toggleBold().run() },
    { icon: 'italic' as const, label: t('notes.italic'), active: editor?.isActive('italic'), run: () => editor?.chain().focus().toggleItalic().run() },
    { icon: 'heading' as const, label: t('notes.heading'), active: editor?.isActive('heading', { level: 2 }), run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: 'list' as const, label: t('notes.bulletList'), active: editor?.isActive('bulletList'), run: () => editor?.chain().focus().toggleBulletList().run() },
    { icon: 'note' as const, label: t('notes.quote'), active: editor?.isActive('blockquote'), run: () => editor?.chain().focus().toggleBlockquote().run() },
    { icon: 'undo' as const, label: t('common.undo'), active: false, run: () => editor?.chain().focus().undo().run() },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            flush()
            navigate('/notes')
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
            {status === 'saved' ? t('notes.saved') : t('notes.saving')}
          </span>
        </div>
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
          aria-label={t('notes.deleteNote')}
        >
          <Icon name="trash" size={19} />
        </button>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              queueSave({ title: e.target.value })
            }}
            placeholder={t('notes.titlePlaceholder')}
            className="w-full border-0 bg-transparent px-0 py-1 text-2xl font-black outline-none focus:outline-none"
            aria-label={t('notes.titlePlaceholder')}
          />
          <div className="mt-1 flex items-center gap-3 text-[11px] font-semibold text-[var(--color-muted)]">
            <span>{t('notes.wordCount', { count: words })}</span>
            <span>·</span>
            <span>{t('notes.autosaveHint')}</span>
          </div>
        </div>

        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-2 py-2 backdrop-blur">
          {tools.map((tool) => (
            <button
              key={tool.label}
              onClick={tool.run}
              aria-label={tool.label}
              aria-pressed={!!tool.active}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
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

        <EditorContent editor={editor} />
      </div>

      {flash && (
        <p className="rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-center text-sm font-bold text-[var(--color-success)]">
          {flash}
        </p>
      )}

      {selectedText.length > 2 && (
        <button
          onClick={openCardModal}
          className="fixed bottom-24 left-1/2 z-30 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.4)] transition hover:-translate-y-0.5 active:scale-95 md:bottom-8"
        >
          <Icon name="cards" size={18} /> {t('notes.makeFlashcard')}
        </button>
      )}

      <Modal open={cardOpen} title={t('notes.makeFlashcard')} onClose={() => setCardOpen(false)}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold" htmlFor="flash-front">{t('decks.front')}</label>
            <textarea
              id="flash-front"
              value={cardFront}
              onChange={(e) => setCardFront(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-2xl px-4 py-3"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="flash-back">{t('decks.back')}</label>
            <textarea
              id="flash-back"
              value={cardBack}
              onChange={(e) => setCardBack(e.target.value)}
              rows={2}
              placeholder={t('decks.backPlaceholder')}
              className="mt-1 w-full resize-none rounded-2xl px-4 py-3"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="flash-deck">{t('notes.chooseDeck')}</label>
            <select
              id="flash-deck"
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="mt-1 w-full rounded-2xl px-4 py-2.5"
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.title}
                </option>
              ))}
            </select>
          </div>
          <Button full onClick={createCard} disabled={!cardFront.trim() || !cardBack.trim() || !deckId}>
            <Icon name="plus" size={18} /> {t('notes.createCard')}
          </Button>
        </div>
      </Modal>

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
