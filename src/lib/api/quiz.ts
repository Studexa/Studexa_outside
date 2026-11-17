import type { QuizDto } from '../../types/quiz'
import { getAccessToken, refreshAccessToken } from './client'

const API_BASE = '/api/v1'

type RequestInitWithJson = Omit<RequestInit, 'body'> & { body?: unknown }

/**
 * Quiz/session endpoints live outside the generated OpenAPI schema, so they use
 * this small wrapper. It mirrors the main client's behaviour: Bearer token from
 * the in-memory store, cookies for the refresh token, one retry after a silent
 * refresh when the access token has expired.
 */
async function request<T>(path: string, init: RequestInitWithJson = {}): Promise<T> {
  const url = `${API_BASE}${path}`

  const send = (token: string | null) =>
    fetch(url, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })

  let res = await send(getAccessToken())

  if (res.status === 401) {
    const token = await refreshAccessToken()
    if (token) {
      res = await send(token)
    }
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string; message?: string }
    throw new Error(err.detail || err.message || `Request failed: ${res.status}`)
  }

  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

/** Quiz endpoints */
export const quizApi = {
  createQuiz: (body: QuizDto.QuizRequest) =>
    request<QuizDto.QuizResponse>('/quizzes', { method: 'POST', body }),
  listQuizzes: () => request<QuizDto.QuizResponse[]>('/quizzes'),
  listPublicQuizzes: () => request<QuizDto.QuizResponse[]>('/quizzes/public'),
  getQuiz: (id: string) =>
    request<{ quiz: QuizDto.QuizResponse; questions: QuizDto.QuestionResponse[] }>(
      `/quizzes/${id}`,
    ),
  addQuestion: (id: string, body: QuizDto.QuestionRequest) =>
    request<QuizDto.QuestionResponse>(`/quizzes/${id}/questions`, { method: 'POST', body }),
}

/** Session (room) endpoints */
export const sessionApi = {
  createSession: (body: QuizDto.CreateSessionRequest) =>
    request<QuizDto.SessionResponse>('/sessions', { method: 'POST', body }),
  getRoom: (code: string) =>
    request<QuizDto.RoomInfoResponse>(`/sessions/room/${encodeURIComponent(code)}`),
  startSession: (id: string) =>
    request<QuizDto.SessionResponse>(`/sessions/${id}/start`, { method: 'POST' }),
  getPlayers: (id: string) => request<QuizDto.SessionPlayerResponse[]>(`/sessions/${id}/players`),
  joinSession: (id: string, body: QuizDto.JoinRoomRequest) =>
    request<QuizDto.SessionPlayerResponse>(`/sessions/${id}/players`, { method: 'POST', body }),
  getLeaderboard: (id: string) => request<QuizDto.LeaderboardEntry[]>(`/sessions/${id}/leaderboard`),
}

/** Answer endpoints */
export const answerApi = {
  submitAnswer: (body: QuizDto.AnswerRequest) =>
    request<QuizDto.AnswerResponse>('/answers', { method: 'POST', body }),
  getPlayerAnswers: (sessionId: string, playerId: string) =>
    request<QuizDto.AnswerResponse[]>(
      `/answers/session/${sessionId}/player/${playerId}`,
    ),
}
