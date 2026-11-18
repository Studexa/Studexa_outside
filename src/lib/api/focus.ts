import { call, client } from './client'

export type FocusSessionDto = {
  id: string
  minutes: number
  completedAt: string
  createdAt: string
  updatedAt: string
}

export type FocusSessionInput = {
  minutes: number
  completedAt: string
}

export const focusSessionsApi = {
  list: () => call<FocusSessionDto[]>(client.GET('/api/v1/focus-sessions')),
  listByRange: (start: string, end: string) =>
    call<FocusSessionDto[]>(client.GET('/api/v1/focus-sessions', { params: { query: { start, end } } })),
  get: (id: string) =>
    call<FocusSessionDto>(client.GET('/api/v1/focus-sessions/{id}', { params: { path: { id } } })),
  create: (input: FocusSessionInput) =>
    call<FocusSessionDto>(client.POST('/api/v1/focus-sessions', { body: input })),
  remove: (id: string) =>
    call<void>(client.DELETE('/api/v1/focus-sessions/{id}', { params: { path: { id } } })),
  count: (start: string, end: string) =>
    call<number>(client.GET('/api/v1/focus-sessions/count', { params: { query: { start, end } } })),
}
