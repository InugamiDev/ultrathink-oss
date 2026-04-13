---
name: realtime-kit
description: "Unified real-time infrastructure — WebSocket lifecycle management and scaling, Socket.io (namespaces, rooms, middleware, Redis adapter), Liveblocks collaboration (presence, shared CRDT storage, comments), push notifications (Web Push API, FCM, APNs, in-app). Single entry point for presence + channels + delivery."
layer: domain
category: realtime
triggers: ["@liveblocks/", "LiveList", "LiveObject", "RoomProvider", "fcm", "io()", "io.of", "live updates", "liveblocks", "notification", "push notification", "real-time", "realtime", "server-sent events", "service worker notification", "socket.emit", "socket.io", "socket.join", "socket.on", "socket.to", "sse", "useMyPresence", "useOthers", "web push", "websocket", "websockets"]
---

# realtime-kit

Unified real-time infrastructure — WebSocket lifecycle management and scaling, Socket.io (namespaces, rooms, middleware, Redis adapter), Liveblocks collaboration (presence, shared CRDT storage, comments), push notifications (Web Push API, FCM, APNs, in-app). Single entry point for presence + channels + delivery.


## Absorbs

- `websockets`
- `socketio`
- `liveblocks`
- `notifications`


---

## From `websockets`

> Real-time communication patterns, WebSocket lifecycle management, scaling strategies, and protocol design

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


---

## From `socketio`

> Real-time bidirectional event-based communication with Socket.IO

# Socket.IO

Real-time bidirectional event-based communication with rooms, namespaces, auto-reconnection, fallback transports, acknowledgements, and TypeScript type safety.

## When to Use

**Socket.IO** when you need rooms, namespaces, auto-reconnect, fallback transports, or acks. Use **raw WebSockets** for minimal overhead or **SSE** for server-to-client only.

## Key Patterns

### Type-Safe Server — Namespaces, Middleware, Rooms, Acks
```typescript
import { Server } from "socket.io";
interface SrvEv { message: (d: { room: string; body: string }, ack: (ok: boolean) => void) => void; joinRoom: (room: string) => void; }
interface CliEv { message: (d: { from: string; body: string }) => void; userJoined: (id: string) => void; }
const io = new Server<SrvEv, CliEv>(httpServer, { cors: { origin: process.env.CLIENT_URL } });
const chat = io.of("/chat"); // Namespace — separation of concerns
chat.use((socket, next) => { // Auth middleware
  try { socket.data.user = verifyJwt(socket.handshake.auth.token); next(); } catch { next(new Error("Unauthorized")); }
});
chat.on("connection", (socket) => {
  socket.on("joinRoom", (room) => { socket.join(room); socket.to(room).emit("userJoined", socket.data.user.id); });
  socket.on("message", (d, ack) => { chat.to(d.room).emit("message", { from: socket.data.user.id, body: d.body }); ack(true); });
  socket.on("disconnect", () => { /* cleanup */ });
});
```

### Client — Reconnection, Error Handling, Acks
```typescript
import { io } from "socket.io-client";
const socket = io("/chat", { auth: { token }, reconnectionDelay: 1000, reconnectionDelayMax: 30000 });
socket.on("connect_error", (err) => { if (err.message === "Unauthorized") refreshToken(); });
socket.emit("message", { room: "general", body: "hello" }, (ok) => console.log("ack:", ok));
socket.emit("file", { name: "doc.pdf", data: fileBuffer }); // Binary data — ArrayBuffer natively
```

