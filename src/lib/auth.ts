import { create } from 'zustand'
import {
  authApi,
  restoreSession,
  setAccessToken,
  type AuthResponse,
  type Profile,
  type RegisterInput,
  type UpdateProfileInput,
  type User,
} from './api'
import { queryClient } from './queryClient'
import { useApp } from './store'
import { clearOfflineAccount } from './offlineDb'
import { betaEnabled } from './beta'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type AuthState = {
  status: AuthStatus
  user: User | null
  profile: Profile | null
  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (input: UpdateProfileInput) => Promise<Profile>
  loginAsGuest: () => void
}

function syncLocalProfile(profile: Profile, restoreOnboarding = false) {
  const local = useApp.getState()
  local.setNickname(profile.nickname)
  useApp.setState({
    dailyGoal: profile.dailyGoalCards,
    ...(restoreOnboarding && { onboarded: Boolean(profile.levelOfStudy) }),
  })
}

function applySession(response: AuthResponse) {
  setAccessToken(response.accessToken, response.user.id)
  syncLocalProfile(response.profile, true)
  return { user: response.user, profile: response.profile }
}

function resetClientState(previousUserId?: string) {
  queryClient.clear()
  useApp.getState().resetAll()
  if (previousUserId && previousUserId !== 'demo-guest-user') {
    void clearOfflineAccount(previousUserId).catch(() => undefined)
  }
}

/** True when the app is running in isolated guest/demo mode (no backend calls). */
export function isGuestMode(): boolean {
  return !betaEnabled && typeof window !== 'undefined' && localStorage.getItem('studexa_guest_mode') === 'true'
}

export const useAuth = create<AuthState>()((set, get) => ({
  status: 'idle',
  user: null,
  profile: null,

  bootstrap: async () => {
    const status = get().status
    if (status === 'loading' || status === 'authenticated') return

    if (isGuestMode()) {
      get().loginAsGuest()
      return
    }

    set({ status: 'loading' })
    try {
      const me = await restoreSession()
      if (get().status !== 'loading') return
      if (!me) {
        resetClientState()
        set({ status: 'unauthenticated', user: null, profile: null })
        return
      }
      localStorage.removeItem('studexa_guest_mode')
      resetClientState()
      syncLocalProfile(me.profile, true)
      set({ status: 'authenticated', user: me.user, profile: me.profile })
    } catch {
      if (get().status === 'loading') {
        setAccessToken(null)
        resetClientState()
        set({ status: 'unauthenticated', user: null, profile: null })
      }
    }
  },

  login: async (email, password) => {
    const response = await authApi.login({ email, password })
    localStorage.removeItem('studexa_guest_mode')
    resetClientState(get().user?.id)
    const session = applySession(response)
    set({ status: 'authenticated', ...session })
  },

  register: async (input) => {
    const response = await authApi.register(input)
    localStorage.removeItem('studexa_guest_mode')
    resetClientState(get().user?.id)
    const session = applySession(response)
    set({ status: 'authenticated', ...session })
  },

  logout: async () => {
    const previousUserId = get().user?.id
    setAccessToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('studexa_guest_mode')
    }
    resetClientState(previousUserId)
    set({ status: 'unauthenticated', user: null, profile: null })
    try {
      await authApi.logout()
    } catch {
      // The refresh cookie may already be gone; clear local state regardless.
    }
  },

  loginAsGuest: () => {
    if (betaEnabled) return
    if (typeof window !== 'undefined') {
      if (!isGuestMode()) resetClientState(get().user?.id)
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
    const userId = get().user?.id
    if (isGuestMode()) {
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
      if (get().user?.id !== userId) throw new Error('Your account changed.')
      syncLocalProfile(me.profile)
      set({ user: me.user, profile: me.profile })
      return me.profile
    } catch (err) {
      const current = get().profile
      if (current && get().user?.id === userId && !betaEnabled) {
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
