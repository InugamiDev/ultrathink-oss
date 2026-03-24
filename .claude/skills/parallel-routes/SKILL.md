# Skill: parallel-routes
> Layer: domain | Category: frontend

## Triggers
- parallel routes, @slot, simultaneous rendering, dashboard layout, split views, Next.js slots

## Links
- linksTo: intercepting-routes, nextjs-app-router
- linkedFrom: nextjs-app-router

## Overview

Parallel routes render multiple pages simultaneously within the same layout using **named slots**.
Slots are defined by the `@folder` convention and passed as props to the parent layout.

## Slot Convention

A slot is a directory prefixed with `@`. It does NOT create a URL segment.

```
app/
  layout.tsx          # receives @analytics and @team as props
  page.tsx
  @analytics/
    page.tsx
    loading.tsx       # independent loading state
    error.tsx         # independent error boundary
  @team/
    page.tsx
    loading.tsx
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-6 py-16">
      <main>{children}</main>
      <aside>{analytics}</aside>
      <section>{team}</section>
    </div>
  );
}
```

## default.tsx — Unmatched Route Fallback

When a slot has no matching route for the current URL, Next.js renders `default.tsx`.
Without it, unmatched slots return a 404 on hard navigation.

```tsx
// app/@analytics/default.tsx
export default function AnalyticsDefault() {
  return <p>Select a date range to view analytics.</p>;
}
```

**Rule**: every parallel slot should have a `default.tsx` unless you explicitly want a 404.

## Independent Loading and Error States

Each slot streams independently — one slot can show a skeleton while another is ready.

```tsx
// app/@analytics/loading.tsx
export default function AnalyticsLoading() {
  return <div className="animate-pulse h-64 rounded-xl bg-muted" />;
}

// app/@analytics/error.tsx
"use client";
export default function AnalyticsError({ reset }: { reset: () => void }) {
  return (
    <div className="p-6 rounded-xl border border-destructive">
      <p>Analytics failed to load.</p>
      <button onClick={reset} className="px-6 py-4 text-base rounded-lg">
        Retry
      </button>
    </div>
  );
}
```

## Conditional Rendering

Use auth or feature flags to swap which slot content renders.

```tsx
// app/layout.tsx
import { auth } from "@/lib/auth";

export default async function Layout({
  children,
  admin,
  user,
}: {
  children: React.ReactNode;
  admin: React.ReactNode;
  user: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="py-16">
      {children}
      {session?.role === "admin" ? admin : user}
    </div>
  );
}
```

## Key Rules

1. Slots are **not** URL segments — `@analytics/page.tsx` maps to `/`, not `/analytics`.
2. Soft navigation preserves previously active slot state even if the URL doesn't match.
3. Hard navigation (full reload) requires `default.tsx` for unmatched slots.
4. Combine with intercepting routes for modal patterns that overlay parallel slots.
5. Each slot can define its own `loading.tsx`, `error.tsx`, `not-found.tsx`, and nested layouts.
