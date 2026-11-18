import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, call, getAccessToken, refreshAccessToken, setAccessToken } from './client'

function response(status: number): Response {
  return new Response(null, { status })
}

describe('call', () => {
  it('returns the data when the response is ok', async () => {
    const data = await call<{ id: string }>(
      Promise.resolve({ data: { id: 'card-1' }, response: response(200) }),
    )
    expect(data).toEqual({ id: 'card-1' })
  })

  it('throws ApiError built from the RFC 7807 problem', async () => {
    const result = call(
      Promise.resolve({
        error: { code: 'VALIDATION_ERROR', detail: 'Please check the fields.', fields: { name: 'required' } },
        response: response(400),
      }),
    )
    await expect(result).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Please check the fields.',
      fields: { name: 'required' },
    })
  })

  it('falls back to a generic message when the body has no detail', async () => {
    const error = (await call(Promise.resolve({ error: {}, response: response(500) })).catch((e) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toMatch(/Something went wrong/)
    expect(error.code).toBe('REQUEST_FAILED')
  })
})

describe('session refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('rejects a refresh cookie for a different account', async () => {
    setAccessToken('expired-a', 'account-a')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      accessToken: 'fresh-b', user: { id: 'account-b' },
    })))
    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('keeps the new session if an old refresh finishes after switching accounts', async () => {
    setAccessToken('expired-a', 'account-a')
    let finishRefresh!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRefresh = resolve })))
    const refresh = refreshAccessToken()
    setAccessToken('fresh-b', 'account-b')
    finishRefresh(Response.json({ accessToken: 'fresh-a', user: { id: 'account-a' } }))
    await expect(refresh).resolves.toBeNull()
    expect(getAccessToken()).toBe('fresh-b')
  })
})
