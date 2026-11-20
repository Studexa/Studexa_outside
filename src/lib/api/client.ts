import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'

const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const API_PREFIX = '/api/v1'
export const SESSION_REQUEST_TIMEOUT_MS = 8000

export { API_PREFIX as API_URL }

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

let accessToken: string | null = null
let sessionAccountId: string | undefined
let sessionGeneration = 0

export function setAccessToken(token: string | null, accountId?: string) {
  sessionGeneration += 1
  accessToken = token
  sessionAccountId = accountId
}

export function getAccessToken() {
  return accessToken
}

let refreshing: { generation: number; pending: Promise<string | null> } | undefined

export async function refreshAccessToken(): Promise<string | null> {
  const generation = sessionGeneration
  if (refreshing?.generation === generation) return refreshing.pending
  const pending = requestSessionRefresh(generation)
  refreshing = { generation, pending }
  try {
    return await pending
  } finally {
    if (refreshing?.pending === pending) refreshing = undefined
  }
}

async function requestSessionRefresh(generation: number): Promise<string | null> {
  try {
    const response = await fetch(`${API_ORIGIN}${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(SESSION_REQUEST_TIMEOUT_MS),
    })
    const data = response.ok
      ? (await response.json()) as { accessToken?: string; user?: { id: string } }
      : null
    if (generation !== sessionGeneration) return null
    if (!data?.user?.id || (sessionAccountId && sessionAccountId !== data.user.id)) {
      accessToken = null
      return null
    }
    sessionAccountId = data.user.id
    accessToken = data.accessToken ?? null
    return accessToken
  } catch {
    if (generation === sessionGeneration) accessToken = null
    return null
  }
}

const NO_RETRY_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]

function isAuthPath(url: string) {
  const path = new URL(url).pathname
  return NO_RETRY_PATHS.some((suffix) => path.endsWith(suffix))
}

const sessionRequests = new WeakMap<Request, { generation: number; retry?: Request }>()

const authMiddleware: Middleware = {
  onRequest({ request }) {
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`)
    }
    if (!isAuthPath(request.url)) {
      const retry = request.body ? request.clone() : undefined
      sessionRequests.set(request, { generation: sessionGeneration, retry })
    }
    return request
  },

  async onResponse({ request, response }) {
    const initial = sessionRequests.get(request)
    sessionRequests.delete(request)
    if (!initial) return response
    if (initial.generation !== sessionGeneration) {
      throw new ApiError(401, 'SESSION_CHANGED', 'Your account changed. Please retry.')
    }
    if (response.status !== 401 || !sessionAccountId) return response
    const token = await refreshAccessToken()
    if (!token || initial.generation !== sessionGeneration) {
      return response
    }
    const retry = initial.retry ?? request.clone()
    retry.headers.set('Authorization', `Bearer ${token}`)
    const retried = await fetch(retry)
    if (initial.generation !== sessionGeneration) {
      throw new ApiError(401, 'SESSION_CHANGED', 'Your account changed. Please retry.')
    }
    return retried
  },
}

export const client = createClient<paths>({
  baseUrl: API_ORIGIN,
  credentials: 'include',
})

client.use(authMiddleware)

type ProblemBody = {
  code?: string
  detail?: string
  message?: string
  title?: string
  fields?: Record<string, string>
}

function toApiError(response: Response, body: unknown): ApiError {
  const data = (typeof body === 'object' && body !== null ? body : {}) as ProblemBody
  return new ApiError(
    response.status,
    data.code ?? 'REQUEST_FAILED',
    data.detail ?? data.message ?? data.title ?? 'Something went wrong. Please try again.',
    data.fields,
  )
}

export type FetchResult<T> = {
  data?: T
  error?: unknown
  response: Response
}

export async function call<T>(result: Promise<FetchResult<unknown>>): Promise<T> {
  const { data, error, response } = await result
  if (!response.ok) {
    throw toApiError(response, error)
  }
  return data as T
}

export function asBody(value: unknown): never {
  return value as never
}
