---
name: code-splitting
description: Reduce initial bundle size with dynamic imports, React.lazy, route-based splitting, component-level splitting, and bundle analysis — faster load times through strategic chunking
layer: domain
category: performance
triggers:
  - "code splitting"
  - "dynamic import"
  - "React.lazy"
  - "lazy load"
  - "bundle size"
  - "bundle analysis"
  - "chunk"
  - "tree shaking"
  - "initial load time"
  - "reduce bundle"
inputs:
  - Framework (React, Next.js, Vue, Svelte)
  - Build tool (Vite, webpack, Turbopack)
  - Current bundle size and performance metrics
  - Route structure and component hierarchy
  - Critical vs. non-critical features
outputs:
  - Code splitting strategy with chunk boundaries
  - Dynamic import implementation for routes and components
  - Suspense boundaries with loading states
  - Bundle analysis report and optimization recommendations
  - Preloading and prefetching strategy for split chunks
linksTo:
  - web-workers
  - performance-profiler
  - react
  - nextjs
linkedFrom:
  - optimize
  - performance-profiler
preferredNextSkills:
  - performance-profiler
  - web-workers
fallbackSkills:
  - optimize
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Code Splitting Skill

## Purpose

Code splitting breaks a monolithic JavaScript bundle into smaller chunks loaded on demand. Instead of shipping 2MB of JavaScript upfront — most of which the user may never need — you load only the code required for the current view and defer the rest. This directly improves Time to Interactive (TTI), Largest Contentful Paint (LCP), and Total Blocking Time (TBT).

## Key Concepts

### Splitting Strategies

| Strategy | Granularity | Best For |
|----------|-------------|----------|
| **Route-based** | Per page/route | SPAs with distinct pages |
| **Component-based** | Per feature/widget | Heavy components (editor, chart, map) |
| **Library-based** | Per vendor package | Large dependencies (moment, lodash, d3) |
| **Interaction-based** | On user action | Features triggered by click/hover |
| **Viewport-based** | On scroll into view | Below-the-fold content |

### How Dynamic Imports Work

```
Static import:
  import { heavyFn } from './heavy'; // Included in main bundle ALWAYS

Dynamic import:
  const { heavyFn } = await import('./heavy'); // Separate chunk, loaded on demand

Bundler sees dynamic import → creates separate chunk → loads via <script> tag at runtime
```

### Critical Path vs. Lazy Path

```
CRITICAL (load immediately):
  - App shell / layout
  - Current route's above-the-fold content
  - Authentication state
  - Design system primitives (Button, Input)

LAZY (load on demand):
  - Other routes
  - Modals, dialogs, drawers
  - Admin panels, settings pages
  - Heavy editors (rich text, code editor)
  - Charts, data visualization
  - PDF/export functionality
```

## Implementation

### React.lazy + Suspense (Route-Based)

```tsx
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Each lazy() call creates a separate chunk
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Named Chunks with Magic Comments (Webpack)

```typescript
// Webpack magic comments control chunk naming and behavior
const Editor = lazy(() =>
  import(/* webpackChunkName: "editor" */ './components/Editor')
);

const Chart = lazy(() =>
  import(
    /* webpackChunkName: "charts" */
    /* webpackPrefetch: true */
    './components/Chart'
  )
);

// Prefetch: loads in idle time after current page loads (link rel="prefetch")
// Preload: loads immediately in parallel (link rel="preload") — use sparingly
```

### Component-Level Splitting with Interaction Trigger

```tsx
import { Suspense, lazy, useState } from 'react';

// Heavy rich text editor — only load when user clicks "Edit"
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));

function PostContent({ post }: { post: Post }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {isEditing ? (
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl" />}>
          <RichTextEditor
            content={post.content}
            onSave={(content) => {
              savePost(post.id, content);
              setIsEditing(false);
            }}
          />
        </Suspense>
      ) : (
        <>
          <PostRenderer content={post.content} />
          <button
            onClick={() => setIsEditing(true)}
            onMouseEnter={() => {
              // Preload on hover — editor is ready by the time they click
              import('./components/RichTextEditor');
            }}
            className="px-6 py-4 text-base rounded-lg bg-blue-600 text-white
                       hover:bg-blue-700 transition-all duration-200
                       focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            Edit Post
          </button>
        </>
      )}
    </div>
  );
}
```

### Preloading Strategy

```typescript
// preload-utils.ts
type ModuleFactory = () => Promise<{ default: React.ComponentType<unknown> }>;

const preloadCache = new Set<string>();

export function preloadComponent(factory: ModuleFactory, key: string) {
  if (preloadCache.has(key)) return;
  preloadCache.add(key);
  factory(); // Triggers chunk download, result cached by bundler
}

// Route preloading on link hover
const routeMap: Record<string, ModuleFactory> = {
  '/settings': () => import('./pages/Settings'),
  '/analytics': () => import('./pages/Analytics'),
  '/admin': () => import('./pages/AdminPanel'),
};

