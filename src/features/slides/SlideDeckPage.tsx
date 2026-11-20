import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { ApiError } from '../../lib/api'
import { sessionApi } from '../../lib/api/quiz'
import { slidesApi } from '../../lib/api/slides'
import { useAuth } from '../../lib/auth'
import { SlideError } from './SlideError'
import { SlidePresenter } from './SlidePresenter'

export function SlideDeckPage() {
  const { t } = useTranslation()
  const { deckId = '' } = useParams()
  const account = useAuth((state) => state.user?.id)
  const navigate = useNavigate()
  const deck = useQuery({ queryKey: ['slide-deck', account, deckId], queryFn: () => slidesApi.get(deckId), retry: false })
  const host = useMutation({
    mutationFn: (quizId: string) => sessionApi.createSession({ quizId, mode: 'LIVE_RACE', numQuestions: 4, timePerQuestion: 30 }),
    onSuccess: (room) => {
      if (useAuth.getState().user?.id === account) void navigate(`/quiz/lobby/${room.roomCode}`)
    },
  })
  const saved = deck.data
  const missing = deck.error instanceof ApiError && deck.error.status === 404

  return <div className="study-workspace">
    <header className="study-page-header study-feature-header">
      <Link className="study-text-link" to="/study/slides">{t('slides.back')}</Link>
      <h1>{saved?.title ?? t('slides.title')}</h1>
    </header>
    {deck.isPending && <p role="status">{t('common.loading')}</p>}
    {deck.isError && (missing ? <p role="alert" className="slide-error">{t('slides.errors.missing')}</p> :
      <div>
        <SlideError error={deck.error} />
        <Button variant="secondary" onClick={() => void deck.refetch()}>{t('common.retry')}</Button>
      </div>)}
    {saved && <>
      <SlidePresenter key={`${account}-${saved.id}`} slides={saved.slides} />
      <section className="study-panel slide-host" aria-labelledby="host-slide-quiz">
        <h2 id="host-slide-quiz" className="study-section-title">{t('slides.liveQuiz')}</h2>
        <p className="study-muted">{t('slides.hostHint')}</p>
        <SlideError error={host.error} />
        <Button disabled={host.isPending} onClick={() => host.mutate(saved.quizId)}>
          {t(host.isPending ? 'common.loading' : 'slides.host')}
        </Button>
      </section>
    </>}
  </div>
}
