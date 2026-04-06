---
name: notifications
description: Notification systems — Web Push API, service workers, FCM, in-app notification centers, delivery pipelines, and user preference management
layer: domain
category: backend
triggers:
  - "notifications"
  - "push notification"
  - "web push"
  - "fcm"
  - "notification center"
  - "in-app notifications"
  - "push api"
  - "service worker push"
inputs:
  - Notification types and channels (push, in-app, email, SMS)
  - User preference requirements
  - Delivery reliability requirements
  - Platform targets (web, iOS, Android)
outputs:
  - Push notification implementation (Web Push / FCM)
  - In-app notification system with database schema
  - Notification center UI component
  - User preference management system
  - Delivery pipeline architecture
linksTo: [websockets, message-queues, postgresql, monitoring]
linkedFrom: [microservices, api-designer, react]
preferredNextSkills: [websockets, message-queues]
fallbackSkills: [api-designer]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: [sends push notifications, writes to notification tables, registers service workers]
---

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
