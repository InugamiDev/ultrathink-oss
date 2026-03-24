---
name: service-worker
description: "Service worker lifecycle, caching strategies, offline-first patterns, and workbox configuration."
layer: domain
category: frontend
triggers:
  - "service worker"
  - "workbox"
  - "offline first"
  - "cache strategy"
  - "sw.js"
  - "precache"
inputs:
  - "Offline-first requirements or caching needs"
  - "Service worker lifecycle management questions"
  - "Workbox configuration and strategy selection"
  - "Background sync or push notification requirements"
outputs:
  - "Service worker scripts with proper lifecycle handling"
  - "Caching strategies matched to resource types"
  - "Workbox configuration for production builds"
  - "Update flow and cache invalidation patterns"
linksTo:
  - pwa
  - caching
  - web-workers
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Service Worker Patterns & Best Practices

## Purpose

Provide expert guidance on service worker lifecycle management, caching strategies, offline-first architecture, and Workbox configuration. Covers modern service worker APIs, background sync, and update flows for production PWAs.

## Key Patterns

### Service Worker Lifecycle

```
Registration → Installing → Waiting → Activating → Activated → Redundant
                  ↓                                      ↓
            install event                          fetch events
            (precache)                          (runtime caching)
```

**Registration with update handling:**

```typescript
// register-sw.ts
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none", // always check for SW updates
    });

    // Check for updates periodically
    setInterval(() => registration.update(), 60 * 60 * 1000); // hourly

    // Listen for new service worker waiting
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New version available — prompt user to refresh
          showUpdateNotification(registration);
        }
      });
    });

    // Handle controller change (page refresh after skip waiting)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  } catch (error) {
    console.error("SW registration failed:", error);
  }
}

function showUpdateNotification(registration: ServiceWorkerRegistration) {
  // Show a toast/banner prompting the user to update
  const update = confirm("New version available. Refresh now?");
  if (update) {
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  }
}
```

### Caching Strategies

| Strategy | Use Case | Behavior |
|----------|----------|----------|
| **Cache First** | Static assets (fonts, images, CSS/JS with hash) | Check cache, fall back to network |
| **Network First** | API responses, dynamic HTML | Try network, fall back to cache |
| **Stale While Revalidate** | Semi-static content (avatars, product images) | Return cached, update in background |
| **Network Only** | Analytics, payments, auth | Always fetch from network |
| **Cache Only** | Precached app shell | Only serve from cache |

**Manual implementation:**

```typescript
// sw.ts
const CACHE_NAME = "app-v1";
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/css/app.css",
  "/js/app.js",
];

// Install: precache critical assets
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  // Take control of all open tabs immediately
  (self as any).clients.claim();
});

// Skip waiting when prompted
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    (self as any).skipWaiting();
  }
});

// Fetch: route strategies by request type
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets with hash: Cache First
  if (request.destination === "script" || request.destination === "style") {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Images: Stale While Revalidate
  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // HTML navigation: Network First with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{"error":"offline"}', {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  return cached || fetchPromise;
}

async function networkFirstWithFallback(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match("/offline.html") as Promise<Response>;
  }
}
```

### Workbox Configuration

**workbox-config.js (for build-time injection):**

```javascript
module.exports = {
  globDirectory: "dist/",
  globPatterns: [
    "**/*.{js,css,html,png,svg,woff2}",
  ],
  globIgnores: [
    "**/node_modules/**",
    "sw.js",
    "workbox-*.js",
  ],
  swDest: "dist/sw.js",
  swSrc: "src/sw.ts",
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
};
```

**Workbox service worker:**

```typescript
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { BackgroundSyncPlugin } from "workbox-background-sync";

declare const self: ServiceWorkerGlobalScope;

// Precache build assets (injected by workbox-build)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Skip waiting on message
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Navigation: Network First with offline fallback
const navigationHandler = new NetworkFirst({
  cacheName: "pages",
  plugins: [new CacheableResponsePlugin({ statuses: [200] })],
});
registerRoute(new NavigationRoute(navigationHandler, {
  denylist: [/\/api\//],
}));

// API: Network First with cache fallback
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/") && url.pathname.includes("/v1/"),
  new NetworkFirst({
    cacheName: "api-responses",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// Static assets: Cache First (hashed filenames)
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Images: Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// Background sync for offline form submissions
const bgSyncPlugin = new BackgroundSyncPlugin("form-queue", {
  maxRetentionTime: 24 * 60, // 24 hours
});

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/v1/submissions"),
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  }),
  "POST"
);
```

### Background Sync

```typescript
// Queue failed POST requests for retry when online
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { registerRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";

const bgSync = new BackgroundSyncPlugin("api-queue", {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error; // retry later
      }
    }
  },
});

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith("/api/") && request.method === "POST",
  new NetworkOnly({ plugins: [bgSync] }),
  "POST"
);
```

### Cache Versioning and Cleanup

```typescript
const CACHE_VERSION = "v2";
const EXPECTED_CACHES = [`static-${CACHE_VERSION}`, `api-${CACHE_VERSION}`, "images"];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !EXPECTED_CACHES.includes(name))
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      )
    )
  );
});
```

## Best Practices

1. **Use Workbox for production** — Hand-written service workers are error-prone. Workbox provides battle-tested strategies and precaching.
2. **Match strategy to resource type** — Cache First for hashed assets, Network First for API data, Stale While Revalidate for images.
3. **Always handle updates gracefully** — Prompt users to refresh when a new SW version is waiting. Never silently break cached pages.
4. **Set expiration limits** — Use `ExpirationPlugin` with `maxEntries` and `maxAgeSeconds` to prevent unbounded cache growth.
5. **Precache the app shell** — Critical HTML, CSS, JS, and fonts should be precached during install for instant subsequent loads.
6. **Use `clients.claim()` carefully** — It lets the new SW control existing tabs immediately, but can cause inconsistency if the page expects the old cache.
7. **Provide an offline fallback page** — For navigation requests that fail offline, serve a cached `/offline.html` page.
8. **Use Background Sync for offline writes** — Queue failed POST/PUT/DELETE requests and replay when connectivity returns.
9. **Clean up old caches on activate** — Delete caches from previous versions to free storage.
10. **Test with Chrome DevTools** — Use Application > Service Workers panel. Check "Update on reload" during development.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Caching API auth responses | Stale tokens served from cache | Use Network Only for auth endpoints |
| No cache size limits | Storage quota exceeded | Set `maxEntries` and `maxAgeSeconds` |
| `skipWaiting()` without reload | Page uses mix of old/new cached assets | Trigger `window.location.reload()` on controller change |
| Caching opaque responses | Cross-origin responses with `no-cors` fill cache quota quickly | Only cache same-origin or CORS-enabled responses |
| No offline fallback | Users see browser error page when offline | Precache `/offline.html` and serve as fallback |
| Forgetting `event.waitUntil()` | Browser kills SW before async work completes | Always wrap async operations in `waitUntil` |
| Caching non-GET requests | POST/PUT results cached unexpectedly | Only cache GET requests; use Background Sync for writes |
| Not testing SW updates | Broken update flow locks users on old version | Test update flow: install new SW, prompt user, skip waiting |
