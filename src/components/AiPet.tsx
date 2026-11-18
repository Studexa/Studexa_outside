import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Mascot } from './Mascot'
import { Icon } from './Icon'
import { aiApi, type AiTutorInput } from '../lib/api'
import { ApiError } from '../lib/api/client'
import { isGuestMode, useAuth } from '../lib/auth'
import { useApp } from '../lib/store'
import { MAX_TUTOR_SOURCE, STUDY_SOURCE_EVENT, type StudySource } from '../lib/aiStudy'

type Message = { role: 'pet' | 'user'; text: string; references?: { title: string; excerpt: string }[] }

export function AiPet() {
  const user = useAuth((state) => state.user)
  return <StudyBuddy key={user?.id ?? 'guest'} />
}

function StudyBuddy() {
  const { t } = useTranslation()
  const buddy = useApp((s) => s.buddy)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [truncated, setTruncated] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const sending = useRef(false)
  const guest = isGuestMode()
  const tutor = useMutation({
    mutationFn: (input: AiTutorInput) => aiApi.tutor(input),
    retry: false,
    onSuccess: (data) => setMessages((current) => [...current, { role: 'pet', text: data.answer, references: data.references }]),
    onSettled: () => { sending.current = false },
  })
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine)
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    return () => { window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity) }
  }, [])
  useEffect(() => {
    const attach = (event: Event) => {
      const source = (event as CustomEvent<StudySource>).detail
      setSourceTitle(source.title.slice(0, 200))
      setSourceText(source.text.slice(0, MAX_TUTOR_SOURCE))
      setTruncated(source.text.length > MAX_TUTOR_SOURCE)
      setSourceOpen(true)
      setOpen(true)
    }
    window.addEventListener(STUDY_SOURCE_EVENT, attach)
    return () => window.removeEventListener(STUDY_SOURCE_EVENT, attach)
  }, [])
  useEffect(() => { if (open) questionRef.current?.focus() }, [open])
  useEffect(() => { if (open) endRef.current?.scrollIntoView?.({ behavior: 'auto' }) }, [messages, open, tutor.isPending])
  const close = () => { setOpen(false); window.setTimeout(() => launcherRef.current?.focus(), 0) }
  const ask = () => {
    const text = question.trim()
    if (!text || text.length > 1200 || sending.current || guest || !online) return
    sending.current = true
    setMessages((current) => [...current, { role: 'user', text }])
    setQuestion('')
    tutor.mutate({ question: text, sourceText: sourceText.trim() || undefined, sourceTitle: sourceTitle.trim() || undefined })
  }
  const retry = () => {
    if (!tutor.variables || sending.current || guest || !online) return
    sending.current = true
    tutor.mutate(tutor.variables) // Preserve the failed request's source snapshot.
  }
  const clear = () => {
    if (sending.current) return
    setMessages([]); setQuestion(''); setSourceTitle(''); setSourceText(''); setTruncated(false)
    tutor.reset()
    questionRef.current?.focus()
  }
  const code = tutor.error instanceof ApiError ? tutor.error.code : ''
  const errorKey = code === 'AI_LIMIT_REACHED' ? 'limitError' : code === 'AI_NOT_CONFIGURED' ? 'setupError'
    : code === 'AI_TIMEOUT' ? 'timeoutError' : code === 'AI_INVALID_RESPONSE' ? 'outputError' : 'requestError'
  const iconButton = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:brightness-95 disabled:opacity-40'

  return <>
    {!open && <button ref={launcherRef} onClick={() => setOpen(true)} aria-label={t('pet.open')} className="study-header-action">
      <Icon name="sparkles" size={19} /><span className="hidden sm:inline">{t('pet.button')}</span>
    </button>}
    {open && <section aria-label={t('pet.title')} onKeyDown={(event) => { if (event.key === 'Escape') close() }}
      className={`fixed bottom-[72px] right-3 z-50 flex w-[calc(100%-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lift)] md:bottom-6 md:right-6 ${expanded ? 'h-[80dvh]' : 'h-[65dvh]'} max-h-[calc(100dvh-100px)]`}>
      <header className="flex items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-primary-soft)] p-3">
        <Mascot species={buddy} mood="happy" size={36} />
        <div className="min-w-0 flex-1"><h2 className="text-sm font-black">{t('pet.title')}</h2><p className="text-xs text-[var(--color-muted)]">{t('pet.subtitle')}</p></div>
        <button className={iconButton} disabled={tutor.isPending} onClick={clear} aria-label={t('pet.clear')}><Icon name="reset" size={18} /></button>
        <button className={iconButton} onClick={() => setExpanded(!expanded)} aria-label={expanded ? t('common.collapse') : t('common.expand')}><Icon name={expanded ? 'minimize' : 'maximize'} size={18} /></button>
        <button className={iconButton} onClick={close} aria-label={t('common.close')}><Icon name="close" size={18} /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <p className="rounded-2xl bg-[var(--color-surface-alt)] p-3 text-sm leading-relaxed">{t('pet.greeting')}</p>
        <p className="text-xs leading-relaxed text-[var(--color-muted)]">{t('pet.disclosure')}</p>
        <div className="flex flex-wrap gap-2" aria-label={t('pet.studyActions')}>
          {(['explain', 'summarize', 'practice', 'hint'] as const).map((action) => <button key={action} disabled={guest || tutor.isPending} onClick={() => { setQuestion(t(`pet.prompts.${action}`)); questionRef.current?.focus() }}
            className="min-h-11 rounded-xl border border-[var(--color-border)] px-3 text-xs font-bold text-[var(--color-primary)] disabled:opacity-40">{t(`pet.actions.${action}`)}</button>)}
        </div>
        <div role="log" aria-label={t('pet.conversation')} aria-live="polite" aria-relevant="additions" className="space-y-3">
          {messages.map((message, index) => <div key={index} className={`max-w-[94%] rounded-2xl p-3 text-sm leading-relaxed ${message.role === 'user' ? 'ml-auto bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)]'}`}>
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
            {!!message.references?.length && <details className="mt-3 rounded-xl bg-[var(--color-surface)] p-2 text-[var(--color-text)]">
              <summary className="cursor-pointer text-xs font-bold">{t('pet.references', { count: message.references.length })}</summary>
              {message.references.map((reference, index) => <blockquote key={index} className="mt-2 border-l-2 border-[var(--color-primary)] pl-2 text-xs"><p className="font-bold">{reference.title}</p><p className="whitespace-pre-wrap">{reference.excerpt}</p></blockquote>)}
            </details>}
          </div>)}
        </div>
        {tutor.isPending && <p role="status" className="text-sm text-[var(--color-muted)]">{t('pet.thinking')}</p>}
        {tutor.isError && <div role="alert" className="rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">
          <p>{t(`pet.${errorKey}`)}</p>
          {!['AI_LIMIT_REACHED', 'AI_NOT_CONFIGURED'].includes(code) && <button className="mt-2 min-h-11 underline" onClick={retry} disabled={!online || guest}>{t('pet.retry')}</button>}
        </div>}
        {guest && <p role="status" className="text-sm text-[var(--color-muted)]">{t('pet.guestNotice')}</p>}
        {!online && <p role="status" className="text-sm text-[var(--color-muted)]">{t('pet.offlineNotice')}</p>}
        <div ref={endRef} />
      </div>
      <div className="max-h-[45%] overflow-y-auto border-t border-[var(--color-border)] p-3">
        <button onClick={() => setSourceOpen(!sourceOpen)} aria-expanded={sourceOpen} className="mb-2 flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--color-primary)]"><Icon name="book" size={16} />{sourceText.trim() ? t('pet.attached', { title: sourceTitle || t('pet.sourceLabel') }) : t('pet.sourceToggle')}</button>
        {sourceOpen && <div className="mb-3 space-y-2">
          <input aria-label={t('pet.sourceTitleLabel')} value={sourceTitle} maxLength={200} onChange={(event) => setSourceTitle(event.target.value)} placeholder={t('decks.sourceTitlePlaceholder')} className="w-full rounded-xl p-2 text-sm" />
          <textarea aria-label={t('pet.sourceLabel')} value={sourceText} maxLength={MAX_TUTOR_SOURCE} onChange={(event) => { setSourceText(event.target.value); setTruncated(false) }} rows={3} placeholder={t('pet.sourcePlaceholder')} className="w-full rounded-xl p-2 text-sm" />
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-muted)]"><span>{t('pet.sourceCount', { count: sourceText.length, max: MAX_TUTOR_SOURCE })}</span><button className="min-h-11 underline" onClick={() => { setSourceText(''); setSourceTitle(''); setTruncated(false) }}>{t('pet.removeSource')}</button></div>
          {truncated && <p role="status" className="text-xs text-[var(--color-muted)]">{t('pet.truncated', { max: MAX_TUTOR_SOURCE })}</p>}
        </div>}
        <form onSubmit={(event) => { event.preventDefault(); ask() }} className="flex items-end gap-2">
          <textarea ref={questionRef} aria-label={t('pet.placeholder')} value={question} maxLength={1200} rows={2} disabled={guest}
            onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask() } }}
            placeholder={t('pet.placeholder')} className="min-w-0 flex-1 resize-none rounded-xl p-3 text-sm" />
          <button type="submit" disabled={!question.trim() || tutor.isPending || guest || !online} aria-label={t('pet.send')} className={`${iconButton} bg-[var(--color-primary)] text-white`}><Icon name="arrowRight" size={18} /></button>
        </form>
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">{t('pet.independentQuestions')}</p>
      </div>
    </section>}
  </>
}
