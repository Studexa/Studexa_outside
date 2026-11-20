import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { aiApi } from '../../lib/api'
import { slidesApi, type SlideDraft } from '../../lib/api/slides'
import { useAuth } from '../../lib/auth'
import { betaEnabled } from '../../lib/beta'
import { SlideError } from './SlideError'
import { SlidePresenter } from './SlidePresenter'

type Source = 'PROMPT' | 'SOURCE'
const MAX_PROMPT = 1000

export function SlidesPage() {
  const account = useAuth((state) => state.user?.id)
  return account ? <SlideWorkspace key={account} account={account} /> : null
}

function SlideWorkspace({ account }: { account: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const libraryKey = ['slide-decks', account]
  const library = useQuery({ queryKey: libraryKey, queryFn: slidesApi.list })
  const samples = useQuery({ queryKey: ['slide-study-samples', account], queryFn: aiApi.samples, enabled: betaEnabled })
  const [sampleId, setSampleId] = useState('')
  const [source, setSource] = useState<Source>('PROMPT')
  const [language, setLanguage] = useState<'en' | 'km'>(i18n.resolvedLanguage === 'km' ? 'km' : 'en')
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState<SlideDraft>()

  const extract = useMutation({ mutationFn: slidesApi.extract })
  const generate = useMutation({
    mutationFn: () => betaEnabled ? slidesApi.sample(sampleId)
      : slidesApi.generate({ mode: source, language, text: source === 'PROMPT' ? prompt : extract.data?.text ?? '' }),
    onSuccess: (result) => { if (useAuth.getState().user?.id === account) setDraft(result) },
  })
  const save = useMutation({
    mutationFn: slidesApi.save,
    onSuccess: async (deck) => {
      if (useAuth.getState().user?.id !== account) return
      queryClient.setQueryData(['slide-deck', account, deck.id], deck)
      void queryClient.invalidateQueries({ queryKey: libraryKey })
      await navigate(`/study/slides/${deck.id}`)
    },
  })

  const busy = generate.isPending || save.isPending || extract.isPending
  const ready = betaEnabled ? Boolean(sampleId) : Boolean(source === 'PROMPT' ? prompt.trim() : extract.data?.text)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy && ready) generate.mutate()
  }

  return <div className="study-workspace">
    <header className="study-page-header study-feature-header">
      <h1>{t('slides.title')}</h1>
      <p className="study-muted">{t('slides.subtitle')}</p>
    </header>

    <section className="study-panel slide-generator" aria-labelledby="generate-slides">
      <h2 id="generate-slides" className="study-section-title">{t('slides.create')}</h2>
      <form onSubmit={submit} className="slide-form">
        <fieldset disabled={busy} className="slide-fields">
          {betaEnabled ? <>
            <p className="study-muted">{t('slides.betaHint')}</p>
            {samples.isPending && <p role="status">{t('common.loading')}</p>}
            {samples.isError && <>
              <SlideError error={samples.error} />
              <Button type="button" variant="secondary" onClick={() => void samples.refetch()}>{t('common.retry')}</Button>
            </>}
            {samples.data && <label>
              {t('slides.sample')}
              <select value={sampleId} onChange={(event) => setSampleId(event.target.value)} required>
                <option value="">{t('slides.pickSample')}</option>
                {samples.data.map((sample) => <option key={sample.id} value={sample.id}>{sample.title}</option>)}
              </select>
            </label>}
          </> : <>
            <div className="slide-source-options">
              <label>
                {t('slides.source')}
                <select value={source} onChange={(event) => {
                  extract.reset()
                  generate.reset()
                  setSource(event.target.value === 'SOURCE' ? 'SOURCE' : 'PROMPT')
                }}>
                  <option value="PROMPT">{t('slides.promptMode')}</option>
                  <option value="SOURCE">{t('slides.fileMode')}</option>
                </select>
              </label>
              <label>
                {t('slides.language')}
                <select value={language} onChange={(event) => setLanguage(event.target.value === 'km' ? 'km' : 'en')}>
                  <option value="en">English</option>
                  <option value="km">ខ្មែរ</option>
                </select>
              </label>
            </div>
            {source === 'PROMPT' ? <label>
              {t('slides.prompt')}
              <textarea rows={4} maxLength={MAX_PROMPT} value={prompt} onChange={(event) => setPrompt(event.target.value)} required />
            </label> : <>
              <label>
                {t('slides.file')}
                <input type="file" accept=".pdf,.docx,.txt,.md" aria-describedby="slide-file-hint"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    extract.reset()
                    if (file) extract.mutate(file)
                  }} />
              </label>
              <p id="slide-file-hint" className="study-muted">{t('slides.fileHint')}</p>
              {extract.isPending && <p role="status">{t('slides.readingFile')}</p>}
              <SlideError error={extract.error} />
              {extract.data && <>
                {extract.data.truncated && <p className="study-muted" role="status">{t('slides.truncated')}</p>}
                <label>
                  {t('slides.sourcePreview')}
                  <textarea readOnly rows={6} value={extract.data.text} />
                </label>
              </>}
            </>}
            <p className="study-muted">{t('slides.aiDisclosure')}</p>
          </>}
          <Button type="submit" disabled={!ready || busy}>{t(draft ? 'slides.regenerate' : 'slides.generate')}</Button>
        </fieldset>
        {generate.isPending && <p role="status">{t('slides.generating')}</p>}
        <SlideError error={generate.error} />
      </form>
    </section>

    {draft && <section className="slide-preview" aria-labelledby="slide-draft-title">
      <header>
        <p className="study-muted">{t('slides.draft')}</p>
        <h2 className="study-section-title" id="slide-draft-title">{draft.content.title}</h2>
      </header>
      <SlidePresenter key={draft.id} slides={draft.content.slides} />
      <div className="study-panel slide-questions">
        <h3 className="study-section-title">{t('slides.quizPreview')}</h3>
        {draft.content.questions.map((question, index) => <details key={index}>
          <summary>{question.question}</summary>
          <ul>{question.choices.map((choice, choiceIndex) => <li key={choice}>
            {choiceIndex === question.correctIndex ? <strong>{t('quizRoom.correctAnswer', { answer: choice })}</strong> : choice}
          </li>)}</ul>
          <p>{question.explanation}</p>
        </details>)}
      </div>
      <SlideError error={save.error} />
      <Button disabled={busy} onClick={() => save.mutate(draft)}>{t(save.isPending ? 'slides.saving' : 'slides.save')}</Button>
    </section>}

    <section className="study-panel slide-library" aria-labelledby="saved-slides">
      <h2 className="study-section-title" id="saved-slides">{t('slides.library')}</h2>
      {library.isPending && <p role="status">{t('common.loading')}</p>}
      {library.isError && <>
        <SlideError error={library.error} />
        <Button variant="secondary" onClick={() => void library.refetch()}>{t('common.retry')}</Button>
      </>}
      {library.data?.length === 0 && <p className="study-muted">{t('slides.empty')}</p>}
      {!!library.data?.length && <ul className="study-deck-list">
        {library.data.map((deck) => <li key={deck.id}>
          <Link className="study-deck-row slide-deck-link" to={`/study/slides/${deck.id}`}>{deck.title}</Link>
        </li>)}
      </ul>}
    </section>
  </div>
}
