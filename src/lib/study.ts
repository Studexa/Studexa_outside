import { useQueries, useQuery } from '@tanstack/react-query'
import {
  cardsApi,
  decksApi,
  gameApi,
  questApi,
  type DeckSummary,
  type DueCard,
  type StudyCard,
} from './api'
import { isGuestMode, useAuth } from './auth'
import { cacheDueCards, getCachedDueCards } from './offlineDb'
import { useApp, type Deck as LocalDeck } from './store'

function toDeckSummary(deck: LocalDeck): DeckSummary {
  return {
    id: deck.id,
    subjectId: null,
    subjectName: deck.subject,
    title: deck.title,
    description: null,
    color: deck.color,
    icon: deck.icon,
    cardCount: deck.cards.length,
    dueCount: deck.cards.filter((card) => card.due).length,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }
}

function toStudyCard(deckId: string, card: LocalDeck['cards'][number]): StudyCard {
  return {
    id: card.id,
    deckId,
    type: card.type === 'choice' ? 'MULTIPLE_CHOICE' : card.type === 'reverse' ? 'REVERSED' : card.type.toUpperCase() as StudyCard['type'],
    front: card.front,
    back: card.back,
    extra: {},
    tags: [],
    mediaUrl: null,
    starred: false,
    suspended: false,
    sourceTitle: null,
    sourceExcerpt: null,
    due: card.due,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }
}

export const studyKeys = {
  decks: (userId?: string) => ['decks', userId ?? 'current'] as const,
  deck: (id: string, userId?: string) => ['decks', userId ?? 'current', id] as const,
  cards: (deckId: string, userId?: string) => ['decks', userId ?? 'current', deckId, 'cards'] as const,
  due: (userId?: string) => ['cards', 'due', userId ?? 'current'] as const,
  gameState: (userId?: string) => ['game', 'state', userId ?? 'current'] as const,
  gameBadges: (userId?: string) => ['game', 'badges', userId ?? 'current'] as const,
  gameXpHistory: (userId?: string) => ['game', 'xp-history', userId ?? 'current'] as const,
  questsToday: (userId?: string) => ['quests', 'today', userId ?? 'current'] as const,
  reviewQueue: (userId?: string) => ['review', 'queue', userId ?? 'current'] as const,
  subjects: (userId?: string) => ['subjects', userId ?? 'current'] as const,
  shopItems: (userId?: string) => ['shop', 'items', userId ?? 'current'] as const,
  shopOwned: (userId?: string) => ['shop', 'owned', userId ?? 'current'] as const,
  pet: (userId?: string) => ['pet', userId ?? 'current'] as const,
}

export function useDecks(enabled = true) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.decks(user?.id),
    queryFn: () => isGuestMode() ? useApp.getState().decks.map(toDeckSummary) : decksApi.list(),
    enabled,
  })
}

export function useDeck(id: string | undefined) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.deck(id ?? '', user?.id),
    queryFn: () => {
      if (isGuestMode()) {
        const local = useApp.getState().decks.find((deck) => deck.id === id)
        if (local) return Promise.resolve(toDeckSummary(local))
      }
      return decksApi.get(id as string)
    },
    enabled: Boolean(id),
  })
}

export function useDeckCards(deckId: string | undefined, enabled = true) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.cards(deckId ?? '', user?.id),
    queryFn: () => {
      if (isGuestMode()) {
        const local = useApp.getState().decks.find((deck) => deck.id === deckId)
        return Promise.resolve(local?.cards.map((card) => toStudyCard(deckId as string, card)) ?? [])
      }
      return cardsApi.list(deckId as string)
    },
    enabled: Boolean(deckId) && enabled,
  })
}

export function useDueCards(enabled = true) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.due(user?.id),
    networkMode: 'always',
    queryFn: async () => {
      if (isGuestMode()) {
        return useApp.getState().decks.flatMap((deck) => deck.cards
          .filter((card) => card.due)
          .map((card): DueCard => ({
            id: card.id,
            deckId: deck.id,
            deckTitle: deck.title,
            deckColor: deck.color,
            deckIcon: deck.icon,
            deckSubject: deck.subject,
            type: card.type === 'choice' ? 'MULTIPLE_CHOICE' : card.type === 'reverse' ? 'REVERSED' : card.type.toUpperCase() as DueCard['type'],
            front: card.front,
            back: card.back,
            extra: {},
            tags: [],
            sourceTitle: null,
            sourceExcerpt: null,
          })))
      }
      try {
        const cards = await cardsApi.due(50)
        if (user?.id && useAuth.getState().user?.id === user.id) {
          void cacheDueCards(user.id, cards).catch(() => undefined)
        }
        return cards
      } catch {
        // Offline: serve the last-cached due queue from IndexedDB so study never stops
        if (user?.id && useAuth.getState().user?.id === user.id) {
          const cached = await getCachedDueCards(user.id)
          if (cached.length > 0) return cached
        }
        throw new Error('You are offline and have no cached cards.')
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export function useGameState(enabled = true) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.gameState(user?.id),
    queryFn: gameApi.state,
    staleTime: 1000 * 60,
    enabled,
  })
}

export function useTodayQuests(enabled = true) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.questsToday(user?.id),
    queryFn: questApi.today,
    staleTime: 1000 * 60,
    enabled,
  })
}

export type StudyCardWithDeck = { card: StudyCard; deck: DeckSummary }

export function useAllStudyCards() {
  const userId = useAuth((state) => state.user?.id)
  const decksQuery = useDecks()
  const decks = decksQuery.data ?? []
  const cardQueries = useQueries({
    queries: decks.map((deck) => ({
      queryKey: studyKeys.cards(deck.id, userId),
      queryFn: () => cardsApi.list(deck.id),
    })),
  })
  const cards: StudyCardWithDeck[] = cardQueries.flatMap((query, index) => {
    const deck = decks[index]
    if (!deck) return []
    return (query.data ?? []).map((card) => ({ card, deck }))
  })
  const isLoading = decksQuery.isLoading || cardQueries.some((query) => query.isLoading)
  return { decks, cards, isLoading, refetch: decksQuery.refetch }
}

export function dueCardDeck(card: DueCard) {
  return {
    id: card.deckId,
    title: card.deckTitle,
    color: card.deckColor,
    icon: card.deckIcon ?? '',
    subject: card.deckSubject,
  }
}
