import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import { getAccessToken, refreshAccessToken } from './api/client'

function brokerUrl() {
  const override = import.meta.env.VITE_WS_URL as string | undefined
  if (override) return override
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/quiz`
}

function tokenNeedsRefresh(token: string) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload)) as { exp?: number }
    return typeof exp !== 'number' || exp * 1000 <= Date.now() + 60_000
  } catch {
    return true
  }
}

export function useRoomUpdates(roomCode: string | undefined, refresh: () => unknown) {
  useEffect(() => {
    if (!roomCode) return
    const client = new Client({
      brokerURL: brokerUrl(),
      reconnectDelay: 3000,
      connectionTimeout: 7000,
      beforeConnect: async () => {
        const current = getAccessToken()
        const token = current && !tokenNeedsRefresh(current) ? current : await refreshAccessToken()
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      },
      onConnect: () => {
        client.subscribe(`/topic/room/${roomCode}`, () => { void refresh() })
        void refresh()
      },
    })
    client.activate()
    return () => { void client.deactivate() }
  }, [roomCode, refresh])
}