export function PreloadLink({ to, children, ...props }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onMouseEnter={() => {
        const factory = routeMap[to];
        if (factory) preloadComponent(factory, to);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
```

### Next.js Dynamic Imports

```tsx
import dynamic from 'next/dynamic';

// Client-only component (no SSR) with loading state
const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-96 animate-pulse bg-gray-100 rounded-xl" />
  ),
});

// Named export
const Chart = dynamic(() =>
  import('./components/Charts').then((mod) => mod.BarChart)
);

// Conditional loading
function FeatureGated({ hasAccess }: { hasAccess: boolean }) {
  if (!hasAccess) return <UpgradePrompt />;

  const PremiumFeature = dynamic(() => import('./components/PremiumFeature'));
  return <PremiumFeature />;
}
```

```tsx
// Next.js App Router — route segments auto-split by default
// app/dashboard/page.tsx    → separate chunk
// app/settings/page.tsx     → separate chunk
// app/admin/layout.tsx      → separate chunk

// Use loading.tsx for per-route loading states
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
```

### Library Splitting

```typescript
// BAD: imports entire lodash (70KB gzipped)
import _ from 'lodash';
_.debounce(fn, 300);

// GOOD: imports only debounce (~1KB gzipped)
import debounce from 'lodash/debounce';
debounce(fn, 300);

// GOOD: dynamic import for one-time use
async function formatData(data: unknown[]) {
  const { groupBy } = await import('lodash-es/groupBy');
  return groupBy(data, 'category');
}
```

### Viewport-Based Loading (Intersection Observer)

```tsx
import { Suspense, lazy, useRef, useState, useEffect } from 'react';

function LazyOnViewport({
  factory,
  fallback,
  rootMargin = '200px',
}: {
  factory: () => Promise<{ default: React.ComponentType }>;
  fallback: React.ReactNode;
  rootMargin?: string;
}) {
  const [Component, setComponent] = useState<React.LazyExoticComponent<
    React.ComponentType
  > | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setComponent(lazy(factory));
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [factory, rootMargin]);

  if (!Component) {
    return <div ref={ref}>{fallback}</div>;
  }

  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}

// Usage
<LazyOnViewport
  factory={() => import('./components/HeavyChart')}
  fallback={<div className="h-96 animate-pulse bg-gray-100 rounded-xl" />}
  rootMargin="300px"
/>
```

### Bundle Analysis

```bash
# Webpack
npx webpack-bundle-analyzer stats.json

# Vite
npx vite-bundle-visualizer

# Next.js
ANALYZE=true next build
# Requires: npm install @next/bundle-analyzer
```

```javascript
// next.config.js with bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... config
});
```

```
Target chunk sizes:
  Main bundle:     < 100KB gzipped (critical path)
  Route chunks:    < 50KB gzipped each
  Vendor chunk:    < 150KB gzipped (shared dependencies)
  Total initial:   < 200KB gzipped (for fast TTI on 3G)
```

## Best Practices

1. **Split at route boundaries first.** This is the highest-impact, lowest-risk splitting strategy. Every page the user does not visit is JavaScript they never download.
2. **Add Suspense boundaries at each split point.** Always provide a meaningful loading state — skeleton screens over spinners. Nested Suspense boundaries prevent full-page loading states.
3. **Preload on hover/focus**, not just on navigation. The ~200ms between hover and click is enough to start loading the chunk, making navigation feel instant.
4. **Analyze regularly.** Run bundle analysis after adding new dependencies. A single `import dayjs` in a shared utility can add 20KB to every chunk.
5. **Use `React.lazy` for client components, `next/dynamic` for Next.js.** Next.js dynamic imports support SSR control and have built-in loading prop support.
6. **Do not over-split.** Each chunk has HTTP overhead (connection, headers, parsing). Splitting a 2KB component into its own chunk is counterproductive. Target chunks >10KB.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| No Suspense boundary | Unhandled error or blank screen on lazy load | Wrap every `lazy()` component in `<Suspense>` with fallback |
| Splitting tiny modules | More HTTP requests than bytes saved | Only split components/routes >10KB; use bundle analyzer to verify |
| Missing error boundary | White screen on chunk load failure (network error) | Add `<ErrorBoundary>` around `<Suspense>` with retry UI |
| Import in render path | New chunk created every render, never cached | Define `lazy()` outside component body, at module level |
| Re-exporting barrel files defeat tree shaking | Entire module included despite importing one export | Import directly from source file, not barrel `index.ts` |
| Waterfall loading | Parent chunk loads, then child chunk loads sequentially | Use `Promise.all` or prefetch to load parallel chunks; flatten lazy boundaries |
| Dynamic import path not statically analyzable | Bundler cannot create chunk | Use string literal in `import()`, not variables. Template literals with webpack require care |
| SSR mismatch with client-only lazy components | Hydration error | Use `next/dynamic` with `ssr: false` or check `typeof window` |
