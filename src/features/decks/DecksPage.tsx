import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { betaEnabled } from '../../lib/beta'
import { Button } from '../../components/Button'
import { DeckTile } from '../../components/DeckTile'
import { DeckTileSkeleton } from '../../components/Skeleton'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { decksApi, subjectsApi } from '../../lib/api'
import { studyKeys, useDecks } from '../../lib/study'
import { isGuestMode, useAuth } from '../../lib/auth'
import { useApp } from '../../lib/store'

const colors = ['#6366f1', '#f59e0b', '#10b981', '#f87171', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6']
const icons = ['📚', '∑', 'ក', '🧬', 'Aa', '⚛', '📖', '🌏', '🎨']

export function DecksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const guestMode = isGuestMode()
  const userId = useAuth((state) => state.user?.id)
  const decksQuery = useDecks()
  const subjectsQuery = useQuery({
    queryKey: ['subjects', userId, 'active'],
    queryFn: () => subjectsApi.list(false),
    enabled: !guestMode,
  })
  const [search, setSearch] = useSearchParams()
  const fromCreateLink = search.get('create') === '1'
  const [open, setOpen] = useState(false)
  const closeCreate = () => {
    setOpen(false)
    if (fromCreateLink) {
      const params = new URLSearchParams(search)
      params.delete('create')
      setSearch(params, { replace: true })
    }
  }
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [color, setColor] = useState(colors[0])
  const [icon, setIcon] = useState(icons[0])
  const [query, setQuery] = useState('')

  const createDeck = useMutation({
    mutationFn: () => guestMode
      ? Promise.resolve({ id: useApp.getState().addDeck({ title: title.trim(), subject: '', icon, color }) })
      : decksApi.create({ title: title.trim(), subjectId: subjectId || null, color, icon }),
    onSuccess: (deck) => {
      void queryClient.invalidateQueries({ queryKey: studyKeys.decks(userId) })
      setOpen(false)
      setTitle('')
      setSubjectId('')
      navigate(`/study/decks/${deck.id}`, { replace: fromCreateLink })
    },
  })

  const decks = decksQuery.data ?? []
  const filtered = decks.filter((deck) =>
    `${deck.title} ${deck.subjectName ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  )

  const create = () => {
    if (!title.trim()) return
    if (guestMode) {
      createDeck.mutate()
      return
    }
    createDeck.mutate()
  }

  return (
    <div className="space-y-4">
      <div className="study-page-header study-feature-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t('decks.title')}</h1>
          <p className="text-sm text-[var(--color-muted)]">{t('decks.subtitle')}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} /> {t('decks.newDeck')}
        </Button>
      </div>

      <div className="relative">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('decks.searchPlaceholder')}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold"
          aria-label={t('common.search')}
        />
      </div>

      {decksQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DeckTileSkeleton />
          <DeckTileSkeleton />
          <DeckTileSkeleton />
          <DeckTileSkeleton />
        </div>
      ) : decksQuery.isError ? (
        <div className="rounded-[24px] border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-5 text-center">
          <p className="font-bold text-[var(--color-danger-text)]">{t('workspace.deckError')}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void decksQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-10 text-center">
          <p className="font-bold">{t('decks.noDecks')}</p>
          <p className="text-sm text-[var(--color-muted)]">{t('decks.noDecksHint')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deck) => (
            <DeckTile key={deck.id} deck={deck} />
          ))}
        </div>
      )}

      <div className="rounded-[22px] bg-[var(--color-primary-soft)] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-primary)]">
            <Icon name="sparkles" size={20} />
          </span>
          <div className="flex-1">
            <p className="font-extrabold text-[var(--color-primary)]">{t('decks.aiTitle')}</p>
            <p className="text-sm text-[var(--color-muted)]">{t(betaEnabled ? 'beta.deckHint' : 'decks.aiHint')}</p>
          </div>
          <Link to={decks[0] ? `/study/decks/${decks[0].id}` : '/study/decks'}>
            <Button variant="secondary" size="sm">
              {t('decks.tryAI')}
            </Button>
          </Link>
        </div>
      </div>

      <Modal open={open || fromCreateLink} title={t('decks.newDeck')} onClose={closeCreate}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold" htmlFor="deck-title">{t('decks.deckName')}</label>
            <input
              id="deck-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('decks.deckNamePlaceholder')}
              className="mt-1 w-full rounded-2xl px-4 py-2.5"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="deck-subject">{t('decks.subject')}</label>
            <select
              id="deck-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full rounded-2xl px-4 py-2.5"
            >
              <option value="">{t('decks.noSubject')}</option>
              {(subjectsQuery.data ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            {(subjectsQuery.data ?? []).length === 0 && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t('decks.noSubjectsHint')} <Link to="/subjects" className="font-bold text-[var(--color-primary)]">{t('nav.subjects')}</Link>
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-bold">{t('decks.icon')}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {icons.map((item) => (
                <button
                  key={item}
                  onClick={() => setIcon(item)}
                  aria-pressed={icon === item}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg font-black ${
                    icon === item ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">{t('decks.color')}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {colors.map((item) => (
                <button
                  key={item}
                  onClick={() => setColor(item)}
                  aria-label={item}
                  aria-pressed={color === item}
                  className={`h-10 w-10 rounded-full border-2 ${color === item ? 'border-[var(--color-text)]' : 'border-transparent'}`}
                  style={{ background: item }}
                />
              ))}
            </div>
          </div>
          {createDeck.isError && (
            <p className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--color-danger-text)]">
              {t('common.error')}
            </p>
          )}
          <Button full onClick={create} disabled={!title.trim() || createDeck.isPending}>
            {createDeck.isPending ? t('common.saving') : t('decks.createDeck')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
