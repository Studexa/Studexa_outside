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
  dueQueue!: Dexie.Table<CachedDueQueue, string>
  pendingAnswers!: Dexie.Table<PendingAnswer, number>

  constructor() {
    super('studexa-offline')
    this.version(1).stores({
      dueCards: 'userId, updatedAt', // one cached queue per user
      pendingAnswers: '++id, userId, createdAt', // append-only queue
    })
    this.version(2).stores({ dueCards: null, dueQueue: 'userId' })
  }
}

export const offlineDb = new StudexaOfflineDb()

type CachedDueQueue = {
  userId: string
  cards: DueCard[]
}

export type PendingAnswer = {
  id?: number
  userId: string
  cardId: string
  rating: 'again' | 'hard' | 'good' | 'easy'
  clientReviewId: string
  createdAt: string
  unavailable?: boolean
}

export type DueCardWithMeta = DueCard & {
  deckTitle: string
  deckColor: string
  deckIcon: string
  deckSubject: string
}

export async function cacheDueCards(userId: string, cards: DueCard[]) {
  await offlineDb.dueQueue.put({ userId, cards })
}

export async function getCachedDueCards(userId: string): Promise<DueCard[] | undefined> {
  return (await offlineDb.dueQueue.get(userId))?.cards
}

export async function clearOfflineAccount(userId: string) {
  await offlineDb.transaction('rw', offlineDb.dueQueue, offlineDb.pendingAnswers, async () => {
    await offlineDb.dueQueue.delete(userId)
    await offlineDb.pendingAnswers.where('userId').equals(userId).delete()
  })
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
  return offlineDb.pendingAnswers.where('userId').equals(userId).sortBy('id')
}

export async function removePendingAnswer(id: number) {
  await offlineDb.pendingAnswers.delete(id)
}

export async function markPendingAnswerUnavailable(id: number) {
  await offlineDb.pendingAnswers.update(id, { unavailable: true })
}