### Redis Adapter — Horizontal Scaling
```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
const pub = createClient({ url: process.env.REDIS_URL }), sub = pub.duplicate();
await Promise.all([pub.connect(), sub.connect()]);
io.adapter(createAdapter(pub, sub));
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| State in socket objects | Use rooms or external store (Redis) |
| No namespace separation | Isolate concerns: `/chat`, `/notifications` |
| Missing `connect_error` handler | Handle auth failures, trigger token refresh |
| No adapter in multi-server deploy | Use `@socket.io/redis-adapter` |
| No ack for critical emits | Use callback pattern for delivery confirmation |
| Only catching `error` event | Also handle `connect_error`, `disconnect`, middleware errors |

## Related Skills: `websockets` | `nodejs` | `redis` | `nextjs`


---

## From `liveblocks`

> Real-time collaboration infrastructure — presence, shared storage, comments, notifications, and Yjs integration

# Liveblocks

Real-time collaboration infrastructure for web apps. Handles presence, shared storage (CRDTs), comments, notifications, and text editor bindings out of the box.

## When to Use

- Live cursors, selections, or avatars showing who is online
- Shared state that syncs across clients without custom WebSocket code
- Collaborative text editing (via Yjs / Tiptap integration)
- Threaded comments or in-app notifications anchored to content

## Key Patterns

### Room Setup
Wrap collaborative sections in `<RoomProvider>` with `initialPresence` and `initialStorage` (using `LiveList`, `LiveObject`, `LiveMap`). Use `<ClientSideSuspense>` for loading states.

### Presence (cursors, selections, awareness)
- `useMyPresence()` — read/update local user presence (cursor position, selection, etc.)
- `useOthers()` — observe all other connected users' presence in real time

### Storage (CRDT-based shared state)
- `useStorage((root) => root.items)` — subscribe to shared data reactively
- `useMutation(({ storage }, val) => { storage.get("list").push(val) }, [])` — write mutations
- Types: `LiveObject` (.set/.get), `LiveList` (.push/.delete/.move), `LiveMap` (.set/.delete)
- All writes are conflict-free (CRDTs) — no manual conflict resolution needed

### Broadcasting Custom Events
- `useBroadcastEvent()` — fire ephemeral events (reactions, pings) to all room users
- `useEventListener(({ event }) => {})` — listen for broadcast events

### Comments and Notifications
- `<Thread>` and `<Composer>` from `@liveblocks/react-ui` for threaded comments
- `useInboxNotifications()` for notification feeds, `useMarkAllInboxNotificationsAsRead()`

### Yjs Integration (text editing)
- `LiveblocksYjsProvider` bridges Liveblocks rooms to Yjs documents
- Works with Tiptap, ProseMirror, Monaco, CodeMirror — pass the `Y.Doc` to the editor

### Authentication and Permissions
- Server-side: `liveblocks.prepareSession(userId, { userInfo })` then `session.allow(roomPattern, accessLevel)`
- Endpoint at `/api/liveblocks-auth` returning the authorized session token
- Scoping: `session.allow("org:*:*", session.FULL_ACCESS)` for org-level rooms

## Anti-Patterns

| Anti-Pattern | Instead |
|---|---|
| Storing large blobs in LiveObject | Use external storage, store references only |
| Skipping `initialPresence` / `initialStorage` | Always define defaults in RoomProvider |
| Polling for presence data | Use `useOthers` / `useMyPresence` hooks |
| One global room for everything | Scope rooms per document / context |
| Raw WebSockets alongside Liveblocks | Use `useBroadcastEvent` for custom events |

## Related Skills

`react` | `websockets` | `tiptap` | `nextjs`


---

## From `notifications`

> Notification systems — Web Push API, service workers, FCM, in-app notification centers, delivery pipelines, and user preference management

# Notifications Specialist

## Purpose

Notifications connect users to timely, relevant information across channels — push, in-app, email, and SMS. A well-designed notification system respects user preferences, delivers reliably, and avoids the spam trap that causes users to disable notifications entirely. This skill covers Web Push API, Firebase Cloud Messaging (FCM), in-app notification centers, database design, and delivery orchestration.

## Key Concepts

### Notification Channels

| Channel | Latency | Reach | Best For |
|---------|---------|-------|----------|
| **Web Push** | ~1-5s | Browser open/closed | Time-sensitive actions, re-engagement |
| **Mobile Push (FCM/APNs)** | ~1-3s | App installed | Real-time alerts, messages |
| **In-App** | Instant | App open | Feature updates, activity feed |
| **Email** | Minutes | Universal | Digests, receipts, important updates |
| **SMS** | Seconds | Universal | 2FA, critical alerts |

### Architecture Overview

```
Event Source -> Notification Service -> Channel Router -> Delivery Adapters
                    |                      |
                    v                      v
              Preferences DB        +--------------+
              Notification DB       | Web Push     |
                                    | FCM / APNs   |
                                    | In-App (WS)  |
                                    | Email (SES)  |
                                    | SMS (Twilio)  |
                                    +--------------+
