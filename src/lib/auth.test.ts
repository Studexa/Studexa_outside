import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loginMock, logoutMock, registerMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
  registerMock: vi.fn(),
}))

vi.mock('./api', () => ({
  authApi: {
    login: loginMock,
    logout: logoutMock,
    register: registerMock,
  },
  restoreSession: vi.fn(),
  setAccessToken: vi.fn(),
}))

import { useAuth } from './auth'
import { queryClient } from './queryClient'
import { useApp } from './store'

const user = {
  id: 'user-b',
  email: 'b@example.com',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00Z',
}

const profile = {
  userId: 'user-b',
  nickname: 'Bopha',
  avatar: null,
  language: 'en' as const,
  levelOfStudy: null,
  timezone: 'Asia/Phnom_Penh',
  dailyGoalCards: 20,
  dailyGoalMinutes: 10,
  updatedAt: '2026-01-01T00:00:00Z',
}

const authResponse = {
  accessToken: 'token-b',
  tokenType: 'Bearer',
  expiresIn: 900,
  user,
  profile,
}

beforeEach(() => {
  localStorage.clear()
  loginMock.mockReset()
  logoutMock.mockReset()
  registerMock.mockReset()
  useApp.getState().resetAll()
  useAuth.setState({ status: 'idle', user: null, profile: null })
})

describe('account switching', () => {
  it('clears the previous account progress when a new user logs in', async () => {
    useApp.setState({ level: 99, xp: 9999, coins: 12345, onboarded: true })
    const clearSpy = vi.spyOn(queryClient, 'clear')
    loginMock.mockResolvedValue(authResponse)

    await useAuth.getState().login('b@example.com', 'secret')

    const app = useApp.getState()
    expect(app.level).toBe(1)
    expect(app.xp).toBe(0)
    expect(app.coins).toBe(0)
    expect(clearSpy).toHaveBeenCalled()
    expect(useAuth.getState().status).toBe('authenticated')
  })

  it('applies the new account profile after the reset', async () => {
    loginMock.mockResolvedValue(authResponse)

    await useAuth.getState().login('b@example.com', 'secret')

    const app = useApp.getState()
    expect(app.nickname).toBe('Bopha')
    expect(app.dailyGoal).toBe(20)
  })

  it('clears the account state on logout', async () => {
    useApp.setState({ level: 42, xp: 5000, onboarded: true })
    useAuth.setState({ status: 'authenticated' })
    logoutMock.mockResolvedValue(undefined)

    await useAuth.getState().logout()

    expect(useApp.getState().level).toBe(1)
    expect(useApp.getState().xp).toBe(0)
    expect(useAuth.getState().status).toBe('unauthenticated')
  })
})
