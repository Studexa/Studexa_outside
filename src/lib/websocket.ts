import { Client } from '@stomp/stompjs'
import type { IMessage } from '@stomp/stompjs'
import { getAccessToken } from './api/client'

let stompClient: Client | null = null

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

export function connectWebSocket(
  _onMessage: MessageHandler,
  onConnect?: () => void,
  onDisconnect?: () => void,
) {
  if (stompClient?.connected) {
    onConnect?.()
    return stompClient
  }

  const token = getAccessToken()
  const client = new Client({
    brokerURL: brokerUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    debug: (msg) => console.log('[STOMP]', msg),
    onConnect: () => {
      stompClient = client
      onConnect?.()
    },
    onDisconnect: () => {
      stompClient = null
      onDisconnect?.()
    },
    onStompError: (frame) => {
      console.error('[STOMP ERROR]', frame)
    },
  })

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
    stompClient.deactivate()
    stompClient = null
  }
}

export function getWebSocket() {
  return stompClient
}
