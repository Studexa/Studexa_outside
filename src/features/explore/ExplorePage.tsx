import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { celebrate } from '../../lib/confetti'
import { cardsApi, decksApi } from '../../lib/api'
import { studyKeys } from '../../lib/study'

const publicDecks = [
  {
    id: 'pub-1',
    title: 'Algebra warm-ups',
    subject: 'Mathematics',
    author: 'Dara',
    rating: 4.9,
    copies: 1280,
    color: '#6366f1',
    icon: '∑',
    cards: [
      { front: 'Solve: 3x = 21', back: 'x = 7' },
      { front: 'Factor x² − 4', back: '(x − 2)(x + 2)' },
      { front: 'Slope of y = −2x + 1', back: '−2' },
    ],
  },
  {
    id: 'pub-2',
    title: 'Cell biology essentials',
    subject: 'Biology',
    author: 'Sophea',
    rating: 4.8,
    copies: 940,
    color: '#10b981',
    icon: '🧬',
    cards: [
      { front: 'Powerhouse of the cell', back: 'Mitochondria' },
      { front: 'Where photosynthesis happens', back: 'Chloroplast' },
      { front: 'Controls what enters the cell', back: 'Cell membrane' },
    ],
  },
  {
    id: 'pub-3',
    title: 'Khmer proverbs',
    subject: 'Khmer',
    author: 'Borey',
    rating: 4.7,
    copies: 720,
    color: '#f59e0b',
    icon: 'ក',
    cards: [
      { front: '“ចេះដប់ មិនស្មើចេះមួយ”', back: 'Knowledge in depth beats shallow knowledge.' },
      { front: '“ដំរីស្លាប់ ដោយដើមចេក”', back: 'Big things can fail from small causes.' },
    ],
  },
  {
    id: 'pub-4',
    title: 'English irregular verbs',
    subject: 'English',
    author: 'Mealea',
    rating: 4.9,
    copies: 2100,
    color: '#f87171',
    icon: 'Aa',
    cards: [
      { front: 'Past tense of “go”', back: 'went' },
      { front: 'Past tense of “write”', back: 'wrote' },
      { front: 'Past tense of “think”', back: 'thought' },
    ],
  },
  {
    id: 'pub-5',
    title: 'Physics formulas',
    subject: 'Physics',
    author: 'Vibol',
    rating: 4.6,
    copies: 610,
    color: '#3b82f6',
    icon: '⚛',
    cards: [
      { front: 'Speed formula', back: 'distance ÷ time' },
      { front: 'Force formula', back: 'mass × acceleration' },
    ],
  },
  {
    id: 'pub-6',
    title: 'World history dates',
    subject: 'History',
    author: 'Chantha',
    rating: 4.5,
    copies: 430,
    color: '#8b5cf6',
    icon: '🌏',
    cards: [
      { front: 'Year World War II ended', back: '1945' },
      { front: 'Year the Berlin Wall fell', back: '1989' },
    ],
  },
]

const subjects = ['Mathematics', 'Biology', 'Khmer', 'English', 'Physics', 'History']

export function ExplorePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('all')
  const [copied, setCopied] = useState<string[]>([])

  const copyMutation = useMutation({
    mutationFn: async (deck: (typeof publicDecks)[number]) => {
      const created = await decksApi.create({
        title: deck.title,
        color: deck.color,
        icon: deck.icon,
      })
      await cardsApi.bulk(
        created.id,
        deck.cards.map((card) => ({ type: 'BASIC' as const, front: card.front, back: card.back })),
      )
      return created
    },
    onSuccess: (created, deck) => {
      setCopied((prev) => [...prev, deck.id])
      void queryClient.invalidateQueries({ queryKey: studyKeys.decks() })
      void queryClient.invalidateQueries({ queryKey: studyKeys.deck(created.id) })
      celebrate()
    },
  })

  const filtered = publicDecks.filter((deck) => {
    const matchQuery = `${deck.title} ${deck.subject} ${deck.author}`.toLowerCase().includes(query.toLowerCase())
    const matchSubject = subject === 'all' || deck.subject === subject
    return matchQuery && matchSubject
  })

  const copyDeck = (deck: (typeof publicDecks)[number]) => {
    if (copyMutation.isPending) return
    copyMutation.mutate(deck)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">{t('explore.title')}</h1>
        <p className="text-sm text-[var(--color-muted)]">{t('explore.subtitle')}</p>
      </div>

      <div className="relative">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('explore.searchPlaceholder')}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold"
          aria-label={t('common.search')}
        />
      </div>

      {copyMutation.isError && (
        <p className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--color-danger)]">
          {copyMutation.error.message}
        </p>
      )}

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSubject('all')}
          className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${
            subject === 'all' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
          }`}
        >
          {t('explore.allSubjects')}
        </button>
        {subjects.map((item) => (
          <button
            key={item}
            onClick={() => setSubject(item)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${
              subject === item ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-10 text-center">
          <p className="font-bold">{t('explore.noResults')}</p>
          <p className="text-sm text-[var(--color-muted)]">{t('explore.noResultsHint')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deck) => {
            const isCopied = copied.includes(deck.id)
            return (
              <article key={deck.id} className="flex flex-col rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black"
                    style={{ background: `${deck.color}22`, color: deck.color }}
                  >
                    {deck.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-extrabold">{deck.title}</h2>
                    <p className="text-xs font-semibold text-[var(--color-muted)]">
                      {deck.subject} · {t('explore.by', { name: deck.author })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-[var(--color-muted)]">
                  <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                    <Icon name="star" size={12} className="fill-current" /> {deck.rating}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="copy" size={12} /> {deck.copies}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="cards" size={12} /> {deck.cards.length}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" full onClick={() => copyDeck(deck)} disabled={isCopied || copyMutation.isPending}>
                    <Icon name={isCopied ? 'check' : 'copy'} size={15} />
                    {isCopied ? t('explore.copied') : t('explore.copy')}
                  </Button>
                  {isCopied && <Badge tone="success">{t('explore.save')}</Badge>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
