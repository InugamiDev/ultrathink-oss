---
name: socketio
description: Real-time bidirectional event-based communication with Socket.IO
layer: domain
category: realtime
triggers: ["socket.io", "socketio", "socket io", "realtime events"]
inputs: ["Real-time feature requirements", "Event architecture", "Scaling needs"]
outputs: ["Socket.IO implementations", "Room/namespace architectures", "Scaling configs"]
linksTo: [websockets, nodejs, redis, nextjs]
linkedFrom: [websockets, authentication]
preferredNextSkills: [redis, nodejs]
fallbackSkills: [websockets]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
