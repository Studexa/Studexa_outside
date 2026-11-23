import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import { celebrate } from '../../lib/confetti'
import { aiApi, cardsApi, type AiCardItem, type CardInput, type CardType } from '../../lib/api'
import { aiErrorMessage } from '../../lib/aiErrors'
import { studyKeys, useDeck, useDeckCards } from '../../lib/study'
import { isGuestMode, useAuth } from '../../lib/auth'
import { betaEnabled, maxBetaAiItems } from '../../lib/beta'
import { StudySamplePicker } from '../../components/StudySamplePicker'
import { useStudySamples } from '../../lib/useStudySamples'
import { useApp } from '../../lib/store'
import { useLocalizedStarter } from '../../lib/starterContent'

type EditorType = 'basic' | 'reverse' | 'cloze' | 'choice'

const types: EditorType[] = ['basic', 'reverse', 'cloze', 'choice']
const toApiType: Record<EditorType, CardType> = {
  basic: 'BASIC',
  reverse: 'REVERSED',
  cloze: 'CLOZE',
  choice: 'MULTIPLE_CHOICE',
}
const toEditorType: Record<CardType, EditorType> = {
  BASIC: 'basic',
  REVERSED: 'reverse',
  CLOZE: 'cloze',
  MULTIPLE_CHOICE: 'choice',
}

