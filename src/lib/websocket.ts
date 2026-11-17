import { Client } from '@stomp/stompjs'
import type { IMessage } from '@stomp/stompjs'
import { getAccessToken, refreshAccessToken } from './api/client'

let stompClient: Client | null = null
let activeRoom = ''
let roomSubscription: { unsubscribe: () => void } | null = null

type MessageHandler = (destination: string, body: any) => void

/**
 * Resolve the STOMP endpoint. In development the Vite dev server proxies
 * `/quiz` (including the WebSocket upgrade) to the backend, so using the page
 * origin works both locally and in production. `VITE_WS_URL` overrides it for
 * split-origin deployments.
 */
function brokerUrl(): string {
  const override = import.meta.env.VITE_WS_URL as string | undefined
  if (override) {
    return override
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/quiz`
}

function tokenNeedsRefresh(token: string): boolean {
  try {
    const encoded = token.split('.')[1]
    if (!encoded) return true
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as { exp?: number }
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + 60_000
  } catch {
    return true
  }
}

export function connectWebSocket(
  roomCode: string,
  onMessage: MessageHandler,
  onConnect?: () => void,
  onDisconnect?: () => void,
) {
  const destination = `/topic/room/${roomCode}`
  if (stompClient?.connected && activeRoom === roomCode) {
    roomSubscription?.unsubscribe()
    roomSubscription = stompClient.subscribe(destination, (message: IMessage) => {
      try {
        onMessage(destination, JSON.parse(message.body))
      } catch {
        onMessage(destination, message.body)
      }
    })
    onConnect?.()
    return stompClient
  }

  if (stompClient) {
    roomSubscription?.unsubscribe()
    void stompClient.deactivate()
    stompClient = null
  }

  const client = new Client({
    brokerURL: brokerUrl(),
    connectHeaders: {},
    beforeConnect: async () => {
      // Reconnects may happen after the short-lived access token expires.
      const currentToken = getAccessToken()
      const token = currentToken && !tokenNeedsRefresh(currentToken)
        ? currentToken
        : (await refreshAccessToken()) ?? currentToken
      client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
    },
    reconnectDelay: 4000,
    debug: (msg) => console.log('[STOMP]', msg),
    onConnect: () => {
      stompClient = client
      activeRoom = roomCode
      roomSubscription = client.subscribe(destination, (message: IMessage) => {
        try {
          onMessage(destination, JSON.parse(message.body))
        } catch {
          onMessage(destination, message.body)
        }
      })
      onConnect?.()
    },
    onDisconnect: () => {
      if (stompClient === client) {
        roomSubscription = null
        activeRoom = ''
        stompClient = null
      }
      onDisconnect?.()
    },
    onWebSocketClose: () => onDisconnect?.(),
    onStompError: (frame) => {
      console.error('[STOMP ERROR]', frame)
    },
  })

  // Store it before activation so React StrictMode cleanup can also cancel a
  // connection that has not completed its handshake yet.
  stompClient = client
  client.activate()
  return client
}

export function publishMessage(destination: string, body: any) {
  stompClient?.publish({ destination, body: JSON.stringify(body) })
}

export function subscribeMessage(
  destination: string,
  callback: (body: any) => void,
) {
  return stompClient?.subscribe(destination, (msg: IMessage) => {
    try {
      callback(JSON.parse(msg.body))
    } catch {
      callback(msg.body)
    }
  })
}

export function disconnectWebSocket() {
  if (stompClient) {
    roomSubscription?.unsubscribe()
    roomSubscription = null
    activeRoom = ''
    void stompClient.deactivate()
    stompClient = null
  }
}

export function getWebSocket() {
  return stompClient
}
