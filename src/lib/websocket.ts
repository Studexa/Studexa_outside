import { Client } from '@stomp/stompjs'
import type { IMessage } from '@stomp/stompjs'

let stompClient: Client | null = null

type MessageHandler = (destination: string, body: any) => void

export function connectWebSocket(
  _onMessage: MessageHandler,
  onConnect?: () => void,
  onDisconnect?: () => void,
) {
  if (stompClient?.connected) {
    onConnect?.()
    return stompClient
  }

  const client = new Client({
    brokerURL: 'http://localhost:8081/quiz',
    connectHeaders: {},
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
  stompClient?.subscribe(destination, (msg: IMessage) => {
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
