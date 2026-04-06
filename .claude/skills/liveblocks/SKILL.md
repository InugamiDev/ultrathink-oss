---
name: liveblocks
description: Real-time collaboration infrastructure — presence, shared storage, comments, notifications, and Yjs integration
layer: domain
category: realtime
triggers: ["liveblocks", "real-time collaboration", "multiplayer", "collaborative editing", "live cursors"]
inputs: [collaboration requirements, room structure, storage schema]
outputs: [Liveblocks room setup, presence hooks, shared storage, comment threads]
linksTo: [react, websockets, tiptap, nextjs]
linkedFrom: [react, nextjs]
preferredNextSkills: [react, nextjs, tiptap]
fallbackSkills: [websockets]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