```

## Workflow

### Step 1: Database Schema

```sql
-- Notification types/templates
CREATE TABLE notification_types (
  id TEXT PRIMARY KEY,                    -- e.g., 'order.shipped', 'comment.reply'
  title_template TEXT NOT NULL,           -- 'Your order {{orderId}} has shipped'
  body_template TEXT NOT NULL,
  default_channels TEXT[] NOT NULL,       -- '{push, in_app, email}'
  category TEXT NOT NULL,                 -- 'orders', 'social', 'system'
  priority TEXT NOT NULL DEFAULT 'normal' -- 'low', 'normal', 'high', 'urgent'
);

-- Individual notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type_id TEXT NOT NULL REFERENCES notification_types(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',               -- Arbitrary payload (deep link URL, entity IDs)
  image_url TEXT,
  read_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,                   -- Seen in notification center (not necessarily read)
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Deduplication
  idempotency_key TEXT UNIQUE
);

-- Indexes for notification center queries
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND archived_at IS NULL;

CREATE INDEX idx_notifications_user_feed
  ON notifications (user_id, created_at DESC)
  WHERE archived_at IS NULL;

-- Delivery tracking per channel
CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,                  -- 'push', 'email', 'sms', 'in_app'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  provider_id TEXT,                       -- External ID from FCM/SES/Twilio
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User notification preferences
CREATE TABLE notification_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                 -- 'orders', 'social', 'marketing', 'system'
  channel TEXT NOT NULL,                  -- 'push', 'email', 'sms', 'in_app'
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, category, channel)
);

-- Push subscription storage (Web Push)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,                   -- Public key
  auth TEXT NOT NULL,                     -- Auth secret
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_push_subs_user ON push_subscriptions (user_id);
```

### Step 2: Web Push API Implementation

#### Generate VAPID Keys

```bash
# Generate VAPID keys (run once, store securely)
npx web-push generate-vapid-keys
# Public Key: BNx...
# Private Key: abc...
```

#### Client-Side: Register Service Worker and Subscribe

```typescript
// lib/push-notifications.ts
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  // Register service worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Send subscription to server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
```

#### Service Worker: Handle Push Events

```typescript
// public/sw.js
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();

  const options = {
    body: payload.body,
    icon: payload.icon ?? '/icons/notification-192.png',
    badge: payload.badge ?? '/icons/badge-72.png',
    image: payload.image,
    tag: payload.tag,                   // Group/replace notifications with same tag
    renotify: payload.renotify ?? false,
    requireInteraction: payload.requireInteraction ?? false,
    data: payload.data ?? {},           // Custom data for click handler
    actions: payload.actions ?? [],     // Up to 2 action buttons
    timestamp: payload.timestamp ?? Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? '/';
  const action = event.action;          // Which action button was clicked

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});
```

#### Server-Side: Send Push Notifications

```typescript
// lib/push-sender.ts
import webpush from 'web-push';
import { db } from '@/db';

webpush.setVapidDetails(
  'mailto:notifications@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await db.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  const results = await Promise.allSettled(
    subscriptions.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 } // 1 hour TTL
        );
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired — clean up
          await db.query(
            'DELETE FROM push_subscriptions WHERE endpoint = $1',
            [sub.endpoint]
          );
        }
        throw error;
      }
    })
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`Push delivery failed for ${failures.length}/${results.length} subscriptions`);
  }
}
```

### Step 3: In-App Notification Center

#### API Endpoints

```typescript
// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cursor = request.nextUrl.searchParams.get('cursor');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20'), 50);

  const notifications = await db.query(`
    SELECT id, type_id, title, body, data, image_url, read_at, seen_at, created_at
    FROM notifications
    WHERE user_id = $1 AND archived_at IS NULL
      ${cursor ? 'AND created_at < $3' : ''}
    ORDER BY created_at DESC
    LIMIT $2
  `, cursor
    ? [session.user.id, limit + 1, cursor]
    : [session.user.id, limit + 1]
  );

  const hasMore = notifications.rows.length > limit;
  const items = notifications.rows.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;

  return NextResponse.json({
    data: items,
    nextCursor,
    hasMore,
  });
}
```

```typescript
// app/api/notifications/mark-read/route.ts
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids } = await request.json();

  if (ids === 'all') {
    await db.query(`
      UPDATE notifications SET read_at = now()
      WHERE user_id = $1 AND read_at IS NULL
    `, [session.user.id]);
  } else if (Array.isArray(ids) && ids.length > 0) {
    await db.query(`
      UPDATE notifications SET read_at = now()
      WHERE user_id = $1 AND id = ANY($2) AND read_at IS NULL
    `, [session.user.id, ids]);
  }

  return NextResponse.json({ success: true });
}
```

```typescript
// app/api/notifications/unread-count/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await db.query(`
    SELECT count(*) AS count
    FROM notifications
    WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL
  `, [session.user.id]);

  return NextResponse.json({
    count: Math.min(parseInt(result.rows[0].count), 99),
  });
}
```

