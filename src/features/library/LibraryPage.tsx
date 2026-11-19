import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { call, client } from '../../lib/api/client'
import { isGuestMode, useAuth } from '../../lib/auth'
import { betaEnabled } from '../../lib/beta'
import { useApp } from '../../lib/store'

const subjects = ['SCIENCE', 'HISTORY', 'MATH', 'COMPUTING', 'HUMANITIES', 'SOCIAL_SCIENCES', 'BUSINESS', 'HEALTH', 'COLLEGE_SUCCESS'] as const
type Subject = typeof subjects[number]
type Book = { slug: string; title: string; subjects: Subject[]; readerUrl: string; publisherUrl: string }
type Catalog = { books: Book[]; stale: boolean }

function readingNote(book: Book, passage: string) {
  const note = document.createElement('div')
  for (const line of passage.trim().split(/\r?\n/).filter((line) => line.trim())) {
    note.appendChild(document.createElement('p')).textContent = line.trim()
  }
  const source = note.appendChild(document.createElement('p'))
  source.append('OpenStax · ')
  const link = source.appendChild(document.createElement('a'))
  link.href = book.publisherUrl
  link.textContent = book.title
  return note.innerHTML
}

export function LibraryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const guest = isGuestMode()
  const accountId = useAuth((state) => state.user?.id)
  const addNote = useApp((state) => state.addNote)
  const [params, setParams] = useSearchParams()
  const topic = subjects.find((subject) => subject === params.get('subject'))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Book>()
  const [passage, setPassage] = useState('')

  const catalog = useQuery({
    queryKey: ['library-books', accountId],
    queryFn: () => call<Catalog>(client.GET('/api/v1/library/books')),
    staleTime: 10 * 60_000,
    enabled: !!accountId && !guest,
    retry: false,
  })
  const save = useMutation({
    mutationFn: (book: Book) => addNote({
      title: book.title.slice(0, 200).replace(/[\uD800-\uDBFF]$/u, ''),
      subject: t(`library.subjects.${topic ?? book.subjects[0] ?? 'all'}`),
      content: readingNote(book, passage),
    }),
    onSuccess: (id) => navigate(`/notes/${id}`),
  })

  const books = catalog.data?.books.filter((book) => (!topic || book.subjects.includes(topic))
    && book.title.toLowerCase().includes(search.trim().toLowerCase())) ?? []

  return <div className="study-workspace">
    <header className="study-page-header study-feature-header">
      <h1>{t('library.title')}</h1>
      <p className="study-muted">{t('library.description')}</p>
    </header>
    {guest ? <EmptyState title={t('library.signIn')} action={<Link className="study-text-link" to="/settings">{t('shell.settings')}</Link>} /> : <>
      <section className="study-panel space-y-3" aria-label={t('library.browse')}>
        <label className="block text-sm font-bold">
          {t('library.search')}
          <input type="search" className="mt-1 block w-full max-w-lg rounded-xl px-3 py-2"
            value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="library-subjects" role="group" aria-label={t('library.browse')}>
          {(['all', ...subjects] as const).map((subject) => <button type="button" key={subject}
            aria-pressed={subject === (topic ?? 'all')}
            onClick={() => setParams(subject === 'all' ? {} : { subject }, { replace: true })}>
            {t(`library.subjects.${subject}`)}
          </button>)}
        </div>
      </section>
      {catalog.isPending && <p className="study-muted" role="status">{t('library.loading')}</p>}
      {catalog.isError && <EmptyState title={t('library.unavailable')}
        action={<Button variant="secondary" onClick={() => void catalog.refetch()}>{t('common.retry')}</Button>} />}
      {catalog.data?.stale && <p className="study-muted" role="status">{t('library.cached')}</p>}
      {catalog.isSuccess && !books.length && <EmptyState title={t('library.empty')} hint={t('library.emptyHint')} />}
      {!!books.length && <ul className="library-books">
        {books.map((book) => <li key={book.slug} className="study-panel library-book" data-subject={topic ?? book.subjects[0]}>
          <div className="library-book-top">
            <span className="library-book-icon"><Icon name="book" size={23} /></span>
            <p className="study-muted">{book.subjects.map((subject) => t(`library.subjects.${subject}`)).join(' · ')}</p>
          </div>
          <h2><a href={book.readerUrl} target="_blank" rel="noopener noreferrer">{book.title}</a></h2>
          <div className="library-book-actions">
            <a className="study-text-link" href={book.readerUrl} target="_blank" rel="noopener noreferrer">
              {t('library.read')} <Icon name="arrowRight" size={15} />
            </a>
            <Button size="sm" variant="secondary" onClick={() => { save.reset(); setPassage(''); setSelected(book) }}>
              {t('library.save')}
            </Button>
          </div>
        </li>)}
      </ul>}
    </>}

    <Modal open={!!selected} title={t('library.save')} onClose={() => { if (!save.isPending) setSelected(undefined) }}>
      {selected && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(selected) }}>
        <h3 className="font-bold [overflow-wrap:anywhere]">{selected.title}</h3>
        <p className="study-muted">{t('library.noteHelp')}</p>
        <label className="block text-sm font-bold">
          {t('library.passage')}
          <textarea className="mt-1 w-full rounded-xl p-3 font-normal" rows={5} maxLength={40000}
            value={passage} onChange={(event) => setPassage(event.target.value)} disabled={save.isPending} />
        </label>
        <p className="study-muted">{t(betaEnabled ? 'library.betaNote' : 'library.aiNote')}</p>
        {save.isError && <p role="alert" className="text-sm text-[var(--color-danger)]">{t('library.saveError')}</p>}
        <Button type="submit" full disabled={save.isPending}>{t(save.isPending ? 'notes.saving' : 'library.save')}</Button>
      </form>}
    </Modal>
  </div>
}
