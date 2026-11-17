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

  let accessToken: string | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAccessToken } = require('./client')
    accessToken = getAccessToken()
  } catch {}

  let res = await send(accessToken)

  if (res.status === 401) {
    try {
      const { refreshAccessToken } = require('./client')
      const token = await refreshAccessToken()
      if (token) res = await send(token)
    } catch {}
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string; message?: string }
    throw new Error(err.detail || err.message || `Request failed: ${res.status}`)
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