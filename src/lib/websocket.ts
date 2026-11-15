import { Client } from '@stomp/stompjs'

let stompClient: Client | null = null

export function connectWebSocket(
  onMessage: (destination: string, body: any) => void,
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

  client.publish = (destination: string, body: any) => {
    client.publish({ destination, body: JSON.stringify(body) })
  }

  client.subscribe = (destination: string, callback: (body: any) => void) => {
    client.subscribe(destination, (msg) => {
      try {
        callback(JSON.parse(msg.body))
      } catch {
        callback(msg.body)
      }
    })
  }

  // Wrap subscribe and publish on the client object
  const originalPublish = client.publish.bind(client)
  const originalSubscribe = client.subscribe.bind(client)
  ;(client as any).publish = (destination: string, body: any) =>
    originalPublish(destination, body)
  ;(client as any).subscribe = (destination: string, callback: (body: any) => void) =>
    originalSubscribe(destination, (msg) => {
      try {
        callback(JSON.parse(msg.body))
      } catch {
        callback(msg.body)
      }
    })

  // Set up a catch-all for /topic/room/* destinations
  client.onMessage = (msg) => {
    onMessage(msg.destination, msg.body)
  }

  client.activate()
  return client
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