### Step 4: Notification Dispatch Service

```typescript
// lib/notification-service.ts
import { db } from '@/db';
import { sendPushToUser } from './push-sender';
import { sendEmail } from './email-sender';
import Mustache from 'mustache';

interface NotifyOptions {
  userId: string;
  typeId: string;
  variables: Record<string, string>;
  data?: Record<string, unknown>;
  imageUrl?: string;
  idempotencyKey?: string;
}

export async function notify(options: NotifyOptions): Promise<string> {
  const { userId, typeId, variables, data, imageUrl, idempotencyKey } = options;

  // 1. Get notification type template
  const type = await db.query(
    'SELECT * FROM notification_types WHERE id = $1',
    [typeId]
  );
  if (type.rows.length === 0) throw new Error(`Unknown notification type: ${typeId}`);

  const template = type.rows[0];
  const title = Mustache.render(template.title_template, variables);
  const body = Mustache.render(template.body_template, variables);

  // 2. Create notification record
  const notification = await db.query(`
    INSERT INTO notifications (user_id, type_id, title, body, data, image_url, idempotency_key)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  `, [userId, typeId, title, body, data ?? {}, imageUrl, idempotencyKey]);

  if (notification.rows.length === 0) {
    return 'deduplicated'; // Idempotency key already exists
  }

  const notificationId = notification.rows[0].id;

  // 3. Check user preferences per channel
  const preferences = await db.query(`
    SELECT channel, enabled
    FROM notification_preferences
    WHERE user_id = $1 AND category = $2
  `, [userId, template.category]);

  const prefMap = new Map(preferences.rows.map((p) => [p.channel, p.enabled]));
  const channels = template.default_channels.filter(
    (ch: string) => prefMap.get(ch) !== false // Default to enabled if no preference set
  );

  // 4. Dispatch to each enabled channel
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          await sendPushToUser(userId, {
            title,
            body,
            tag: typeId,
            data: { url: data?.url, notificationId },
          });
          break;
        case 'email':
          await sendEmail({
            userId,
            subject: title,
            body,
            template: `notification-${template.category}`,
          });
          break;
        case 'in_app':
          // Already stored in notifications table — real-time via WebSocket
          break;
      }

      await db.query(`
        INSERT INTO notification_deliveries (notification_id, channel, status, sent_at)
        VALUES ($1, $2, 'sent', now())
      `, [notificationId, channel]);
    } catch (error) {
      await db.query(`
        INSERT INTO notification_deliveries (notification_id, channel, status, error_message)
        VALUES ($1, $2, 'failed', $3)
      `, [notificationId, channel, (error as Error).message]);
    }
  }

  return notificationId;
}

// Usage
await notify({
  userId: order.userId,
  typeId: 'order.shipped',
  variables: {
    orderId: order.id,
    trackingUrl: order.trackingUrl,
  },
  data: { url: `/orders/${order.id}` },
  idempotencyKey: `order-shipped-${order.id}`,
});
```

### Step 5: User Preference Management

