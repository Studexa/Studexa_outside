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
import { useAuth } from './auth'

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
}

export function useDecks() {
  const user = useAuth((s) => s.user)
  return useQuery({ queryKey: studyKeys.decks(user?.id), queryFn: decksApi.list })
}

export function useDeck(id: string | undefined) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.deck(id ?? '', user?.id),
    queryFn: () => decksApi.get(id as string),
    enabled: Boolean(id),
  })
}

export function useDeckCards(deckId: string | undefined, enabled = true) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.cards(deckId ?? '', user?.id),
    queryFn: () => cardsApi.list(deckId as string),
    enabled: Boolean(deckId) && enabled,
  })
}

export function useDueCards(enabled = true) {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.due(user?.id),
    queryFn: () => cardsApi.due(50),
    enabled,
  })
}

export function useGameState() {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.gameState(user?.id),
    queryFn: gameApi.state,
    staleTime: 1000 * 60,
  })
}

export function useTodayQuests() {
  const user = useAuth((s) => s.user)
  return useQuery({
    queryKey: studyKeys.questsToday(user?.id),
    queryFn: questApi.today,
    staleTime: 1000 * 60,
  })
}

export type StudyCardWithDeck = { card: StudyCard; deck: DeckSummary }

export function useAllStudyCards() {
  const decksQuery = useDecks()
  const decks = decksQuery.data ?? []
  const cardQueries = useQueries({
    queries: decks.map((deck) => ({
      queryKey: studyKeys.cards(deck.id),
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
