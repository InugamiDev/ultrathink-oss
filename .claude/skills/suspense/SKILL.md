---
name: suspense
description: React Suspense patterns including Suspense boundaries, React.lazy, loading.tsx in Next.js, use() hook, data fetching with Suspense, and streaming SSR
layer: domain
category: frontend
triggers:
  - "suspense"
  - "React.lazy"
  - "loading.tsx"
  - "streaming SSR"
  - "use() hook"
  - "suspense boundary"
  - "lazy loading"
  - "code splitting"
inputs: [component tree, loading states, data fetching pattern, Next.js or plain React]
outputs: [suspense boundaries, loading components, lazy imports, streaming config]
linksTo: [react, nextjs, streaming, error-boundary]
linkedFrom: [optimize, performance-profiler, cook]
preferredNextSkills: [error-boundary, streaming]
fallbackSkills: [react, nextjs]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# React Suspense Skill

## Purpose

Suspense lets you declaratively specify loading states while components wait for async operations (code loading, data fetching). This skill covers Suspense boundaries, lazy loading, Next.js integration, and the `use()` hook for Suspense-compatible data fetching.

## Key Patterns

### Suspense Boundary Basics

```tsx
import { Suspense } from "react";

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-16">
      <div className="h-8 w-1/3 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="h-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}
```

### React.lazy for Code Splitting

```tsx
import { lazy, Suspense } from "react";

// Only loaded when rendered
const HeavyChart = lazy(() => import("@/components/heavy-chart"));
const MarkdownEditor = lazy(() => import("@/components/markdown-editor"));

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100" />}>
      <HeavyChart />
    </Suspense>
  );
}

// Named export lazy loading
const Settings = lazy(() =>
  import("@/components/settings").then((mod) => ({ default: mod.Settings }))
);
```

### Next.js loading.tsx (Automatic Suspense)

```tsx
// app/dashboard/loading.tsx — Next.js wraps page in Suspense automatically
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
    </div>
  );
}
```

### Nested Suspense Boundaries

```tsx
// Granular loading: each section loads independently
export default function Page() {
  return (
    <div className="space-y-8 py-16">
      <Suspense fallback={<HeaderSkeleton />}>
        <UserHeader />
      </Suspense>

      <div className="grid grid-cols-2 gap-6">
        <Suspense fallback={<CardSkeleton />}>
          <RecentActivity />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <Stats />
        </Suspense>
      </div>
    </div>
  );
}
```

### The use() Hook (React 19+)

```tsx
// use() unwraps promises and integrates with Suspense
import { use, Suspense } from "react";

async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json() as Promise<{ name: string; email: string }>;
}

function UserProfile({ userPromise }: { userPromise: Promise<{ name: string; email: string }> }) {
  const user = use(userPromise);
  return (
    <div className="rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{user.name}</h2>
      <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
    </div>
  );
}

// Parent creates the promise, child consumes with use()
export default function Page({ params }: { params: { id: string } }) {
  const userPromise = fetchUser(params.id);
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### Streaming SSR with Suspense (Next.js App Router)

```tsx
// Server Components + Suspense = streaming
// Each Suspense boundary streams its content as it resolves

// app/page.tsx (Server Component)
import { Suspense } from "react";

async function SlowData() {
  const data = await fetch("https://api.example.com/slow", { cache: "no-store" });
  const result = await data.json();
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}

export default function Page() {
  return (
    <main>
      <h1>Instant shell</h1>
      <Suspense fallback={<p>Loading data...</p>}>
        <SlowData />  {/* Streams in when ready */}
      </Suspense>
    </main>
  );
}
```

## Best Practices

- **Pair with Error Boundaries**: Every `<Suspense>` should have a sibling or parent `<ErrorBoundary>`.
- **Granular boundaries**: Wrap independent sections separately so fast content is not blocked by slow.
- **Meaningful skeletons**: Match the skeleton shape to the real content to reduce layout shift.
- **Lift promises up**: Create promises in parent, pass to child. This starts fetching before rendering.
- **Avoid Suspense waterfalls**: Do not nest async components sequentially. Fetch in parallel where possible.
- **loading.tsx per route**: In Next.js, each route segment can have its own loading state.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Entire page shows spinner | Use nested Suspense boundaries for independent sections |
| Waterfall fetches | Start all fetches at the same level, pass promises down |
| Missing error handling | Add ErrorBoundary around Suspense boundaries |
| Layout shift on load | Use skeleton components that match final content dimensions |
| Lazy component flickers | Only lazy-load components that are large or conditionally rendered |
