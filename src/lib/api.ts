import { client, call, asBody, ApiError, setAccessToken, getAccessToken, refreshAccessToken, API_URL } from './api/client'

export { ApiError, setAccessToken, getAccessToken, API_URL }

export type User = {
  id: string
  email: string
  role: string
  createdAt: string
}

export type Profile = {
  userId: string
  nickname: string
  avatar: string | null
  language: 'en' | 'km'
  levelOfStudy: string | null
  timezone: string
  dailyGoalCards: number
  dailyGoalMinutes: number
  updatedAt: string
}

export type Me = { user: User; profile: Profile }

export type AuthResponse = {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
  profile: Profile
}

export type Subject = {
  id: string
  name: string
  color: string
  icon: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export type SubjectInput = {
  name: string
  color?: string
  icon?: string | null
}

export type UpdateSubjectInput = Partial<SubjectInput> & { archived?: boolean }

export type UpdateProfileInput = Partial<{
  nickname: string
  avatar: string | null
  language: 'en' | 'km'
  levelOfStudy: string | null
  timezone: string
  dailyGoalCards: number
  dailyGoalMinutes: number
}>

export const authApi = {
  register: (input: { email: string; password: string; nickname: string; language?: 'en' | 'km' }) =>
    call<AuthResponse>(client.POST('/api/v1/auth/register', { body: input })),

  login: (input: { email: string; password: string }) =>
    call<AuthResponse>(client.POST('/api/v1/auth/login', { body: input })),

  logout: () => call<void>(client.POST('/api/v1/auth/logout', {})),

  me: () => call<Me>(client.GET('/api/v1/me')),

  updateMe: (input: UpdateProfileInput) =>
    call<Me>(client.PUT('/api/v1/me', { body: asBody(input) })),
}

export async function restoreSession(): Promise<Me | null> {
  const token = await refreshAccessToken()
  if (!token) return null
  return authApi.me()
}

export const subjectsApi = {
  list: (archived?: boolean) =>
    call<Subject[]>(client.GET('/api/v1/subjects', { params: { query: { archived } } })),

  create: (input: SubjectInput) =>
    call<Subject>(client.POST('/api/v1/subjects', { body: asBody(input) })),

  update: (id: string, input: UpdateSubjectInput) =>
    call<Subject>(client.PUT('/api/v1/subjects/{id}', { params: { path: { id } }, body: asBody(input) })),

  remove: (id: string) => call<void>(client.DELETE('/api/v1/subjects/{id}', { params: { path: { id } } })),
}


export type CardType = 'BASIC' | 'REVERSED' | 'CLOZE' | 'MULTIPLE_CHOICE'
export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'

export type DeckSummary = {
  id: string
  subjectId: string | null
  subjectName: string | null
  title: string
  description: string | null
  color: string
  icon: string | null
  cardCount: number
  dueCount: number
  createdAt: string
  updatedAt: string
}

export type StudyCard = {
  id: string
  deckId: string
  type: CardType
  front: string
  back: string
  extra: Record<string, unknown>
  tags: string[]
  mediaUrl: string | null
  starred: boolean
  suspended: boolean
  sourceTitle: string | null
  sourceExcerpt: string | null
  due: boolean
  createdAt: string
  updatedAt: string
}

export type DueCard = {
  id: string
  deckId: string
  deckTitle: string
  deckColor: string
  deckIcon: string | null
  deckSubject: string
  type: CardType
  front: string
  back: string
  extra: Record<string, unknown>
  tags: string[]
  sourceTitle: string | null
  sourceExcerpt: string | null
}

export type DeckInput = {
  title: string
  description?: string
  subjectId?: string | null
  color?: string
  icon?: string
}

export type CardInput = {
  type: CardType
  front: string
  back: string
  extra?: Record<string, unknown>
  tags?: string[]
  sourceTitle?: string
  sourceExcerpt?: string
}

export type RatingLabel = Record<'AGAIN' | 'HARD' | 'GOOD' | 'EASY', string>

export type ReviewQueueCard = {
  id: string
  deckId: string
  deckTitle: string
  deckColor: string
  deckIcon: string | null
  deckSubject: string | null
  type: CardType
  front: string
  back: string
  extra: Record<string, unknown>
  tags: string[]
  sourceTitle: string | null
  sourceExcerpt: string | null
  state: string
  intervalDays: number
  reps: number
  lapses: number
  ease: number
  dueAt: string
  due: boolean
  previewLabels: RatingLabel
}

export type ReviewQueueResponse = {
  cards: ReviewQueueCard[]
  remainingNew: number
  remainingReview: number
  now: string
}

export type ReviewAnswerRequest = {
  cardId: string
  rating: ReviewRating
  msTaken: number
  clientReviewId?: string
}

export type ReviewAnswerResponse = {
  cardId: string
  deckId: string
  type: CardType
  front: string
  back: string
  extra: Record<string, unknown>
  tags: string[]
  state: string
  intervalDays: number
  reps: number
  lapses: number
  ease: number
  dueAt: string
  previewLabels: RatingLabel
  xpEarned: number
  leveledUp: boolean
  newLevel: number
  nextCardDueAt: string | null
}

export type ReviewUndoResponse = {
  cardId: string
  deckId: string
  type: CardType
  front: string
  back: string
  extra: Record<string, unknown>
  tags: string[]
  state: string
  intervalDays: number
  reps: number
  lapses: number
  ease: number
  dueAt: string
  previewLabels: RatingLabel
  now: string
}

export type PetDto = {
  userId: string
  species: string
  name: string
  stage: string
  mood: string
  accessories: string[]
  equippedAccessory: string | null
  createdAt: string
  updatedAt: string
}

export type ShopItemDto = {
  id: string
  nameEn: string
  nameKm: string
  kind: string
  price: number
  accessoryType: string | null
  active: boolean
}

export type ShopPurchaseResult = {
  shopItemId: string
  price: number
  remainingCoins: number
  isFreeze: boolean
}

export type UserShopItemDto = {
  id: string
  shopItemId: string
  purchasedAt: string
}

export type QuestDto = {
  id: string
  kind: string
  code: string
  nameKey: string
  target: number
  progress: number
  rewardXp: number
  rewardCoins: number
  questDate: string
  completed: boolean
}

export type QuestProgressRequest = {
  code: string
  source: string
  referenceId?: string
}

export type GameState = {
  userId: string
  xpTotal: number
  level: number
  xpInLevel: number
  coins: number
  streakCurrent: number
  streakBest: number
  streakFreezes: number
  lastActiveDate: string
  dailyXpToday: number
  dailyXpDate: string
  xpToNextLevel: number
}

export type BadgeDto = {
  code: string
  nameEn: string
  nameKm: string
  descriptionEn: string
  descriptionKm: string
  coinsReward: number
  earned: boolean
}

export type XpEventDto = {
  id: string
  source: string
  amount: number
  createdAt: string
  referenceId?: string
}

export type AiTask = 'FLASHCARDS' | 'QUIZ'

export type AiCardItem = {
  type: CardType
  front: string
  back: string
  choices: string[]
  explanation: string | null
  sourceTitle: string | null
  sourceExcerpt: string | null
}

export type AiGenerateInput = {
  task: AiTask
  deckId?: string | null
  sourceText?: string
  sourceTitle?: string
  count?: number
  language?: 'en' | 'km'
}

export type AiTutorInput = {
  question: string
  sourceText?: string
  sourceTitle?: string
}

export type AiTutorResponse = {
  answer: string
  references: { title: string; excerpt: string }[]
}

export const decksApi = {
  list: () => call<DeckSummary[]>(client.GET('/api/v1/decks')),

  get: (id: string) => call<DeckSummary>(client.GET('/api/v1/decks/{id}', { params: { path: { id } } })),

  create: (input: DeckInput) =>
    call<DeckSummary>(client.POST('/api/v1/decks', { body: asBody(input) })),

  update: (id: string, input: Partial<DeckInput>) =>
    call<DeckSummary>(client.PUT('/api/v1/decks/{id}', { params: { path: { id } }, body: asBody(input) })),

  remove: (id: string) => call<void>(client.DELETE('/api/v1/decks/{id}', { params: { path: { id } } })),
}

export const cardsApi = {
  list: (deckId: string) =>
    call<StudyCard[]>(client.GET('/api/v1/decks/{deckId}/cards', { params: { path: { deckId } } })),

  create: (deckId: string, input: CardInput) =>
    call<StudyCard>(
      client.POST('/api/v1/decks/{deckId}/cards', { params: { path: { deckId } }, body: input }),
    ),

  bulk: (deckId: string, cards: CardInput[]) =>
    call<StudyCard[]>(
      client.POST('/api/v1/decks/{deckId}/cards/bulk', { params: { path: { deckId } }, body: { cards } }),
    ),

  update: (id: string, input: Partial<CardInput> & { starred?: boolean; suspended?: boolean }) =>
    call<StudyCard>(client.PUT('/api/v1/cards/{id}', { params: { path: { id } }, body: input })),

  remove: (id: string) => call<void>(client.DELETE('/api/v1/cards/{id}', { params: { path: { id } } })),

  due: (limit = 50) =>
    call<DueCard[]>(client.GET('/api/v1/cards/due', { params: { query: { limit } } })),

}

export const reviewApi = {
  queue: (deckId?: string | null) =>
    call<ReviewQueueResponse>(
      client.GET('/api/v1/review/queue', { params: { query: { deckId: deckId ?? undefined } } }),
    ),

  answer: (input: ReviewAnswerRequest) =>
    call<ReviewAnswerResponse>(client.POST('/api/v1/review/answer', { body: input })),

  undo: (cardId: string) =>
    call<ReviewUndoResponse>(client.POST('/api/v1/review/undo', { params: { query: { cardId } } })),
}

export const gameApi = {
  state: () => call<GameState>(client.GET('/api/v1/game/state')),

  badges: () => call<BadgeDto[]>(client.GET('/api/v1/game/badges')),

  xpHistory: (limit = 20) =>
    call<XpEventDto[]>(client.GET('/api/v1/game/xp-history', { params: { query: { limit } } })),

  consumeStreakFreeze: () =>
    call<void>(client.POST('/api/v1/game/streak-freeze/consume', {})),
}

export const petApi = {
  get: () => call<PetDto>(client.GET('/api/v1/pet')),

  updateMood: () =>
    call<void>(client.POST('/api/v1/pet/mood', {})),

  updateStage: () =>
    call<void>(client.POST('/api/v1/pet/stage', {})),

  rename: (name: string) =>
    call<PetDto>(client.PUT('/api/v1/pet/name', { body: { name } })),

  equip: (accessoryType: string | undefined) =>
    call<void>(client.POST('/api/v1/pet/equip', { body: { accessoryType } })),
}

export const shopApi = {
  items: () => call<ShopItemDto[]>(client.GET('/api/v1/shop')),

  owned: () => call<UserShopItemDto[]>(client.GET('/api/v1/shop/owned')),

  buy: (shopItemId: string) =>
    call<ShopPurchaseResult>(client.POST('/api/v1/shop/buy', { body: { shopItemId } })),
}

export const questApi = {
  today: () => call<QuestDto[]>(client.GET('/api/v1/quests/today')),

  progress: (input: QuestProgressRequest) =>
    call<void>(client.POST('/api/v1/quests/progress', { body: input })),
}

export const aiApi = {
  generate: (input: AiGenerateInput) =>
    call<{ items: AiCardItem[] }>(client.POST('/api/v1/ai/generate', { body: asBody(input) })),

  tutor: (input: AiTutorInput) =>
    call<AiTutorResponse>(client.POST('/api/v1/ai/tutor', { body: input })),
}

export { notesApi, examsApi, tasksApi } from './api/plan'
export { focusSessionsApi } from './api/focus'
export { bossFightsApi } from './api/boss'
