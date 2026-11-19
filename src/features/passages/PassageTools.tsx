import { useEffect, useId, useState, type CSSProperties, type RefObject } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { cardsApi } from '../../lib/api'
import type { Reading } from '../../lib/api/readings'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useApp } from '../../lib/store'
import { studyKeys, useDecks } from '../../lib/study'
import { PassageQuestion } from './PassageQuestion'
import { usePassageSelection, type Passage } from './passageSelection'

type Props = { source: RefObject<HTMLElement | null>; title: string; reading?: Reading }
type Draft = { front: string; back: string; deckId: string; excerpt: string }
const cardLimit = 5000

function truncate(text: string, length: number) {
  return text.slice(0, length).replace(/[\uD800-\uDBFF]$/u, '')
}

export function PassageTools({ source, title, reading }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const queryClient = useQueryClient()
  const userId = useAuth((state) => state.user?.id)
  const [question, setQuestion] = useState<Passage>()
  const [draft, setDraft] = useState<Draft>()
  const [picking, setPicking] = useState(false)
  const [saved, setSaved] = useState(false)
  const { selection, clear } = usePassageSelection(source, reading)
  const decks = useDecks(!!draft)
  const deckId = draft?.deckId || decks.data?.[0]?.id || ''
  const tooLong = !!draft && (draft.front.trim().length > cardLimit || draft.back.trim().length > cardLimit)

  useEffect(() => {
    if (!saved) return
    const timeout = window.setTimeout(() => setSaved(false), 3500)
    return () => window.clearTimeout(timeout)
  }, [saved])
  const save = useMutation({
    mutationFn: async (card: Draft) => {
      const front = card.front.trim()
      const back = card.back.trim()
      if (isGuestMode()) {
        useApp.getState().addCard(card.deckId, front, back)
      } else {
        await cardsApi.create(card.deckId, { type: 'BASIC', front, back,
          sourceTitle: truncate(title.trim(), 200) || undefined, sourceExcerpt: truncate(card.excerpt, 1000) })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studyKeys.decks(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.due(userId) })
      void queryClient.invalidateQueries({ queryKey: studyKeys.reviewQueue(userId) })
      setDraft(undefined)
      setSaved(true)
    },
  })

  const startCard = (passage: Passage) => {
    save.reset()
    setSaved(false)
    setDraft({ front: passage.text, back: '', deckId: '', excerpt: passage.text })
    clear()
  }
  const startPicking = () => {
    if (!draft) return
    setDraft({ ...draft, deckId })
    clear()
    setPicking(true)
    requestAnimationFrame(() => {
      const root = source.current
      const editor = root?.querySelector<HTMLElement>('[contenteditable=true]')
      const focusTarget = editor ?? root
      focusTarget?.focus({ preventScroll: true })
    })
  }
  const finishPicking = (passage?: Passage) => {
    if (passage && draft) setDraft({ ...draft, back: passage.text, excerpt: passage.text })
    clear()
    setPicking(false)
  }
  const rect = selection?.rect
  const toolbarVisible = rect && rect.bottom > 0 && rect.top < window.innerHeight
  const below = rect && rect.top < 150
  const position = rect ? {
    '--passage-left': Math.max(175, Math.min(window.innerWidth - 175, rect.left + rect.width / 2)) + 'px',
    '--passage-top': (below ? Math.min(window.innerHeight - 70, rect.bottom + 8) : rect.top - 8) + 'px',
  } as CSSProperties : undefined

  return <>
    {saved && <p role="status" className="passage-confirmation">{t('notes.flashcardCreated')}</p>}
    {selection && toolbarVisible && !picking && !draft && !question && (
      <div data-selection-actions data-below={!!below}
        data-mobile-top={!!rect && rect.bottom > window.innerHeight * 0.65}
        className="passage-toolbar" style={position} role="toolbar" aria-label={t('selection.tools')}
        onPointerDown={(event) => { if (event.pointerType === 'mouse') event.preventDefault() }}>
        <Button size="sm" variant="secondary" onClick={() => { setQuestion(selection); clear() }}>
          <Icon name="sparkles" size={16} />{t('selection.ask')}
        </Button>
        <Button size="sm" onClick={() => startCard(selection)}>
          <Icon name="cards" size={16} />{t('notes.makeFlashcard')}
        </Button>
      </div>
    )}
    {question && <PassageQuestion passage={question} title={title} reading={reading} onClose={() => setQuestion(undefined)} />}
    {picking && draft && (
      <section data-selection-actions data-mobile-top={!!rect && rect.bottom > window.innerHeight * 0.65}
        className="passage-answer-dock" aria-label={t('selection.pickAnswer')}>
        <p className="truncate font-bold" title={draft.front}>{t('selection.question')}{' · '}{draft.front}</p>
        {deckId && <p className="study-muted truncate">{decks.data?.find((deck) => deck.id === deckId)?.title}</p>}
        <p className="study-muted">{t('selection.pickHint')}</p>
        <div className="flex flex-wrap gap-2" onPointerDown={(event) => { if (event.pointerType === 'mouse') event.preventDefault() }}>
          <Button size="sm" disabled={!selection} onClick={() => finishPicking(selection)}>{t('selection.useAnswer')}</Button>
          <Button size="sm" variant="secondary" onClick={() => finishPicking()}>{t('common.cancel')}</Button>
        </div>
      </section>
    )}
    {draft && <Modal open={!picking} title={t('notes.makeFlashcard')} onClose={() => { if (!save.isPending) setDraft(undefined) }}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault()
        if (deckId && draft.front.trim() && draft.back.trim() && !tooLong && !save.isPending) save.mutate({ ...draft, deckId })
      }}>
        <label className="block space-y-1 text-sm font-bold" htmlFor={id + '-question'}>
          <span>{t('selection.question')}</span>
          <textarea id={id + '-question'} value={draft.front} rows={3} maxLength={cardLimit}
            onChange={(event) => setDraft({ ...draft, front: event.target.value })} className="w-full rounded-xl p-2 font-normal" />
        </label>
        <label className="block space-y-1 text-sm font-bold" htmlFor={id + '-answer'}>
          <span>{t('selection.answer')}</span>
          <textarea id={id + '-answer'} value={draft.back} rows={3} maxLength={cardLimit}
            onChange={(event) => setDraft({ ...draft, back: event.target.value })} className="w-full rounded-xl p-2 font-normal" />
        </label>
        <Button type="button" size="sm" variant="secondary" disabled={save.isPending} onClick={startPicking}>{t('selection.pickAnswer')}</Button>
        <label className="block space-y-1 text-sm font-bold" htmlFor={id + '-deck'}>
          <span>{t('notes.chooseDeck')}</span>
          <select id={id + '-deck'} className="w-full rounded-xl p-2 font-normal" value={deckId}
            onChange={(event) => setDraft({ ...draft, deckId: event.target.value })} disabled={save.isPending || !decks.data?.length}>
            {!decks.data?.length && <option value="">{t('notes.chooseDeck')}</option>}
            {decks.data?.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}
          </select>
        </label>
        {decks.isSuccess && !decks.data.length && <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to="/study/decks?create=1" target="_blank" rel="noopener" className="font-bold underline">{t('selection.createDeck')}</Link>
          <Button type="button" size="sm" variant="secondary" onClick={() => void decks.refetch()}>{t('selection.refreshDecks')}</Button>
        </div>}
        {decks.isError && <Button type="button" size="sm" variant="secondary" onClick={() => void decks.refetch()}>{t('common.retry')}</Button>}
        {tooLong && <p role="alert" className="text-sm text-[var(--color-danger)]">{t('selection.cardTooLong', { limit: cardLimit })}</p>}
        {save.isError && <p role="alert" className="text-sm text-[var(--color-danger)]">{t('selection.saveFailed')}</p>}
        <Button type="submit" full disabled={save.isPending || !deckId || !draft.front.trim() || !draft.back.trim() || tooLong}>
          {t('notes.createCard')}
        </Button>
      </form>
    </Modal>}
  </>
}
