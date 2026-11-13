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
          className="fixed bottom-20 right-3 z-40 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-1 pr-3 text-left shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 md:bottom-6 md:right-6"
          aria-label={t('pet.open')}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)]">
            <Mascot species={buddy} mood="happy" size={46} />
          </span>
          <span className="hidden text-xs font-black text-[var(--color-primary)] sm:block">{t('pet.button')}</span>
        </button>
      )}

      {open && (
        <section
          className="fixed inset-x-3 bottom-20 z-50 flex max-h-[72dvh] flex-col overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lift)] md:inset-x-auto md:bottom-24 md:right-6 md:w-[390px]"
          aria-label={t('pet.title')}
        >
          <header className="flex items-center gap-2 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary-soft)] to-[var(--color-surface)] p-3">
            <Mascot species={buddy} mood="happy" size={52} />
            <div className="min-w-0 flex-1">
              <p className="font-black">{t('pet.title')}</p>
              <p className="truncate text-[11px] font-semibold text-[var(--color-muted)]">{t('pet.subtitle')}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]"
              aria-label={t('common.close')}
            >
              <Icon name="close" size={18} />
            </button>
          </header>

          <div className="min-h-40 flex-1 space-y-2 overflow-y-auto p-3">
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[var(--color-surface-alt)] px-3 py-2 text-sm font-semibold">
              {t('pet.greeting')}
            </div>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm font-semibold ${
                  message.role === 'user'
                    ? 'ml-auto rounded-tr-md bg-[var(--color-primary)] text-white'
                    : 'rounded-tl-md bg-[var(--color-surface-alt)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.references && message.references.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {message.references.map((reference, refIndex) => (
                      <div key={`${reference.title}-${refIndex}`} className="rounded-xl bg-[var(--color-surface)] p-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-[var(--color-primary)]">
                          {reference.title}
                        </p>
                        <p className="mt-0.5 text-[11px] italic text-[var(--color-muted)]">“{reference.excerpt}”</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {tutor.isPending && (
              <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[var(--color-surface-alt)] px-3 py-2 text-sm font-semibold">
                <span className="inline-flex items-center gap-2 text-[var(--color-muted)]">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('pet.thinking')}
                </span>
              </div>
            )}
            {tutor.isError && (
              <p className="rounded-2xl bg-[var(--color-danger-soft)] px-3 py-2 text-xs font-bold text-[var(--color-danger)]">
                {tutor.error.message}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[var(--color-border)] p-3">
            <button
              onClick={() => setSourceOpen((value) => !value)}
              className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)]"
              aria-expanded={sourceOpen}
            >
              <Icon name="book" size={13} /> {t('pet.sourceToggle')}
            </button>
            {sourceOpen && (
              <div className="mb-2 space-y-2">
                <input
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder={t('decks.sourceTitlePlaceholder')}
                  className="w-full rounded-xl px-3 py-2 text-xs"
                />
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={3}
                  placeholder={t('pet.sourcePlaceholder')}
                  className="w-full resize-none rounded-xl px-3 py-2 text-xs"
                />
              </div>
            )}
            <div className="flex items-end gap-2">
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
                className="min-h-11 flex-1 resize-none rounded-2xl px-3 py-2.5 text-sm"
              />
              <button
                onClick={ask}
                disabled={!question.trim() || tutor.isPending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white disabled:opacity-40"
                aria-label={t('pet.send')}
              >
                <Icon name="arrowRight" size={18} />
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
