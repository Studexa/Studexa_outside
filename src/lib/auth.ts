import { create } from 'zustand'
import {
  authApi,
  restoreSession,
  setAccessToken,
  type AuthResponse,
  type Profile,
  type UpdateProfileInput,
  type User,
} from './api'
import { queryClient } from './queryClient'
import { useApp } from './store'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type AuthState = {
  status: AuthStatus
  user: User | null
  profile: Profile | null
  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: { email: string; password: string; nickname: string; language?: 'en' | 'km' }) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (input: UpdateProfileInput) => Promise<Profile>
  loginAsGuest: () => void
}

function syncLocalProfile(profile: Profile) {
  const local = useApp.getState()
  local.setNickname(profile.nickname)
  useApp.setState({ dailyGoal: profile.dailyGoalCards })
}

function applySession(response: AuthResponse) {
  setAccessToken(response.accessToken)
  syncLocalProfile(response.profile)
  return { user: response.user, profile: response.profile }
}

function resetClientState() {
  queryClient.clear()
  useApp.getState().resetAll()
}

export const useAuth = create<AuthState>()((set, get) => ({
  status: 'idle',
  user: null,
  profile: null,

  bootstrap: async () => {
    const status = get().status
    if (status === 'loading' || status === 'authenticated') return

    if (typeof window !== 'undefined' && localStorage.getItem('studexa_guest_mode') === 'true') {
      get().loginAsGuest()
      return
    }

    set({ status: 'loading' })
    try {
      const me = await restoreSession()
      if (!me) {
        set({ status: 'unauthenticated', user: null, profile: null })
        return
      }
      syncLocalProfile(me.profile)
      set({ status: 'authenticated', user: me.user, profile: me.profile })
    } catch {
      set({ status: 'unauthenticated', user: null, profile: null })
    }
  },

  login: async (email, password) => {
    const response = await authApi.login({ email, password })
    resetClientState()
    const session = applySession(response)
    set({ status: 'authenticated', ...session })
  },

  register: async (input) => {
    const response = await authApi.register(input)
    resetClientState()
    const session = applySession(response)
    set({ status: 'authenticated', ...session })
  },

  logout: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('studexa_guest_mode')
    }
    try {
      await authApi.logout()
    } catch {
      // The refresh cookie may already be gone; clear local state regardless.
    } finally {
      setAccessToken(null)
      resetClientState()
      set({ status: 'unauthenticated', user: null, profile: null })
    }
  },

  loginAsGuest: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studexa_guest_mode', 'true')
    }
    const guestUser: User = {
      id: 'demo-guest-user',
      email: 'guest@studexa.local',
      role: 'STUDENT',
      createdAt: new Date().toISOString(),
    }
    const guestProfile: Profile = {
      userId: 'demo-guest-user',
      nickname: 'Demo Student',
      avatar: null,
      language: 'en',
      levelOfStudy: 'university',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      dailyGoalCards: 20,
      dailyGoalMinutes: 30,
      updatedAt: new Date().toISOString(),
    }
    syncLocalProfile(guestProfile)
    set({ status: 'authenticated', user: guestUser, profile: guestProfile })
  },

  updateProfile: async (input) => {
    if (typeof window !== 'undefined' && localStorage.getItem('studexa_guest_mode') === 'true') {
      const current = get().profile
      const guestProfile: Profile = {
        userId: current?.userId ?? 'demo-guest-user',
        nickname: input.nickname ?? current?.nickname ?? 'Demo Student',
        avatar: input.avatar !== undefined ? input.avatar : (current?.avatar ?? null),
        language: input.language ?? current?.language ?? 'en',
        levelOfStudy: input.levelOfStudy !== undefined ? input.levelOfStudy : (current?.levelOfStudy ?? null),
        timezone: input.timezone ?? current?.timezone ?? 'UTC',
        dailyGoalCards: input.dailyGoalCards ?? current?.dailyGoalCards ?? 20,
        dailyGoalMinutes: input.dailyGoalMinutes ?? current?.dailyGoalMinutes ?? 30,
        updatedAt: new Date().toISOString(),
      }
      syncLocalProfile(guestProfile)
      set({ profile: guestProfile })
      return guestProfile
    }

    try {
      const me = await authApi.updateMe(input)
      syncLocalProfile(me.profile)
      set({ user: me.user, profile: me.profile })
      return me.profile
    } catch (err) {
      const current = get().profile
      if (current) {
        const fallbackProfile: Profile = {
          ...current,
          ...input,
          updatedAt: new Date().toISOString(),
        }
        syncLocalProfile(fallbackProfile)
        set({ profile: fallbackProfile })
        return fallbackProfile
      }
      throw err
    }
  },
}))
