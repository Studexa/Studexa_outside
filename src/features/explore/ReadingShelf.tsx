import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import type { ReadingEdition, ReadingSubject } from '../../lib/api/readings'
import { isGuestMode } from '../../lib/auth'
import { useStudyDate } from '../../lib/study'
import { formatStudyDate } from '../../lib/studyDate'
import { useReadingEditions } from './useReadingEditions'

const subjects = ['SCIENCE', 'HISTORY', 'LITERATURE'] as const

function ReadingLink({ edition }: { edition: ReadingEdition }) {
  const { t } = useTranslation()
  return <Link to={'/explore/read/' + edition.id} className="reading-link" data-subject={edition.subject}>
    <span className="reading-link-subject"><Icon name="book" size={16} />{t('reading.subjects.' + edition.subject)}</span>
    <strong>{edition.title}</strong>
    <span>{edition.section} · {edition.author}</span>
    <span className="reading-link-action">{t('reading.read')}<Icon name="arrowRight" size={16} /></span>
  </Link>
}

export function ReadingShelf() {
  const { t, i18n } = useTranslation()
  const date = useStudyDate()
  const editions = useReadingEditions()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<ReadingSubject | 'all'>('all')

  if (isGuestMode()) return <p className="study-muted">{t('reading.signIn')} <Link to="/login" className="font-bold underline">{t('reading.login')}</Link></p>
  if (editions.isPending) return <p role="status" className="study-muted">{t('reading.loading')}</p>
  if (editions.isError) return <div role="alert" className="flex flex-wrap items-center gap-3">
    <p>{t('reading.catalogError')}</p>
    <Button size="sm" variant="secondary" onClick={() => void editions.refetch()}>{t('common.retry')}</Button>
  </div>

  const catalog = editions.data
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  const daily = catalog.slice(0, 3).map((_, index) => catalog[((day + index) % catalog.length + catalog.length) % catalog.length])
  const search = query.trim().toLowerCase()
  const matches = catalog.filter((item) => (subject === 'all' || item.subject === subject) &&
    [item.title, item.author, item.section, item.subject, t('reading.subjects.' + item.subject)].join(' ').toLowerCase().includes(search))

  return <>
    {!!daily.length && <section className="reading-shelf" aria-labelledby="reading-daily">
      <div className="reading-shelf-heading">
        <h2 id="reading-daily">{t('reading.daily')}</h2>
        <span>{formatStudyDate(date, i18n.resolvedLanguage ?? 'en', 'medium')}</span>
      </div>
      <div className="reading-grid">{daily.map((edition) => <ReadingLink key={edition.id} edition={edition} />)}</div>
    </section>}
    <section className="reading-shelf" aria-labelledby="reading-catalog">
      <div className="reading-shelf-heading">
        <h2 id="reading-catalog">{t('reading.shelf')}</h2>
        <span>{t('reading.attribution')}</span>
      </div>
      <label className="reading-search">
        <Icon name="search" size={18} />
        <input type="search" placeholder={t('reading.search')} aria-label={t('reading.search')}
          value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('explore.allSubjects')}>
        {(['all', ...subjects] as const).map((item) => <Button key={item} size="sm" variant={subject === item ? 'primary' : 'secondary'}
          aria-pressed={subject === item} onClick={() => setSubject(item)}>
          {item === 'all' ? t('explore.allSubjects') : t('reading.subjects.' + item)}
        </Button>)}
      </div>
      {matches.length ? <div className="reading-grid">{matches.map((edition) => <ReadingLink key={edition.id} edition={edition} />)}</div>
        : <p className="study-muted" role="status">{t('reading.empty')}</p>}
    </section>
  </>
}
