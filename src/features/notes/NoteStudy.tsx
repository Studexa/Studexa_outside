import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { ApiError, aiApi, cardsApi, noteAttachmentsApi, type AiCardItem, type NoteAttachment } from '../../lib/api'
import { aiErrorMessage } from '../../lib/aiErrors'
import { studyKeys, useDecks } from '../../lib/study'

export type NoteStudySource =
  | { kind: 'note' | 'selection'; title: string; text: string }
  | { kind: 'attachment'; file: NoteAttachment }

type Props = {
  noteId: string
  userId: string
  source: NoteStudySource
  onClose: () => void
  onInsertSummary: (text: string) => void
  onCardsSaved: (count: number) => void
}

type Draft = AiCardItem & { selected: boolean }

function excerpts(text: string, limit: number) {
  const parts: string[] = []
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + limit, text.length)
    if (end < text.length) {
      const newline = text.lastIndexOf('\n', end - 1)
      if (newline - start >= limit / 2) end = newline + 1
      if (/[\uD800-\uDBFF]/u.test(text.charAt(end - 1))) end -= 1
    }
    const part = text.slice(start, end).trim()
    if (part) parts.push(part)
    start = end
  }
  return parts
}

export function NoteStudy({ noteId, userId, source, onClose, onInsertSummary, onCardsSaved }: Props) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [deckId, setDeckId] = useState('')
  const [summary, setSummary] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [result, setResult] = useState<'summary' | 'cards'>()

  const limits = useQuery({ queryKey: ['ai-source-limit', userId], queryFn: aiApi.sourceLimit, retry: false })
  const attachmentId = source.kind === 'attachment' ? source.file.id : undefined
  const attachmentText = useQuery({
    queryKey: ['note-attachment-text', userId, noteId, attachmentId],
    queryFn: () => attachmentId ? noteAttachmentsApi.text(noteId, attachmentId) : Promise.resolve({ text: '' }),
    enabled: !!attachmentId, retry: false, gcTime: 0,
  })
  const decks = useDecks()
  const activeDeckId = decks.data?.some((deck) => deck.id === deckId) ? deckId : decks.data?.[0]?.id ?? ''
  const text = source.kind === 'attachment' ? attachmentText.data?.text ?? '' : source.text
  const title = source.kind === 'attachment' ? source.file.filename : source.title
  const sourceTitle = (title.trim() || t('notes.untitled')).slice(0, 200).replace(/[\uD800-\uDBFF]$/u, '')
  const sourceLabel = source.kind === 'attachment' ? sourceTitle : t(`notes.study.${source.kind}`)
  const limit = limits.data?.maxSourceChars ?? 0
  const chunks = useMemo(() => limit >= 2 ? excerpts(text, limit) : [], [text, limit])
  const sourceText = chunks[index] ?? ''
  const language = i18n.resolvedLanguage === 'km' ? 'km' : 'en'

  const summarize = useMutation({
    mutationFn: () => aiApi.tutor({ question: t('notes.study.summaryPrompt'), sourceText, sourceTitle }),
    onSuccess: ({ answer }) => { setSummary(answer); setResult('summary') },
  })

  const generate = useMutation({
    mutationFn: () => aiApi.generate({ task: 'FLASHCARDS', basicOnly: true, count: 5, language, sourceText, sourceTitle }),
    onSuccess: ({ items }) => { setDrafts(items.map((item) => ({ ...item, selected: true }))); setResult('cards') },
  })

  const selected = drafts.filter((item) => item.selected)
  const save = useMutation({
    mutationFn: () => cardsApi.bulk(activeDeckId, selected.map((item) => ({
      type: 'BASIC', front: item.front.trim(), back: item.back.trim(),
      sourceTitle: item.sourceTitle ?? undefined, sourceExcerpt: item.sourceExcerpt ?? undefined,
    }))),
    onSuccess: (cards) => {
      void queryClient.invalidateQueries({ queryKey: studyKeys.decks(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.due(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.reviewQueue(userId) })
      onCardsSaved(cards.length)
    },
  })

  const generating = summarize.isPending || generate.isPending
  const busy = generating || save.isPending
  const error = summarize.error ?? generate.error
  const aiError = error instanceof ApiError && error.status === 429 ? 'quota'
    : error instanceof ApiError && error.status === 503 ? 'unavailable' : 'generateFailed'

  const resetResults = () => {
    summarize.reset()
    generate.reset()
    save.reset()
    setResult(undefined)
    setSummary('')
    setDrafts([])
  }

  const editDraft = (index: number, patch: Partial<Draft>) => {
    setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, ...patch } : draft))
  }

  return (
    <Modal open fitViewport title={t('notes.study.title')} onClose={() => { if (!busy) onClose() }}>
      <div className="space-y-4">
        {(limits.isPending || (!!attachmentId && attachmentText.isPending)) && (
          <p role="status" className="text-sm text-[var(--color-muted)]">{t('notes.study.loadingSource')}</p>
        )}
        {(limits.isError || attachmentText.isError) && <div className="flex flex-wrap items-center gap-2 text-sm" role="alert">
          {t('notes.study.sourceFailed')}
          <Button variant="secondary" size="sm" onClick={() => {
            if (limits.isError) void limits.refetch()
            if (attachmentText.isError) void attachmentText.refetch()
          }}>{t('common.retry')}</Button>
        </div>}
        {limits.isSuccess && (!attachmentId || attachmentText.isSuccess) && !sourceText && (
          <p className="text-sm text-[var(--color-muted)]">{t('notes.study.emptySource')}</p>
        )}
        {sourceText && <>
          <label className="block space-y-1 text-sm font-bold">
            <span className="[overflow-wrap:anywhere]">{t('notes.study.source', { source: sourceLabel })}</span>
            <textarea className="w-full rounded-2xl p-3 text-sm font-normal" rows={5} readOnly value={sourceText} />
          </label>
          {chunks.length > 1 && <div className="flex flex-wrap items-center justify-between gap-2">
            <Button size="sm" variant="secondary" disabled={!index || busy || !!result}
              onClick={() => { resetResults(); setIndex(index - 1) }} aria-label={t('notes.study.previousExcerpt')}>
              <Icon name="chevronLeft" size={16} />
            </Button>
            <span className="text-sm" aria-live="polite">{t('notes.study.excerpt', { position: index + 1, total: chunks.length })}</span>
            <Button size="sm" variant="secondary" disabled={index >= chunks.length - 1 || busy || !!result}
              onClick={() => { resetResults(); setIndex(index + 1) }} aria-label={t('notes.study.nextExcerpt')}>
              <Icon name="chevronRight" size={16} />
            </Button>
          </div>}
          {!result && <>
            <p className="text-xs text-[var(--color-muted)]">{t('notes.study.aiDisclosure')}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => { resetResults(); summarize.mutate() }}>
                <Icon name="sparkles" size={16} />{t('notes.study.summarize')}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => { resetResults(); generate.mutate() }}>
                <Icon name="cards" size={16} />{t('notes.study.generateCards')}
              </Button>
            </div>
          </>}
        </>}
        {generating && <p role="status" className="text-sm">{t('notes.study.generating')}</p>}
        {error && <p role="alert" className="text-sm text-[var(--color-danger-text)]">{aiErrorMessage(t, error, t(`notes.study.${aiError}`))}</p>}
        {result === 'summary' && <section className="space-y-3">
          <h4 className="font-bold">{t('notes.study.summary')}</h4>
          <p className="whitespace-pre-wrap rounded-2xl bg-[var(--color-surface-alt)] p-3 text-sm [overflow-wrap:anywhere]">{summary}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onInsertSummary(summary)}>{t('notes.study.insertSummary')}</Button>
            <Button variant="ghost" onClick={resetResults}>{t('notes.study.backToSource')}</Button>
          </div>
        </section>}
        {result === 'cards' && <section className="space-y-3">
          <h4 className="font-bold">{t('notes.study.reviewCards')}</h4>
          {drafts.map((draft, position) => <fieldset key={position} disabled={save.isPending}
            className="space-y-2 rounded-2xl border border-[var(--color-border)] p-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={draft.selected} onChange={(event) => editDraft(position, { selected: event.target.checked })} />
              {t('notes.study.includeCard', { position: position + 1 })}
            </label>
            {(['front', 'back'] as const).map((side) => <label key={side} className="block space-y-1 text-sm font-semibold">
              <span>{t(`notes.study.${side}`)}</span>
              <textarea className="w-full rounded-xl p-2 font-normal" rows={2} maxLength={5000} value={draft[side]}
                onChange={(event) => editDraft(position, { [side]: event.target.value })} />
            </label>)}
          </fieldset>)}
          {decks.isPending && <p role="status" className="text-sm">{t('notes.study.loadingDecks')}</p>}
          {decks.isError && <div className="flex items-center gap-2 text-sm" role="alert">
            {t('notes.study.decksFailed')}
            <Button variant="secondary" size="sm" onClick={() => void decks.refetch()}>{t('common.retry')}</Button>
          </div>}
          {decks.isSuccess && !activeDeckId && <p className="text-sm text-[var(--color-muted)]">
            {t('notes.study.noDeck')} <Link className="font-bold underline" to="/study/decks" target="_blank" rel="noopener">{t('notes.study.openDecks')}</Link>
            {' '}<button type="button" className="font-bold underline" onClick={() => void decks.refetch()}>{t('notes.study.refreshDecks')}</button>
          </p>}
          {activeDeckId && <label className="block space-y-1 text-sm font-bold">
            <span>{t('notes.chooseDeck')}</span>
            <select value={activeDeckId} onChange={(event) => setDeckId(event.target.value)} disabled={save.isPending}
              className="w-full rounded-2xl p-2.5">
              {decks.data?.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}
            </select>
          </label>}
          {save.isError && <p role="alert" className="text-sm text-[var(--color-danger-text)]">{t('notes.study.saveFailed')}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={save.isPending || !activeDeckId || !selected.length || selected.some((item) => !item.front.trim() || !item.back.trim())}
              onClick={() => save.mutate()}>
              {save.isPending ? t('notes.saving') : t('notes.study.saveCards', { count: selected.length })}
            </Button>
            <Button variant="ghost" disabled={save.isPending} onClick={resetResults}>{t('notes.study.backToSource')}</Button>
          </div>
        </section>}
      </div>
    </Modal>
  )
}