```typescript
// app/api/notifications/preferences/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const preferences = await db.query(`
    SELECT np.category, np.channel, np.enabled
    FROM notification_preferences np
    WHERE np.user_id = $1
    ORDER BY np.category, np.channel
  `, [session.user.id]);

  return NextResponse.json({ preferences: preferences.rows });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { category, channel, enabled } = await request.json();

  // System notifications cannot be fully disabled
  if (category === 'system' && channel === 'in_app' && !enabled) {
    return NextResponse.json(
      { error: 'System in-app notifications cannot be disabled' },
      { status: 400 }
    );
  }

  await db.query(`
    INSERT INTO notification_preferences (user_id, category, channel, enabled)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, category, channel)
    DO UPDATE SET enabled = EXCLUDED.enabled
  `, [session.user.id, category, channel, enabled]);

  return NextResponse.json({ success: true });
}
```

## Best Practices

- Always use idempotency keys to prevent duplicate notifications from retries
- Respect user preferences — check before every send, not just at subscription time
- Clean up expired push subscriptions (410/404 from push service) immediately
- Use notification tags to group and replace related notifications (e.g., "3 new messages" replaces individual ones)
- Batch digest notifications for non-urgent categories (hourly/daily email digests)
- Store all notifications server-side — do not rely solely on push delivery
- Add a "seen" state separate from "read" (seen = appeared in feed, read = clicked/opened)
- Rate-limit notifications per user per channel to prevent spam (e.g., max 5 push/hour)
- Use `requireInteraction: false` for informational pushes, `true` only for action-required alerts
- Put the VAPID private key in environment variables, never in client code

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Push subscription lost after browser update | Re-subscribe on every page load if subscription is null; store server-side |
| Service worker not updating | Use `skipWaiting()` + `clients.claim()` or version the SW file |
| Notifications sent to users who opted out | Always check `notification_preferences` before dispatch |
| Duplicate notifications on retry | Use idempotency keys on the notifications table |
| Push payload too large (>4KB) | Send minimal payload via push; fetch full content from API on click |
| No fallback when push fails | Use multi-channel delivery — if push fails, fall back to in-app or email |
| Notification permission prompt on page load | Never prompt immediately — show a custom UI first explaining value, then call `Notification.requestPermission()` |
| Not handling `notificationclick` | Users tap notification and nothing happens — always implement the click handler in the service worker |

## Examples

### Firebase Cloud Messaging (FCM) via Admin SDK

```typescript
// lib/fcm-sender.ts
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function sendFCM(
  tokens: string[],
  notification: { title: string; body: string; imageUrl?: string },
  data?: Record<string, string>
) {
  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
    },
    data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          alert: { title: notification.title, body: notification.body },
          sound: 'default',
          badge: 1,
        },
      },
    },
    webpush: {
      headers: { TTL: '3600' },
      notification: {
        icon: '/icons/notification-192.png',
        badge: '/icons/badge-72.png',
      },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Clean up invalid tokens
  response.responses.forEach((resp, idx) => {
    if (resp.error?.code === 'messaging/registration-token-not-registered') {
      // Remove tokens[idx] from database
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}
```

### Notification Center React Component Pattern

```tsx
// components/notification-bell.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  data: Record<string, unknown>;
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchCount = async () => {
      const res = await fetch('/api/notifications/unread-count');
      const data = await res.json();
      setUnreadCount(data.count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  const openPanel = useCallback(async () => {
    setIsOpen(true);
    const res = await fetch('/api/notifications?limit=20');
    const data = await res.json();
    setNotifications(data.data);
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: 'all' }),
    });
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
    );
  }, []);

  return (
    <div className="relative">
      <button
        onClick={isOpen ? () => setIsOpen(false) : openPanel}
        className="relative px-4 py-3 rounded-lg transition-all duration-200
                   hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-offset-2
                   focus-visible:ring-blue-500"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5
                           flex items-center justify-center rounded-full
                           bg-red-500 text-white text-xs font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[32rem]
                        overflow-y-auto bg-white rounded-2xl shadow-xl border
                        border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-sm text-blue-600 hover:text-blue-700
                           transition-all duration-200"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No notifications yet</p>
          ) : (
            <ul className="space-y-1">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`p-4 rounded-xl transition-all duration-200
                    hover:bg-gray-50 cursor-pointer
                    ${!n.readAt ? 'bg-blue-50/50' : ''}`}
                >
                  <p className="font-medium text-base">{n.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  <time className="text-xs text-gray-400 mt-2 block">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

