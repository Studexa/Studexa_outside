import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Mascot } from './Mascot'
import { Icon } from './Icon'
import { aiApi } from '../lib/api'
import { useApp } from '../lib/store'

type ChatMessage = {
  role: 'pet' | 'user'
  text: string
  references?: { title: string; excerpt: string }[]
}

export function AiPet() {
  const { t } = useTranslation()
  const buddy = useApp((s) => s.buddy)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const endRef = useRef<HTMLDivElement | null>(null)

  const tutor = useMutation({
    mutationFn: (text: string) =>
      aiApi.tutor({
        question: text,
        sourceText: sourceText.trim() || undefined,
        sourceTitle: sourceTitle.trim() || undefined,
      }),
    onSuccess: (data) => {
      setMessages((current) => [
        ...current,
        { role: 'pet', text: data.answer, references: data.references },
      ])
    },
  })

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, tutor.isPending])

  const ask = () => {
    const text = question.trim()
    if (!text || tutor.isPending) return
    setMessages((current) => [...current, { role: 'user', text }])
    setQuestion('')
    tutor.mutate(text)
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-3 z-40 flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-left shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3.5 md:bottom-6 md:right-6"
          aria-label={t('pet.open')}
        >
          <span className="flex h-12 w-12 shrink-0 aspect-square items-center justify-center rounded-full bg-[var(--color-primary-soft)] overflow-hidden">
            <Mascot species={buddy} mood="happy" size={46} />
          </span>
          <span className="hidden text-xs font-black text-[var(--color-primary)] sm:block">{t('pet.button')}</span>
        </button>
      )}

      {open && (
        <section
          className={`fixed right-3 bottom-[72px] z-50 flex flex-col overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lift)] transition-all duration-200 w-[84%] max-w-[340px] sm:bottom-20 sm:right-4 sm:w-[390px] sm:max-w-none md:bottom-24 md:right-6 ${
            expanded
              ? 'h-[75dvh] max-h-[75dvh]'
              : 'h-[48dvh] max-h-[48dvh] sm:h-[50dvh] sm:max-h-[50dvh]'
          }`}
          aria-label={t('pet.title')}
        >
          <header className="flex items-center gap-2 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary-soft)] to-[var(--color-surface)] px-3 py-2 sm:p-3">
            <span className="shrink-0 sm:hidden">
              <Mascot species={buddy} mood="happy" size={36} />
            </span>
            <span className="hidden shrink-0 sm:inline-block">
              <Mascot species={buddy} mood="happy" size={48} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-xs sm:text-base leading-tight">{t('pet.title')}</p>
              <p className="truncate text-[10px] font-semibold text-[var(--color-muted)] sm:text-[11px]">{t('pet.subtitle')}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition sm:h-10 sm:w-10"
                aria-label={expanded ? t('common.collapse') : t('common.expand')}
                title={expanded ? t('common.collapse') : t('common.expand')}
              >
                <Icon name={expanded ? 'minimize' : 'maximize'} size={15} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition sm:h-10 sm:w-10"
                aria-label={t('common.close')}
                title={t('common.close')}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 py-2 sm:p-3">
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs font-semibold sm:py-2 sm:text-sm">
              {t('pet.greeting')}
            </div>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-xs font-semibold sm:py-2 sm:text-sm ${
                  message.role === 'user'
                    ? 'ml-auto rounded-tr-md bg-[var(--color-primary)] text-white'
                    : 'rounded-tl-md bg-[var(--color-surface-alt)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.references && message.references.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {message.references.map((reference, refIndex) => (
                      <div key={`${reference.title}-${refIndex}`} className="rounded-xl bg-[var(--color-surface)] p-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-[var(--color-primary)]">
                          {reference.title}
                        </p>
                        <p className="mt-0.5 text-[10px] italic text-[var(--color-muted)]">“{reference.excerpt}”</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {tutor.isPending && (
              <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs font-semibold sm:py-2 sm:text-sm">
                <span className="inline-flex items-center gap-1.5 text-[var(--color-muted)]">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('pet.thinking')}
                </span>
              </div>
            )}
            {tutor.isError && (
              <p className="rounded-2xl bg-[var(--color-danger-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-danger)]">
                {tutor.error.message}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[var(--color-border)] p-2">
            {sourceOpen && (
              <div className="mb-2 space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-primary)]">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="book" size={12} /> {t('pet.sourceToggle')}
                  </span>
                  <button
                    onClick={() => setSourceOpen(false)}
                    className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-muted)] hover:text-[var(--color-text)]"
                  >
                    <Icon name="close" size={11} />
                  </button>
                </div>
                <input
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder={t('decks.sourceTitlePlaceholder')}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] placeholder:text-[10px] shadow-sm transition-all focus:border-[var(--color-primary)]"
                />
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={2}
                  placeholder={t('pet.sourcePlaceholder')}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] placeholder:text-[10px] shadow-sm transition-all focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            <div className="flex items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm transition-all focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-ring)]">
              <button
                type="button"
                onClick={() => setSourceOpen((v) => !v)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition ${
                  sourceOpen || sourceText.trim()
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'
                }`}
                title={t('pet.sourceToggle')}
                aria-label={t('pet.sourceToggle')}
              >
                <Icon name="book" size={13} />
              </button>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask()
                  }
                }}
                rows={1}
                placeholder={t('pet.placeholder')}
                className="max-h-20 min-h-[28px] h-7 flex-1 resize-none border-0 bg-transparent px-2 py-[5px] text-[11px] leading-[18px] text-left text-[var(--color-text)] placeholder:text-[11px] placeholder:text-[var(--color-muted)]/70 focus:outline-none focus:ring-0"
              />

              <button
                type="button"
                onClick={ask}
                disabled={!question.trim() || tutor.isPending}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all ${
                  question.trim() && !tutor.isPending
                    ? 'bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-strong)] active:scale-95'
                    : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]/40 cursor-not-allowed'
                }`}
                aria-label={t('pet.send')}
              >
                <Icon name="arrowRight" size={13} />
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
