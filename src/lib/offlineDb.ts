import Dexie from 'dexie'
import { type DueCard } from './api'

/**
 * Offline study database (IndexedDB via Dexie).
 *
 * Stores two things so the student can keep studying without a network:
 *  1. dueCards  — the last-fetched due queue, cached per user
 *  2. pendingAnswers — review answers submitted while offline, replayed on reconnect
 *
 * The backend's idempotency key (clientReviewId) makes replaying safe: the
 * same answer sent twice is only awarded XP once.
 */
export class StudexaOfflineDb extends Dexie {
  dueCards!: Dexie.Table<CachedDueCard, string>
  pendingAnswers!: Dexie.Table<PendingAnswer, number>

  constructor() {
    super('studexa-offline')
    this.version(1).stores({
      dueCards: 'userId, updatedAt', // one cached queue per user
      pendingAnswers: '++id, userId, createdAt', // append-only queue
    })
  }
}

export const offlineDb = new StudexaOfflineDb()

export type CachedDueCard = {
  userId: string
  card: DueCard
  updatedAt: string
}

export type PendingAnswer = {
  id?: number
  userId: string
  cardId: string
  rating: 'again' | 'hard' | 'good' | 'easy'
  clientReviewId: string
  createdAt: string
}

export type DueCardWithMeta = DueCard & {
  deckTitle: string
  deckColor: string
  deckIcon: string
  deckSubject: string
}

export async function cacheDueCards(userId: string, cards: DueCard[]) {
  await offlineDb.dueCards.where('userId').equals(userId).delete()
  await offlineDb.dueCards.bulkAdd(
    cards.map((card) => ({ userId, card, updatedAt: new Date().toISOString() }))
  )
}

export async function getCachedDueCards(userId: string): Promise<DueCard[]> {
  const rows = await offlineDb.dueCards.where('userId').equals(userId).toArray()
  return rows.map((r) => r.card)
}

export async function queuePendingAnswer(userId: string, cardId: string, rating: 'again' | 'hard' | 'good' | 'easy', clientReviewId: string) {
  await offlineDb.pendingAnswers.add({
    userId,
    cardId,
    rating,
    clientReviewId,
    createdAt: new Date().toISOString(),
  })
}

export async function getPendingAnswers(userId: string): Promise<PendingAnswer[]> {
  return offlineDb.pendingAnswers.where('userId').equals(userId).toArray()
}

export async function removePendingAnswer(id: number) {
  await offlineDb.pendingAnswers.delete(id)
}

export async function countPendingAnswers(userId: string): Promise<number> {
  return offlineDb.pendingAnswers.where('userId').equals(userId).count()
}