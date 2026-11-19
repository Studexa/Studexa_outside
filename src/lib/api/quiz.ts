import type { QuizDto } from '../../types/quiz'
import { call, client } from './client'

export const quizApi = {
  createQuiz: (body: QuizDto.QuizRequest) =>
    call<QuizDto.QuizResponse>(client.POST('/api/v1/quizzes', { body })),
  listQuizzes: () => call<QuizDto.QuizResponse[]>(client.GET('/api/v1/quizzes')),
  listPublicQuizzes: () => call<QuizDto.QuizResponse[]>(client.GET('/api/v1/quizzes/public')),
  getQuiz: (id: string) => call<{ quiz: QuizDto.QuizResponse; questions: QuizDto.QuestionResponse[] }>(
    client.GET('/api/v1/quizzes/{id}', { params: { path: { id } } }),
  ),
  addQuestion: (id: string, body: QuizDto.QuestionRequest) => call<QuizDto.QuestionResponse>(
    client.POST('/api/v1/quizzes/{id}/questions', { params: { path: { id } }, body }),
  ),
}

export const sessionApi = {
  createSession: (body: QuizDto.CreateSessionRequest) =>
    call<QuizDto.SessionResponse>(client.POST('/api/v1/sessions', { body })),
  getRoom: (code: string) => call<QuizDto.RoomInfoResponse>(
    client.GET('/api/v1/sessions/room/{code}', { params: { path: { code } } }),
  ),
  startSession: (id: string) => call<QuizDto.SessionResponse>(
    client.POST('/api/v1/sessions/{id}/start', { params: { path: { id } } }),
  ),
  getState: (id: string) => call<QuizDto.LiveState>(
    client.GET('/api/v1/sessions/{id}/state', { params: { path: { id } } }),
  ),
  advance: (id: string, questionId: string) => call<void>(
    client.POST('/api/v1/sessions/{id}/advance', { params: { path: { id } }, body: { questionId } }),
  ),
  getPlayers: (id: string) => call<QuizDto.SessionPlayerResponse[]>(
    client.GET('/api/v1/sessions/{id}/players', { params: { path: { id } } }),
  ),
  joinSession: (id: string, body: QuizDto.JoinRoomRequest) => call<QuizDto.SessionPlayerResponse>(
    client.POST('/api/v1/sessions/{id}/players', { params: { path: { id } }, body }),
  ),
  getLeaderboard: (id: string) => call<QuizDto.LeaderboardEntry[]>(
    client.GET('/api/v1/sessions/{id}/leaderboard', { params: { path: { id } } }),
  ),
}

export const answerApi = {
  submitAnswer: (body: QuizDto.AnswerRequest) => call<QuizDto.AnswerResponse>(client.POST('/api/v1/answers', { body })),
  getPlayerAnswers: (sessionId: string, playerId: string) => call<QuizDto.AnswerResponse[]>(
    client.GET('/api/v1/answers/session/{sessionId}/player/{playerId}', { params: { path: { sessionId, playerId } } }),
  ),
}
