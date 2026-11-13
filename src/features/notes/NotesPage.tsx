import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { useApp } from '../../lib/store'

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function NotesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const notes = useApp((s) => s.notes)
  const addNote = useApp((s) => s.addNote)
  const [query, setQuery] = useState('')

  const filtered = notes.filter((note) =>
    `${note.title} ${plainText(note.content)} ${note.subject}`.toLowerCase().includes(query.toLowerCase()),
  )

  const create = () => {
    const id = addNote({ title: t('notes.untitled'), content: '', subject: t('notes.general') })
    navigate(`/notes/${id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t('notes.title')}</h1>
          <p className="text-sm text-[var(--color-muted)]">{t('notes.subtitle')}</p>
        </div>
        <Button onClick={create}>
          <Icon name="plus" size={18} /> {t('notes.newNote')}
        </Button>
      </div>

      <div className="relative">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('notes.searchPlaceholder')}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold"
          aria-label={t('common.search')}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('notes.empty')}
          hint={t('notes.emptyHint')}
          action={<Button onClick={create}>{t('notes.newNote')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((note) => (
            <Link
              key={note.id}
              to={`/notes/${note.id}`}
              className="pressable flex flex-col rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--color-primary)]">
                  {note.subject}
                </span>
                <span className="text-[10px] font-bold text-[var(--color-muted)]">
                  {new Intl.DateTimeFormat(i18n.language === 'km' ? 'km-KH' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date(note.updatedAt))}
                </span>
              </div>
              <p className="mt-2 line-clamp-1 text-base font-extrabold">{note.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">
                {plainText(note.content) || t('notes.emptyNote')}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)]">
                {t('notes.open')} <Icon name="arrowRight" size={13} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
