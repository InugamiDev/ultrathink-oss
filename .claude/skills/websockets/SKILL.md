---
name: websockets
description: Real-time communication patterns, WebSocket lifecycle management, scaling strategies, and protocol design
layer: domain
category: backend
triggers:
  - "websocket"
  - "websockets"
  - "real-time"
  - "realtime"
  - "socket.io"
  - "server-sent events"
  - "sse"
  - "live updates"
inputs:
  - "Real-time feature requirements"
  - "Scaling constraints"
  - "Protocol design needs"
outputs:
  - "WebSocket server implementations"
  - "Scaling architectures"
  - "Protocol specifications"
linksTo:
  - nodejs
  - redis
  - message-queues
  - microservices
  - graphql
linkedFrom:
  - authentication
  - error-handling
preferredNextSkills:
  - redis
  - message-queues
  - nodejs
fallbackSkills:
  - graphql
  - microservices
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# WebSockets Domain Skill

## Purpose

Provide expert-level guidance on real-time communication patterns including WebSocket lifecycle management, reconnection strategies, horizontal scaling with pub/sub, protocol design, and choosing between WebSockets, SSE, and long polling.

## When to Use What

| Technology | Use Case | Direction | Overhead |
|-----------|----------|-----------|----------|
| **WebSocket** | Chat, gaming, collaboration | Bidirectional | Low after handshake |
| **SSE (Server-Sent Events)** | Notifications, feeds, dashboards | Server-to-client | Very low |
| **Long Polling** | Fallback, low-frequency updates | Client-initiated | Medium |
| **WebTransport** | Ultra-low latency, UDP semantics | Bidirectional | Lowest |

**Default to SSE** unless you need client-to-server messaging. WebSockets add complexity.

## Key Patterns

### 1. WebSocket Server (Node.js)

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

interface Client {
  id: string;
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
  isAlive: boolean;
  metadata: Record<string, unknown>;
}

class RealtimeServer {
  private wss: WebSocketServer;
  private clients = new Map<string, Client>();
  private rooms = new Map<string, Set<string>>(); // room -> client IDs
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', this.handleConnection.bind(this));
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 30_000);
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    // Authenticate before accepting
    const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
    const user = await this.authenticate(token);
    if (!user) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const client: Client = {
      id: randomUUID(),
      ws,
      userId: user.id,
      rooms: new Set(),
      isAlive: true,
      metadata: {},
    };

    this.clients.set(client.id, client);
    this.send(client, { type: 'connected', clientId: client.id });

    ws.on('message', (data) => this.handleMessage(client, data));
    ws.on('pong', () => { client.isAlive = true; });
    ws.on('close', () => this.handleDisconnect(client));
    ws.on('error', (err) => {
      console.error(`Client ${client.id} error:`, err);
      ws.close();
    });
  }

  private handleMessage(client: Client, raw: Buffer | string) {
    try {
      const message = JSON.parse(raw.toString());

      switch (message.type) {
        case 'join':
          this.joinRoom(client, message.room);
          break;
        case 'leave':
          this.leaveRoom(client, message.room);
          break;
        case 'broadcast':
          this.broadcastToRoom(message.room, {
            type: 'message',
            from: client.userId,
            data: message.data,
          }, client.id);
          break;
        case 'ping':
          this.send(client, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          this.send(client, { type: 'error', message: 'Unknown message type' });
      }
    } catch {
      this.send(client, { type: 'error', message: 'Invalid JSON' });
    }
  }

  private joinRoom(client: Client, room: string) {
    client.rooms.add(room);
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(client.id);
    this.send(client, { type: 'joined', room });
  }

  private leaveRoom(client: Client, room: string) {
    client.rooms.delete(room);
    this.rooms.get(room)?.delete(client.id);
    if (this.rooms.get(room)?.size === 0) this.rooms.delete(room);
  }

  private broadcastToRoom(room: string, message: object, excludeClientId?: string) {
    const clientIds = this.rooms.get(room);
    if (!clientIds) return;

    const payload = JSON.stringify(message);
    for (const clientId of clientIds) {
      if (clientId === excludeClientId) continue;
      const client = this.clients.get(clientId);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  private send(client: Client, message: object) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private handleDisconnect(client: Client) {
    for (const room of client.rooms) {
      this.leaveRoom(client, room);
    }
    this.clients.delete(client.id);
  }

  private checkHeartbeats() {
    for (const [id, client] of this.clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        this.handleDisconnect(client);
        continue;
      }
      client.isAlive = false;
      client.ws.ping();
    }
  }

  shutdown() {
    clearInterval(this.heartbeatInterval);
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }
  }
}
```

### 2. Client-Side Reconnection

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private maxDelay = 30000;
  private messageQueue: string[] = [];
  private listeners = new Map<string, Set<Function>>();

  constructor(private url: string, private protocols?: string[]) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url, this.protocols);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('open');
      this.flushQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
        this.emit(data.type, data);
      } catch {
        this.emit('message', event.data);
      }
    };

    this.ws.onclose = (event) => {
      this.emit('close', event);
      if (event.code !== 1000 && event.code !== 4001) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxDelay
    );

    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => this.connect(), delay);
  }

  send(data: object) {
    const payload = JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.messageQueue.push(payload); // Queue for reconnection
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(this.messageQueue.shift()!);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }

  close() {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    this.ws?.close(1000);
  }
}
```

