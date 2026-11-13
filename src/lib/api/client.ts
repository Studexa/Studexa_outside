import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'

const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const API_PREFIX = '/api/v1'

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

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

let refreshing: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_ORIGIN}${API_PREFIX}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) {
          accessToken = null
          return null
        }
        const data = (await res.json()) as { accessToken?: string }
        accessToken = data.accessToken ?? null
        return accessToken
      } catch {
        accessToken = null
        return null
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
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

const authMiddleware: Middleware = {
  onRequest({ request }) {
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`)
    }
    return request
  },

  async onResponse({ request, response }) {
    if (response.status !== 401 || isAuthPath(request.url)) {
      return response
    }
    const token = await refreshAccessToken()
    if (!token) {
      return response
    }
    const retry = request.clone()
    retry.headers.set('Authorization', `Bearer ${token}`)
    return fetch(retry)
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
