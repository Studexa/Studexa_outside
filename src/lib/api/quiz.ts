import type {
  QuizDto,
  CreateSessionRequest,
  JoinRoomRequest,
  AnswerRequest,
} from '../../types/quiz'

const API_BASE = '/api/v1'

async function request<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${input.toString().replace(API_BASE, '')}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** Quiz endpoints */
export const quizApi = {
  createQuiz: (body: { title: string; description?: string; subject?: string; visibility?: string }) =>
    request<QuizDto.QuizResponse>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listQuizzes: () => request<QuizDto.QuizResponse[]>('/quizzes'),
  listPublicQuizzes: () => request<QuizDto.QuizResponse[]>('/quizzes/public'),
  getQuiz: (id: string) =>
    request<{ quiz: QuizDto.QuizResponse; questions: QuizDto.QuestionResponse[] }>(
      `/quizzes/${id}`,
    ),
  addQuestion: (id: string, body: QuizDto.QuestionRequest) =>
    request<QuizDto.QuestionResponse>(`/quizzes/${id}/questions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

/** Session (room) endpoints */
export const sessionApi = {
  createSession: (body: CreateSessionRequest) =>
    request<QuizDto.SessionResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getRoom: (code: string) =>
    request<QuizDto.RoomInfoResponse>(`/sessions/room/${code}`),
  startSession: (id: string) =>
    request<QuizDto.SessionResponse>(`/sessions/${id}/start`, { method: 'POST' }),
  getPlayers: (id: string) => request<QuizDto.SessionPlayerResponse[]>(`/sessions/${id}/players`),
  joinSession: (id: string, body: JoinRoomRequest) =>
    request<QuizDto.SessionPlayerResponse>(`/sessions/${id}/players`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getLeaderboard: (id: string) => request<QuizDto.LeaderboardEntry[]>(`/sessions/${id}/leaderboard`),
}

/** Answer endpoints */
export const answerApi = {
  submitAnswer: (body: AnswerRequest) =>
    request<QuizDto.AnswerResponse>('/answers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getPlayerAnswers: (sessionId: string, playerId: string) =>
    request<QuizDto.AnswerResponse[]>(
      `/answers/session/${sessionId}/player/${playerId}`,
    ),
}
