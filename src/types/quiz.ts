export namespace QuizDto {
  export interface QuizRequest {
    title: string
    description?: string
    subject?: string
    visibility?: string
  }

  export interface QuizResponse {
    id: string
    ownerId: string
    title: string
    description?: string
    subject?: string
    visibility: string
    createdAt: string
  }

  export interface QuestionRequest {
    text: string
    type: string
    options?: string
    correctAnswer: string
    explanation?: string
    subject?: string
    topic?: string
    subtopic?: string
    difficulty?: string
    timeLimitSeconds?: number
  }

  export interface QuestionResponse {
    id: string
    quizId: string
    text: string
    type: string
    options?: string
    correctAnswer: string
    explanation?: string
    subject?: string
    topic?: string
    subtopic?: string
    difficulty: string
    timeLimitSeconds: number
    createdAt: string
  }

  export interface CreateSessionRequest {
    quizId: string
    mode?: string
    numQuestions?: number
    timePerQuestion?: number
    difficulty?: string
  }

  export interface SessionResponse {
    id: string
    quizId: string
    hostId: string
    roomCode: string
    mode: string
    status: string
    settings?: string
    startedAt?: string
    endedAt?: string
    createdAt: string
  }

  export interface SessionPlayerResponse {
    id: string
    sessionId: string
    userId?: string
    nickname: string
    avatarUrl?: string
    teamId?: string
    totalScore: number
    finalRank?: number
    isReady: boolean
    isHost: boolean
  }

  export interface JoinRoomRequest {
    roomCode: string
    nickname: string
  }

  export interface RoomInfoResponse {
    session: SessionResponse
    players: SessionPlayerResponse[]
  }

  export interface AnswerRequest {
    sessionPlayerId: string
    questionId: string
    selectedAnswer: string
    responseTimeMs: number
  }

  export interface AnswerResponse {
    id: string
    isCorrect: boolean
    scoreAwarded: number
    correctAnswer: string
    explanation?: string
  }

  export interface LeaderboardEntry {
    nickname: string
    totalScore: number
    finalRank?: number
    isHost: boolean
  }
}
