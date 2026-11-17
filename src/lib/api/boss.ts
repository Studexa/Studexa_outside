const API_BASE = '/api/v1'

type RequestInitWithJson = Omit<RequestInit, 'body'> & { body?: unknown }

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

export const bossFightsApi = {
  list: () => request<BossFightDto[]>('/boss-fights'),
  listByRange: (start: string, end: string) =>
    request<BossFightDto[]>(
      `/boss-fights?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ),
  get: (id: string) => request<BossFightDto>(`/boss-fights/${id}`),
  create: (input: BossFightInput) =>
    request<BossFightDto>('/boss-fights', { method: 'POST', body: input }),
  remove: (id: string) => request<void>(`/boss-fights/${id}`, { method: 'DELETE' }),
  count: (start: string, end: string) =>
    request<number>(
      `/boss-fights/count?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ),
  countWins: () => request<number>('/boss-fights/wins/count'),
}