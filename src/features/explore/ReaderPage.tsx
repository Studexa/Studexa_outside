import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { readingsApi } from '../../lib/api/readings'
import { isGuestMode, useAuth } from '../../lib/auth'
import { PassageTools } from '../passages/PassageTools'
import { useReadingEditions } from './useReadingEditions'

export function ReaderPage() {
  const { t } = useTranslation()
  const { readingId = '' } = useParams()
  const source = useRef<HTMLElement>(null)
  const userId = useAuth((state) => state.user?.id)
  const editions = useReadingEditions()
  const reading = useQuery({
    queryKey: ['reading', userId, readingId],
    queryFn: () => readingsApi.get(readingId),
    enabled: !!userId && !isGuestMode() && !!readingId,
    staleTime: Infinity,
    retry: false,
  })
  const edition = reading.data?.edition ?? editions.data?.find((item) => item.id === readingId)
  const adjacent = [
    { id: edition?.previousId, name: t('reading.previous'), direction: 'arrowLeft' },
    { id: edition?.nextId, name: t('reading.next'), direction: 'arrowRight' },
  ] as const
  return <div className="reading-page">
    <Link className="reading-back" to="/explore"><Icon name="arrowLeft" size={17} />{t('reading.back')}</Link>
    {edition && <header className="reading-page-header">
      <span>{t('reading.subjects.' + edition.subject)}</span>
      <h1 lang="en">{edition.title}</h1>
      <p lang="en">{edition.author} · {edition.section}</p>
      <a href={edition.sourceUrl} target="_blank" rel="noopener noreferrer">{t('reading.openEdition')}</a>
    </header>}
    {isGuestMode() ? <p className="study-muted">{t('reading.signIn')} <Link to="/login" className="font-bold underline">{t('reading.login')}</Link></p>
      : reading.isPending ? <p className="study-muted" role="status">{t('reading.loading')}</p>
        : reading.isError ? <div role="alert" className="flex flex-wrap items-center gap-3">
          <p>{t('reading.readerError')}</p>
          <Button size="sm" variant="secondary" onClick={() => void reading.refetch()}>{t('common.retry')}</Button>
        </div> : <>
          <p className="study-muted reading-select-hint"><Icon name="sparkles" size={17} />{t('reading.select')}</p>
          <article ref={source} className="reading-paper" tabIndex={0} lang="en" aria-label={reading.data.edition.section}>
            {reading.data.blocks.map((block, index) => {
              const Tag = block.heading ? 'h2' : 'p'
              return <Tag key={index} data-reading-block={index}>{block.text}</Tag>
            })}
          </article>
          <PassageTools key={readingId} source={source} title={reading.data.edition.title + ' · ' + reading.data.edition.section} reading={reading.data} />
        </>}
    {!!(edition?.previousId || edition?.nextId) && <nav className="reading-chapters" aria-label={t('reading.chapters')}>
      {adjacent.map((item) => item.id && <Link key={item.id} to={'/explore/read/' + item.id} data-direction={item.direction}>
        <Icon name={item.direction} size={17} />{item.name}
      </Link>)}
    </nav>}
  </div>
}
