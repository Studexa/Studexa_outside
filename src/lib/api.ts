const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

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

let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  auth?: boolean
  retryOnUnauthorized?: boolean
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) {
          accessToken = null
          return null
        }
        const data = (await res.json()) as AuthResponse
        accessToken = data.accessToken
        return accessToken
      } catch {
        accessToken = null
        return null
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

async function send(path: string, options: RequestOptions, token: string | null) {
  const { body, auth = true, headers, ...init } = options
  const finalHeaders = new Headers(headers)
  if (body !== undefined) {
    finalHeaders.set('Content-Type', 'application/json')
  }
  if (auth && token) {
    finalHeaders.set('Authorization', `Bearer ${token}`)
  }
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: finalHeaders,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function toApiError(res: Response): Promise<ApiError> {
  let data: { code?: string; message?: string; fields?: Record<string, string> } = {}
  try {
    data = (await res.json()) as typeof data
  } catch {
    // Fall through to a generic message.
  }
  return new ApiError(
    res.status,
    data.code ?? 'REQUEST_FAILED',
    data.message ?? 'Something went wrong. Please try again.',
    data.fields,
  )
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, retryOnUnauthorized = true } = options
  let res = await send(path, options, accessToken)

  if (res.status === 401 && auth && retryOnUnauthorized) {
    const token = await refreshAccessToken()
    if (token) {
      res = await send(path, { ...options, retryOnUnauthorized: false }, token)
    }
  }

  if (!res.ok) {
    throw await toApiError(res)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export const authApi = {
  register: (input: { email: string; password: string; nickname: string; language?: 'en' | 'km' }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST', retryOnUnauthorized: false }),

  me: () => request<Me>('/me'),

  updateMe: (input: UpdateProfileInput) =>
    request<Me>('/me', { method: 'PUT', body: input }),
}

export async function restoreSession(): Promise<Me | null> {
  const token = await refreshAccessToken()
  if (!token) return null
  return authApi.me()
}

export const subjectsApi = {
  list: (archived?: boolean) =>
    request<Subject[]>(`/subjects${archived === undefined ? '' : `?archived=${archived}`}`),

  create: (input: SubjectInput) =>
    request<Subject>('/subjects', { method: 'POST', body: input }),

  update: (id: string, input: UpdateSubjectInput) =>
    request<Subject>(`/subjects/${id}`, { method: 'PUT', body: input }),

  remove: (id: string) => request<void>(`/subjects/${id}`, { method: 'DELETE' }),
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
  list: () => request<DeckSummary[]>('/decks'),

  get: (id: string) => request<DeckSummary>(`/decks/${id}`),

  create: (input: DeckInput) => request<DeckSummary>('/decks', { method: 'POST', body: input }),

  update: (id: string, input: Partial<DeckInput>) =>
    request<DeckSummary>(`/decks/${id}`, { method: 'PUT', body: input }),

  remove: (id: string) => request<void>(`/decks/${id}`, { method: 'DELETE' }),
}

export const cardsApi = {
  list: (deckId: string) => request<StudyCard[]>(`/decks/${deckId}/cards`),

  create: (deckId: string, input: CardInput) =>
    request<StudyCard>(`/decks/${deckId}/cards`, { method: 'POST', body: input }),

  bulk: (deckId: string, cards: CardInput[]) =>
    request<StudyCard[]>(`/decks/${deckId}/cards/bulk`, { method: 'POST', body: { cards } }),

  update: (id: string, input: Partial<CardInput> & { starred?: boolean; suspended?: boolean }) =>
    request<StudyCard>(`/cards/${id}`, { method: 'PUT', body: input }),

  remove: (id: string) => request<void>(`/cards/${id}`, { method: 'DELETE' }),

  due: (limit = 50) => request<DueCard[]>(`/cards/due?limit=${limit}`),

  review: (id: string, rating: ReviewRating) =>
    request<StudyCard>(`/cards/${id}/review`, { method: 'POST', body: { rating } }),
}

export const aiApi = {
  generate: (input: AiGenerateInput) =>
    request<{ items: AiCardItem[] }>('/ai/generate', { method: 'POST', body: input }),

  tutor: (input: AiTutorInput) =>
    request<AiTutorResponse>('/ai/tutor', { method: 'POST', body: input }),
}

export { API_URL }
