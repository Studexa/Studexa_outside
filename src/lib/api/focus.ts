import { getAccessToken, refreshAccessToken } from './client'

const API_BASE = '/api/v1'

type RequestInitWithJson = Omit<RequestInit, 'body'> & { body?: unknown }

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

  let accessToken: string | null = getAccessToken()

  let res = await send(accessToken)

  if (res.status === 401) {
    const token = await refreshAccessToken()
    if (token) res = await send(token)
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      code?: string
      detail?: string
      message?: string
      title?: string
    }
    const code = err.code ? `[${err.code}] ` : ''
    throw new Error(`${code}${err.detail || err.message || err.title || `Request failed: ${res.status}`}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const focusSessionsApi = {
  list: () => request<FocusSessionDto[]>('/focus-sessions'),
  listByRange: (start: string, end: string) =>
    request<FocusSessionDto[]>(
      `/focus-sessions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ),
  get: (id: string) => request<FocusSessionDto>(`/focus-sessions/${id}`),
  create: (input: FocusSessionInput) =>
    request<FocusSessionDto>('/focus-sessions', { method: 'POST', body: input }),
  remove: (id: string) => request<void>(`/focus-sessions/${id}`, { method: 'DELETE' }),
  count: (start: string, end: string) =>
    request<number>(
      `/focus-sessions/count?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ),
}