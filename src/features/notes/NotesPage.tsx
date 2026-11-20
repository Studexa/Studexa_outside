import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { formatStudyDate } from '../../lib/studyDate'
import { useApp } from '../../lib/store'

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function NotesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const notes = useApp((s) => s.notes)
  const addNote = useApp((s) => s.addNote)
  const loadNotes = useApp((s) => s.loadNotes)
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [creating, setCreating] = useState(false)
  const [createFailed, setCreateFailed] = useState(false)

  useEffect(() => {
    let active = true
    void loadNotes().then(
      () => { if (active) setListStatus('ready') },
      () => { if (active) setListStatus('error') },
    )
    return () => { active = false }
  }, [attempt, loadNotes])

  const search = query.trim().toLowerCase()
  const filtered = notes.map((note) => ({ ...note, excerpt: plainText(note.content) }))
    .filter((note) => `${note.title} ${note.excerpt} ${note.subject}`.toLowerCase().includes(search))
    .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt))

  const create = async () => {
    setCreating(true)
    setCreateFailed(false)
    try {
      const id = await addNote({ title: t('notes.untitled'), content: '', subject: t('notes.general') })
      navigate(`/notes/${id}`)
    } catch {
      setCreateFailed(true)
      setCreating(false)
    }
  }

  return (
    <div className="study-workspace">
      <header className="study-page-header study-list-header">
        <div>
          <h1 className="text-2xl font-black">{t('notes.title')}</h1>
          <p className="study-muted">{t('notes.subtitle')}</p>
        </div>
        <Button onClick={create} disabled={creating}>
          <Icon name="plus" size={18} /> {t('notes.newNote')}
        </Button>
      <label className="study-list-search relative">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('notes.searchPlaceholder')}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold"
          aria-label={t('common.search')}
        />
      </label>
      </header>

      {createFailed && <p role="alert" className="study-panel">{t('notes.createFailed')}</p>}
      {listStatus === 'error' && (
        <div className="study-panel flex flex-wrap items-center gap-3">
          <p role="alert">{t('notes.loadFailed')}</p>
          <Button size="sm" variant="secondary" onClick={() => {
            setListStatus('loading')
            setAttempt(attempt + 1)
          }}>{t('common.retry')}</Button>
        </div>
      )}
      {listStatus === 'loading' && !notes.length ? (
        <p role="status" className="study-panel study-muted">{t('common.loading')}</p>
      ) : listStatus === 'error' && !notes.length ? null : filtered.length === 0 ? (
        search && notes.length ? <p role="status" className="study-panel study-muted">{t('notes.noMatches')}</p>
          : <EmptyState title={t('notes.empty')} hint={t('notes.emptyHint')} />
      ) : (
        <div className="study-note-grid">
          {filtered.map((note) => (
            <Link
              key={note.id}
              to={`/notes/${note.id}`}
              className="study-panel study-note-card"
            >
              <h2 className="study-section-title line-clamp-2">{note.title}</h2>
              <p className="study-muted line-clamp-2">{note.excerpt || t('notes.emptyNote')}</p>
              <div className="study-note-meta study-muted">
                <span>{note.subject}</span>
                <time dateTime={note.updatedAt}>{formatStudyDate(new Date(note.updatedAt), i18n.resolvedLanguage ?? 'en', 'medium')}</time>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
