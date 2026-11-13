import { useQueries, useQuery } from '@tanstack/react-query'
import {
  cardsApi,
  decksApi,
  type DeckSummary,
  type DueCard,
  type StudyCard,
} from './api'

export const studyKeys = {
  decks: ['decks'] as const,
  deck: (id: string) => ['decks', id] as const,
  cards: (deckId: string) => ['decks', deckId, 'cards'] as const,
  due: ['cards', 'due'] as const,
}

export function useDecks() {
  return useQuery({ queryKey: studyKeys.decks, queryFn: decksApi.list })
}

export function useDeck(id: string | undefined) {
  return useQuery({
    queryKey: studyKeys.deck(id ?? ''),
    queryFn: () => decksApi.get(id as string),
    enabled: Boolean(id),
  })
}

export function useDeckCards(deckId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: studyKeys.cards(deckId ?? ''),
    queryFn: () => cardsApi.list(deckId as string),
    enabled: Boolean(deckId) && enabled,
  })
}

export function useDueCards(enabled = true) {
  return useQuery({
    queryKey: studyKeys.due,
    queryFn: () => cardsApi.due(50),
    enabled,
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