export function DeckEditorPage() {
  const { t, i18n } = useTranslation()
  const starter = useLocalizedStarter()
  const { deckId } = useParams()
  const queryClient = useQueryClient()
  const deckQuery = useDeck(deckId)
  const cardsQuery = useDeckCards(deckId)
  const deck = deckQuery.data
  const cards = cardsQuery.data ?? []
  const guestMode = isGuestMode()
  const userId = useAuth((state) => state.user?.id)

  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [choices, setChoices] = useState('')
  const [type, setType] = useState<EditorType>('basic')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiSource, setAiSource] = useState('')
  const [aiTitle, setAiTitle] = useState('')
  const [aiCount, setAiCount] = useState(betaEnabled ? maxBetaAiItems : 8)
  const [sampleId, setSampleId] = useState('')
  const samplePicker = useStudySamples(betaEnabled && aiOpen, sampleId)
  const maxAiCount = betaEnabled ? maxBetaAiItems : 15
  const [aiItems, setAiItems] = useState<AiCardItem[]>([])
  const [aiPicked, setAiPicked] = useState<number[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = () => {
    if (!deckId) return
    void queryClient.invalidateQueries({ queryKey: studyKeys.decks(userId) })
    void queryClient.invalidateQueries({ queryKey: studyKeys.due(userId) })
    void queryClient.invalidateQueries({ queryKey: studyKeys.weakCards(userId) })
  }

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2600)
  }

  const createCard = useMutation({
    mutationFn: (input: CardInput) => {
      if (guestMode) {
        useApp.getState().addCard(deckId as string, input.front, input.back, toEditorType[input.type])
        return Promise.resolve(null)
      }
      return cardsApi.create(deckId as string, input)
    },
    onSuccess: () => {
      refresh()
      setFront('')
      setBack('')
      setChoices('')
      celebrate()
      flash(t('decks.cardAdded'))
    },
  })

  const removeCard = useMutation({
    mutationFn: (id: string) => {
      if (guestMode) {
        useApp.getState().deleteCard(deckId as string, id)
        return Promise.resolve()
      }
      return cardsApi.remove(id)
    },
    onSuccess: refresh,
  })

  const bulkCreate = useMutation({
    mutationFn: async (items: CardInput[]) => {
      if (guestMode) {
        items.forEach((item) => useApp.getState().addCard(deckId as string, item.front, item.back, toEditorType[item.type]))
        return items
      }
      await cardsApi.bulk(deckId as string, items)
      return items
    },
    onSuccess: (saved) => {
      refresh()
      setBulkOpen(false)
      setBulkText('')
      flash(t('decks.bulkAdded', { count: saved.length }))
    },
  })

  const generateCards = useMutation({
    mutationFn: () => betaEnabled
      ? aiApi.sampleGenerate({ sampleId: samplePicker.sample!.id, task: 'FLASHCARDS', count: aiCount })
      : aiApi.generate({
        task: 'FLASHCARDS',
        deckId,
        sourceText: aiSource.trim() || undefined,
        sourceTitle: aiTitle.trim() || undefined,
        count: aiCount,
        language: i18n.language === 'km' ? 'km' : 'en',
      }),
    onSuccess: (data) => {
      setAiItems(data.items)
      setAiPicked(data.items.map((_, index) => index))
    },
  })

  const addGenerated = useMutation({
    mutationFn: async () => {
      const selected = aiItems.filter((_, index) => aiPicked.includes(index))
      if (guestMode) {
        selected.forEach((item) => useApp.getState().addCard(deckId as string, item.front, item.back, toEditorType[item.type]))
        return selected
      }
      await cardsApi.bulk(deckId as string, selected.map(aiItemToInput))
      return selected
    },
    onSuccess: (saved) => {
      refresh()
      setAiOpen(false)
      setAiItems([])
      setAiPicked([])
      setAiSource('')
      setAiTitle('')
      celebrate()
      flash(t('decks.aiAddedCount', { count: saved.length }))
    },
  })

  const bulkCards = useMemo(
    () =>
      bulkText
        .split('\n')
        .map((line) => line.split(/[;\t]/).map((s) => s.trim()))
        .filter((parts) => parts[0] && parts[1])
        .map((parts) => ({ front: parts[0], back: parts[1] })),
    [bulkText],
  )

  if (deckQuery.isLoading) {
    return <div className="flex justify-center p-12"><Spinner label={t('common.loading')} /></div>
  }

  if (!deck) {
    return (
      <EmptyState
        title={t('decks.notFound')}
        hint={t('decks.notFoundHint')}
        action={<Link to="/study/decks"><Button>{t('decks.backToDecks')}</Button></Link>}
      />
    )
  }

  const create = () => {
    if (!front.trim() || !back.trim()) return
    const choiceList = choices.split(',').map((choice) => choice.trim()).filter(Boolean)
    createCard.mutate({
      type: toApiType[type],
      front: front.trim(),
      back: back.trim(),
      extra: type === 'choice' ? { choices: choiceList } : {},
    })
  }

  const addBulk = () => {
    bulkCreate.mutate(bulkCards.map((card) => ({ type: 'BASIC', front: card.front, back: card.back })))
  }

  const togglePicked = (index: number) => {
    setAiPicked((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    )
  }

  const formError = createCard.isError || bulkCreate.isError || removeCard.isError || addGenerated.isError

  return (
    <div className="space-y-4">
      <div className="study-feature-header flex flex-wrap items-start gap-3">
        <Link
          to="/study/decks"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
          aria-label={t('common.back')}
        >
          <Icon name="chevronLeft" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black"
              style={{ background: `${deck.color}22`, color: deck.color }}
            >
              {deck.icon || '📚'}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black">{starter.deck(deck.id, deck.title)}</h1>
              <p className="text-xs font-semibold text-[var(--color-muted)]">
                {deck.subjectName ? starter.deck(deck.id, deck.subjectName) : t('decks.noSubject')}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="primary">{t('decks.cardCount', { count: deck.cardCount })}</Badge>
            {deck.dueCount > 0 && <Badge tone="accent">{t('decks.dueCount', { count: deck.dueCount })}</Badge>}
          </div>
        </div>
        <Link to="/study/review">
          <Button size="sm">
            <Icon name="play" size={16} /> {t('decks.study')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setAiOpen(true)}>
              <Icon name="sparkles" size={16} />
              {t('decks.generateAI')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setBulkOpen(true)}>
              <Icon name="layers" size={16} /> {t('decks.bulkAdd')}
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-bold" htmlFor="card-front">{t('decks.front')}</label>
              <textarea
                id="card-front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder={t('decks.frontPlaceholder')}
                rows={3}
                className="mt-1 w-full resize-none rounded-2xl px-4 py-3"
              />
            </div>
            <div>
              <label className="text-sm font-bold" htmlFor="card-back">{t('decks.back')}</label>
              <textarea
                id="card-back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder={t('decks.backPlaceholder')}
                rows={3}
                className="mt-1 w-full resize-none rounded-2xl px-4 py-3"
              />
            </div>
            {type === 'choice' && (
              <div>
                <label className="text-sm font-bold" htmlFor="card-choices">{t('decks.choices')}</label>
                <input
                  id="card-choices"
                  value={choices}
                  onChange={(e) => setChoices(e.target.value)}
                  placeholder={t('decks.choicesPlaceholder')}
                  className="mt-1 w-full rounded-2xl px-4 py-2.5"
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t('decks.choicesHint')}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-bold">{t('decks.cardType')}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {types.map((item) => (
                  <button
                    key={item}
                    onClick={() => setType(item)}
                    aria-pressed={type === item}
                    className={`min-h-10 rounded-full border-2 px-3 text-xs font-bold ${
                      type === item
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    {t(`decks.types.${item}`)}
                  </button>
                ))}
              </div>
            </div>
            <Button
              full
              onClick={create}
              disabled={!front.trim() || !back.trim() || createCard.isPending}
            >
              <Icon name="plus" size={18} /> {createCard.isPending ? t('common.saving') : t('decks.addCard')}
            </Button>
            {formError && (
              <p className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-center text-sm font-bold text-[var(--color-danger-text)]">
                {t('common.error')}
              </p>
            )}
            {notice && (
              <p className="rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-center text-sm font-bold text-[var(--color-success-text)]">
                {notice}
              </p>
            )}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted)]">{t('decks.livePreview')}</p>
          <div className="flex min-h-56 flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] p-6 text-center">
            <span className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">{t('review.front')}</span>
            <p className="text-xl font-extrabold">{front || t('decks.previewFront')}</p>
          </div>
          <div className="mt-2 flex min-h-40 flex-col items-center justify-center rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-sm)]">
            <span className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-success-text)]">{t('review.back')}</span>
            <p className="text-xl font-extrabold">{back || t('decks.previewBack')}</p>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-extrabold">{t('decks.cardsInDeck')}</h2>
        {cardsQuery.isLoading ? (
          <div className="flex justify-center p-6"><Spinner label={t('common.loading')} /></div>
        ) : cardsQuery.isError ? (
          <p className="rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm font-bold text-[var(--color-danger-text)]">
            {t('common.error')}
          </p>
        ) : cards.length === 0 ? (
          <EmptyState title={t('decks.noCards')} hint={t('decks.noCardsHint')} />
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">{starter.card(deck.id, card.front)}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{starter.card(deck.id, card.back)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                      {t(`decks.types.${toEditorType[card.type]}`)}
                    </span>
                    {card.due && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />}
                    {card.sourceTitle && (
                      <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted)]">
                        {t('decks.source')}: {card.sourceTitle}
                      </span>
                    )}
                  </div>
                  {card.sourceExcerpt && (
                    <blockquote className="mt-2 border-l-2 border-[var(--color-primary)]/30 pl-2 text-[11px] italic text-[var(--color-muted)]">
                      “{card.sourceExcerpt}”
                    </blockquote>
                  )}
                </div>
                <button
                  onClick={() => removeCard.mutate(card.id)}
                  disabled={removeCard.isPending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger-text)]"
                  aria-label={t('decks.deleteCard')}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={bulkOpen} title={t('decks.bulkAdd')} onClose={() => setBulkOpen(false)}>
        <p className="text-sm text-[var(--color-muted)]">{t('decks.bulkHint')}</p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={8}
          placeholder={t('decks.bulkPlaceholder')}
          className="mt-2 w-full resize-none rounded-2xl px-4 py-3 font-mono text-sm"
        />
        <div className="mt-2 flex items-center justify-between text-sm font-bold">
          <span className="text-[var(--color-muted)]">{t('decks.bulkPreview', { count: bulkCards.length })}</span>
          <Button onClick={addBulk} disabled={bulkCards.length === 0 || bulkCreate.isPending}>
            {bulkCreate.isPending ? t('common.saving') : t('decks.addCards')}
          </Button>
        </div>
      </Modal>

      <Modal open={aiOpen} fitViewport title={t('decks.aiGeneratorTitle')} onClose={() => setAiOpen(false)}>
        <div className="space-y-3">
          {betaEnabled ? <StudySamplePicker {...samplePicker} onChange={setSampleId} /> : <>
          <p className="text-sm text-[var(--color-muted)]">{t('decks.aiGeneratorHint')}</p>
          <div>
            <label className="text-sm font-bold" htmlFor="ai-source-title">{t('decks.sourceTitle')}</label>
            <input
              id="ai-source-title"
              value={aiTitle}
              onChange={(e) => setAiTitle(e.target.value)}
              placeholder={t('decks.sourceTitlePlaceholder')}
              className="mt-1 w-full rounded-2xl px-4 py-2.5"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="ai-source">{t('decks.sourceNotes')}</label>
            <textarea
              id="ai-source"
              value={aiSource}
              onChange={(e) => setAiSource(e.target.value)}
              rows={6}
              placeholder={t('decks.sourceNotesPlaceholder')}
              className="mt-1 w-full resize-none rounded-2xl px-4 py-3 text-sm"
            />
          </div>
          </>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm font-bold" htmlFor="ai-count">{t('decks.cardCountLabel')}</label>
            <input
              id="ai-count"
              type="number"
              min={1}
              max={maxAiCount}
              value={aiCount}
              onChange={(e) => setAiCount(Math.min(maxAiCount, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
              className="w-24 rounded-2xl px-3 py-2 text-center font-bold"
            />
          </div>
          <Button full onClick={() => generateCards.mutate()}
            disabled={generateCards.isPending || (betaEnabled && !samplePicker.sample)}>
            <Icon name="sparkles" size={18} />
            {generateCards.isPending ? t('decks.generating') : t('decks.generateAI')}
          </Button>
          {generateCards.isError && (
            <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--color-danger-text)]">
              {aiErrorMessage(t, generateCards.error)}
            </p>
          )}
          {generateCards.isPending && (
            <p className="text-center text-xs font-semibold text-[var(--color-muted)]">{t('decks.aiWorking')}</p>
          )}

          {aiItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold">{t('decks.aiPreviewTitle', { count: aiItems.length })}</p>
                <button
                  className="text-xs font-bold text-[var(--color-primary)]"
                  onClick={() => setAiPicked(aiPicked.length === aiItems.length ? [] : aiItems.map((_, i) => i))}
                >
                  {aiPicked.length === aiItems.length ? t('decks.clearAll') : t('decks.selectAll')}
                </button>
              </div>
              <div className="space-y-2">
                {aiItems.map((item, index) => {
                  const picked = aiPicked.includes(index)
                  return (
                    <button
                      key={`${item.front}-${index}`}
                      onClick={() => togglePicked(index)}
                      aria-pressed={picked}
                      className={`w-full rounded-2xl border-2 p-3 text-left ${
                        picked ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/40' : 'border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${picked ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'border-[var(--color-border)]'}`}>
                          {picked && <Icon name="check" size={12} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold">{item.front}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{item.back}</p>
                          {item.choices.length > 0 && (
                            <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                              {item.choices.join(' · ')}
                            </p>
                          )}
                          {(item.sourceTitle || item.sourceExcerpt) && (
                            <div className="mt-2 rounded-xl bg-[var(--color-surface)] p-2">
                              {item.sourceTitle && (
                                <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-primary)]">
                                  {t('decks.source')}: {item.sourceTitle}
                                </p>
                              )}
                              {item.sourceExcerpt && (
                                <p className="mt-0.5 text-[11px] italic text-[var(--color-muted)]">“{item.sourceExcerpt}”</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <Button full onClick={() => addGenerated.mutate()} disabled={aiPicked.length === 0 || addGenerated.isPending}>
                {addGenerated.isPending
                  ? t('common.saving')
                  : t('decks.addGenerated', { count: aiPicked.length })}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

function aiItemToInput(item: AiCardItem): CardInput {
  const extra: Record<string, unknown> = {}
  if (item.choices.length > 0) extra.choices = item.choices
  if (item.explanation) extra.explanation = item.explanation
  return {
    type: item.type,
    front: item.front,
    back: item.back,
    extra,
    sourceTitle: item.sourceTitle ?? undefined,
    sourceExcerpt: item.sourceExcerpt ?? undefined,
  }
}
