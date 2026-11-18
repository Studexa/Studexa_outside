import { call, client } from './client'

export type BossFightDto = {
  id: string
  won: boolean
  questionsCount: number
  heartsRemaining: number
  completedAt: string
  createdAt: string
  updatedAt: string
}

export type BossFightInput = {
  won: boolean
  questionsCount: number
  heartsRemaining: number
  completedAt: string
}

export const bossFightsApi = {
  list: () => call<BossFightDto[]>(client.GET('/api/v1/boss-fights')),
  listByRange: (start: string, end: string) =>
    call<BossFightDto[]>(client.GET('/api/v1/boss-fights', { params: { query: { start, end } } })),
  get: (id: string) =>
    call<BossFightDto>(client.GET('/api/v1/boss-fights/{id}', { params: { path: { id } } })),
  create: (input: BossFightInput) =>
    call<BossFightDto>(client.POST('/api/v1/boss-fights', { body: input })),
  remove: (id: string) =>
    call<void>(client.DELETE('/api/v1/boss-fights/{id}', { params: { path: { id } } })),
  count: (start: string, end: string) =>
    call<number>(client.GET('/api/v1/boss-fights/count', { params: { query: { start, end } } })),
  countWins: () => call<number>(client.GET('/api/v1/boss-fights/wins/count')),
}
