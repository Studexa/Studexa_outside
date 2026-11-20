import { useEffect, useId, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { aiApi, type AiTutorInput } from '../lib/api'
import { ApiError } from '../lib/api/client'
import { aiErrorMessage } from '../lib/aiErrors'
import { isTutorRoute, MAX_TUTOR_SOURCE, openStudyCompanion, STUDY_COMPANION_EVENT, STUDY_SOURCE_EVENT, type StudySource } from '../lib/aiStudy'
import { isGuestMode, useAuth } from '../lib/auth'
import { betaEnabled } from '../lib/beta'
import { useApp } from '../lib/store'
import { useOnline } from '../lib/useSettings'
import { useStudySamples } from '../lib/useStudySamples'
import { Button } from './Button'
import { Icon } from './Icon'
import { Mascot } from './Mascot'
import './aiTutor.css'

type TutorResponse = Awaited<ReturnType<typeof aiApi.tutor>>
type TutorRequest = { mode: 'standard'; input: AiTutorInput } | {
  mode: 'beta'; input: Parameters<typeof aiApi.sampleTutor>[0]
}
type Turn = {
  id: number
  question: string
  request: TutorRequest
  response?: TutorResponse
  failure?: { error: unknown }
}

const emptySource: StudySource = { title: '', text: '' }
const historyLimit = 3
const questionLimit = 1200

export function TutorLayout() {
  const location = useLocation()
  const userId = useAuth((state) => state.user?.id)
  const available = Boolean(userId) && isTutorRoute(location.pathname) && (!betaEnabled || !isGuestMode())
  return <><AiPet available={available} /><Outlet /></>
}

export function TutorLauncher() {
  const { t } = useTranslation()
  const buddy = useApp((state) => state.buddy)
  return <button type="button" className="study-header-action study-tutor-launcher"
    onClick={(event) => openStudyCompanion(event.currentTarget)} aria-haspopup="dialog" aria-label={t('beta.tutor')}>
    <Mascot species={buddy} size={26} /><span className="study-header-label">{t('beta.tutor')}</span>
  </button>
}

export function AiPet({ available = true }: { available?: boolean }) {
  const userId = useAuth((state) => state.user?.id)
  return <Tutor key={userId ?? 'guest'} available={available} />
}

function Tutor({ available }: { available: boolean }) {
  const { t } = useTranslation()
  const buddy = useApp((state) => state.buddy)
  const online = useOnline()
  const guest = isGuestMode()
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const sending = useRef(false)
  const nextId = useRef(0)
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [pendingId, setPendingId] = useState<number>()
  const [draft, setDraft] = useState('')
  const [source, setSource] = useState(emptySource)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [sampleId, setSampleId] = useState('')
  const [promptId, setPromptId] = useState('')
  const visible = open && available
  const { sample, samples, query } = useStudySamples(betaEnabled && visible && online && !guest, sampleId)
  const prompt = sample?.prompts.find((item) => item.id === promptId) ?? sample?.prompts[0]
  const pending = pendingId !== undefined

  useEffect(() => {
    if (!available) return
    const launch = (event: Event) => {
      opener.current = (event as CustomEvent<HTMLButtonElement>).detail ?? null
      setOpen(true)
    }
    const attach = (event: Event) => {
      if (guest || betaEnabled) return
      const detail = (event as CustomEvent<{ source: StudySource; opener?: HTMLButtonElement }>).detail
      opener.current = detail.opener ?? (document.activeElement as HTMLElement | null)
      setSource({ title: detail.source.title.slice(0, 200), text: detail.source.text.slice(0, MAX_TUTOR_SOURCE) })
      setTruncated(detail.source.text.length > MAX_TUTOR_SOURCE)
      setSourceOpen(true)
      setOpen(true)
    }
    window.addEventListener(STUDY_COMPANION_EVENT, launch)
    window.addEventListener(STUDY_SOURCE_EVENT, attach)
    return () => {
      window.removeEventListener(STUDY_COMPANION_EVENT, launch)
      window.removeEventListener(STUDY_SOURCE_EVENT, attach)
    }
  }, [available, guest])

  useEffect(() => {
    const element = dialog.current
    if (!visible || !element) return
    const previousFocus = opener.current ?? (document.activeElement as HTMLElement | null)
    const overflow = document.body.style.overflow
    const viewport = window.visualViewport
    const fitViewport = () => {
      element.style.setProperty('--tutor-viewport-height', `${viewport?.height ?? window.innerHeight}px`)
      element.style.setProperty('--tutor-viewport-top', `${viewport?.offsetTop ?? 0}px`)
    }
    fitViewport()
    viewport?.addEventListener('resize', fitViewport)
    viewport?.addEventListener('scroll', fitViewport)
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      viewport?.removeEventListener('resize', fitViewport)
      viewport?.removeEventListener('scroll', fitViewport)
      element.close()
      document.body.style.overflow = overflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [visible])

  useEffect(() => {
    if (visible && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight
  }, [visible, turns, pendingId])

  async function send(turn: Turn) {
    if (sending.current || guest || !online) return
    sending.current = true
    setPendingId(turn.id)
    setTurns((current) => current.map((entry) => entry.id === turn.id ? turn : entry))
    try {
      const response = await (turn.request.mode === 'beta'
        ? aiApi.sampleTutor(turn.request.input) : aiApi.tutor(turn.request.input))
      setTurns((current) => current.map((entry) => entry.id === turn.id ? { ...turn, response } : entry))
    } catch (error) {
      setTurns((current) => current.map((entry) => entry.id === turn.id ? { ...turn, failure: { error } } : entry))
    } finally {
      sending.current = false
      setPendingId(undefined)
    }
  }

  function ask() {
    if (sending.current || guest || !online) return
    let thread = turns
    let request: TutorRequest
    let question: string
    if (betaEnabled) {
      if (!sample || !prompt) return
      setSampleId(sample.id)
      question = prompt.question
      const previousPromptIds = thread.flatMap((entry) =>
        entry.response && entry.request.mode === 'beta' && entry.request.input.sampleId === sample.id
          ? [entry.request.input.promptId] : []).slice(-historyLimit)
      request = { mode: 'beta', input: { sampleId: sample.id, promptId: prompt.id, ...(previousPromptIds.length ? { previousPromptIds } : {}) } }
      const next = sample.prompts.find((item) => item.id !== prompt.id && !previousPromptIds.includes(item.id))
      if (next) setPromptId(next.id)
    } else {
      question = draft.trim()
      if (!question || question.length > questionLimit) return
      const sourceText = source.text.trim() || undefined
      const sourceTitle = sourceText ? source.title.trim() || undefined : undefined
      const previous = thread.at(-1)?.request
      if (previous?.mode === 'standard' && (previous.input.sourceText !== sourceText || previous.input.sourceTitle !== sourceTitle)) {
        thread = []
      }
      const history = thread.flatMap((entry) => entry.response
        ? [{ question: entry.question, answer: entry.response.answer.slice(0, questionLimit) }] : []).slice(-historyLimit)
      request = { mode: 'standard', input: { question, sourceText, sourceTitle, ...(history.length ? { history } : {}) } }
      setDraft('')
    }
    const turn: Turn = { id: nextId.current++, question, request }
    setTurns([...thread, turn])
    void send(turn)
  }

  function clear() {
    if (sending.current) return
    setTurns([])
    setDraft('')
    setSource(emptySource)
    setSourceOpen(false)
    setTruncated(false)
    setPromptId('')
  }

  return (
    <dialog ref={dialog} className="tutor-dialog" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); setOpen(false) }}>
      {visible && <>
        <header className="tutor-heading">
          <Mascot species={buddy} size={36} />
          <h2 id={titleId}>{t('beta.tutor')}</h2>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={clear}>{t('pet.newChat')}</Button>
          <Button type="button" size="sm" variant="ghost" aria-label={t('common.close')} onClick={() => setOpen(false)}><Icon name="close" size={19} /></Button>
        </header>
        <div className="tutor-scroll" ref={transcript}>
          <div className="tutor-intro">
            {!turns.length && <p>{t(betaEnabled ? 'pet.betaWelcome' : 'pet.greeting')}</p>}
            <p className="study-muted">{t(betaEnabled ? 'beta.aiDisclosure' : 'pet.disclosure')}</p>
            {guest && <p role="status">{t('pet.guestNotice')}</p>}
          </div>
          {betaEnabled && !guest && (
            <div className="tutor-sources">
              <label>{t('beta.sample')}
                <select value={sample?.id ?? ''} disabled={pending || !sample} onChange={(event) => {
                  setSampleId(event.target.value)
                  setPromptId('')
                  setTurns([])
                }}>
                  {!sample && <option value="">{t(query.isError ? 'beta.samplesError' : 'common.loading')}</option>}
                  {samples.map((item) => <option key={item.id} value={item.id} lang={item.language}>{item.title}</option>)}
                </select>
              </label>
              {query.isError && <Button size="sm" variant="secondary" disabled={!online} onClick={() => void query.refetch()}>{t('beta.retry')}</Button>}
              {sample && <details><summary>{t('pet.viewSource')}</summary><p lang={sample.language}>{sample.text}</p></details>}
            </div>
          )}
          <div className="tutor-thread" role="log" aria-label={t('pet.conversation')} aria-live="polite">
            {turns.map((turn) => {
              const error = turn.failure?.error
              const code = error instanceof ApiError ? error.code : ''
              const canRetry = !['AI_LIMIT_REACHED', 'AI_NOT_CONFIGURED', 'AI_PROVIDER_ACCESS_DENIED'].includes(code)
              return <div className="tutor-turn" key={turn.id} lang={betaEnabled ? sample?.language : undefined}>
                <div className="tutor-question">{turn.question}</div>
                {turn.response && <div className="tutor-answer">
                  <p>{turn.response.answer}</p>
                  {turn.response.references.length > 0 && <details>
                    <summary>{t('pet.references', { count: turn.response.references.length })}</summary>
                    {turn.response.references.map((reference) => <blockquote key={reference.excerpt}>
                      <p>{reference.excerpt}</p><cite>{reference.title}</cite>
                    </blockquote>)}
                  </details>}
                </div>}
                {turn.failure && <div className="tutor-error" role="alert">
                  <p>{aiErrorMessage(t, error, t('pet.requestError'))}</p>
                  {canRetry && <Button type="button" size="sm" variant="secondary" disabled={!online || pending}
                    onClick={() => void send({ ...turn, failure: undefined })}>{t('pet.retry')}</Button>}
                </div>}
                {pendingId === turn.id && <p className="study-muted" role="status">{t('pet.thinking')}</p>}
              </div>
            })}
          </div>
        </div>
        <div className="tutor-footer">
          {!online && <p role="status">{t('pet.offlineNotice')}</p>}
          {betaEnabled ? <form onSubmit={(event) => { event.preventDefault(); ask() }}>
            {sample && <label className="tutor-prompt">{t(turns.some((turn) => turn.response) ? 'pet.followUp' : 'beta.prompt')}
              <select value={prompt?.id ?? ''} disabled={pending} lang={sample.language} onChange={(event) => setPromptId(event.target.value)}>
                {sample.prompts.map((item) => <option key={item.id} value={item.id}>{item.question}</option>)}
              </select>
            </label>}
            <Button type="submit" disabled={!sample || !prompt || !online || pending || guest}>{t('beta.askTutor')}</Button>
          </form> : <>
            {sourceOpen && <div className="tutor-source-editor">
              <input aria-label={t('pet.sourceTitleLabel')} value={source.title} maxLength={200} placeholder={t('decks.sourceTitlePlaceholder')}
                onChange={(event) => setSource({ ...source, title: event.target.value })} />
              <textarea aria-label={t('pet.sourceLabel')} value={source.text} maxLength={MAX_TUTOR_SOURCE} rows={3}
                placeholder={t('pet.sourcePlaceholder')} onChange={(event) => { setSource({ ...source, text: event.target.value }); setTruncated(false) }} />
              {truncated && <p role="status">{t('pet.truncated', { max: MAX_TUTOR_SOURCE })}</p>}
              {!!turns.length && <p className="study-muted">{t('pet.sourceThread')}</p>}
              <Button type="button" size="sm" variant="ghost" onClick={() => { setSource(emptySource); setSourceOpen(false); setTruncated(false) }}>
                {t('pet.removeSource')}
              </Button>
            </div>}
            <div className="tutor-tools">
              <button type="button" className="study-text-link" aria-expanded={sourceOpen} disabled={guest}
                onClick={() => setSourceOpen(!sourceOpen)}><Icon name="book" size={16} />{source.text.trim() ? t('pet.attached', { title: source.title || t('pet.sourceLabel') }) : t('pet.sourceToggle')}</button>
              {!turns.length && (['explain', 'summarize', 'practice', 'hint'] as const).map((action) => (
                <button type="button" className="tutor-chip" disabled={guest || pending} key={action}
                  onClick={() => { setDraft(t(`pet.prompts.${action}`)); composer.current?.focus() }}>{t(`pet.actions.${action}`)}</button>
              ))}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); ask() }}>
              <textarea ref={composer} aria-label={t('pet.placeholder')} value={draft} maxLength={questionLimit}
                rows={2} disabled={guest} placeholder={t('pet.placeholder')} onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask() }
                }} />
              <Button type="submit" disabled={!draft.trim() || pending || guest || !online}>{t('pet.send')}</Button>
            </form>
          </>}
        </div>
      </>}
    </dialog>
  )
}