### 3. Scaling with Redis Pub/Sub

```typescript
import Redis from 'ioredis';

class ScalableRealtimeServer extends RealtimeServer {
  private redisPub: Redis;
  private redisSub: Redis;
  private serverId = randomUUID();

  constructor(server: http.Server, redisUrl: string) {
    super(server);
    this.redisPub = new Redis(redisUrl);
    this.redisSub = new Redis(redisUrl);

    // Subscribe to cross-server messages
    this.redisSub.on('message', (channel, message) => {
      const { serverId, room, data } = JSON.parse(message);
      if (serverId === this.serverId) return; // Ignore own messages
      super.broadcastToRoom(room, data);
    });
  }

  // Override to publish to Redis for cross-server delivery
  broadcastToRoom(room: string, message: object, excludeClientId?: string) {
    // Deliver locally
    super.broadcastToRoom(room, message, excludeClientId);

    // Publish for other servers
    this.redisPub.publish(`room:${room}`, JSON.stringify({
      serverId: this.serverId,
      room,
      data: message,
    }));
  }

  async joinRoom(client: Client, room: string) {
    super.joinRoom(client, room);
    await this.redisSub.subscribe(`room:${room}`);
  }
}
```

### 4. Server-Sent Events (SSE)

```typescript
// Simple, reliable, auto-reconnecting server push
import { Router } from 'express';

const router = Router();

router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const userId = req.user.id;
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n`);
    res.write(`id: ${Date.now()}\n\n`);
  };

  // Send heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30_000);

  // Subscribe to user events
  const unsubscribe = eventBus.subscribe(userId, send);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// Client side -- EventSource auto-reconnects
const events = new EventSource('/events', { withCredentials: true });
events.addEventListener('notification', (e) => {
  const data = JSON.parse(e.data);
  showNotification(data);
});
events.addEventListener('error', () => {
  // EventSource auto-reconnects with Last-Event-ID header
  console.log('SSE connection lost, reconnecting...');
});
```

## Best Practices

1. **Default to SSE** for server-to-client push -- simpler, auto-reconnects, works through proxies
2. **Authenticate on connection**, not per message
3. **Implement heartbeat/ping-pong** to detect dead connections (30s interval)
4. **Use exponential backoff with jitter** for client reconnection
5. **Queue messages during reconnection** for delivery after reconnect
6. **Use Redis Pub/Sub** for horizontal scaling across multiple server instances
7. **Set `X-Accel-Buffering: no`** for SSE behind Nginx
8. **Send message IDs** for SSE so clients can resume from last received event
9. **Limit connections per user** to prevent resource exhaustion
10. **Use binary protocols** (MessagePack, Protobuf) for high-throughput scenarios

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| No heartbeat mechanism | Zombie connections accumulate | Ping/pong every 30 seconds, terminate dead clients |
| No reconnection logic on client | Permanent disconnection on network blip | Implement exponential backoff reconnection |
| Authentication only at connect time | Stale sessions remain connected | Periodic token refresh or disconnect on auth change |
| Buffering by reverse proxy | SSE events delayed or batched | `X-Accel-Buffering: no` for Nginx, chunked encoding |
| Broadcasting to all in a loop | O(n) for every message | Use rooms/channels to scope broadcasts |
| No message ordering guarantee | Out-of-order events | Include sequence numbers, reorder on client |
| Unbounded connection count | Server resource exhaustion | Rate limit connections per IP/user, use connection pools |
