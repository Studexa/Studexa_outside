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

  updateProfile: async (input) => {
    const me = await authApi.updateMe(input)
    syncLocalProfile(me.profile)
    set({ user: me.user, profile: me.profile })
    return me.profile
  },
}))
