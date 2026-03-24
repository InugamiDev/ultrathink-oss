---
name: nextjs
description: Next.js App Router, React Server Components, data fetching, caching, middleware, and deployment patterns
layer: domain
category: frontend
triggers:
  - "next.js"
  - "nextjs"
  - "app router"
  - "server component"
  - "RSC"
  - "server action"
  - "next/image"
  - "next/link"
  - "middleware"
  - "generateStaticParams"
  - "revalidate"
inputs:
  - "Page or route requirements"
  - "Data fetching strategy questions"
  - "Caching and revalidation needs"
  - "Deployment and performance concerns"
outputs:
  - "Next.js pages, layouts, and routes"
  - "Server/client component architecture"
  - "Data fetching and caching strategies"
  - "Middleware and API route implementations"
linksTo:
  - react
  - typescript-frontend
  - tailwindcss
  - forms
  - state-management
linkedFrom:
  - code-writer
  - code-reviewer
  - architect
preferredNextSkills:
  - react
  - typescript-frontend
  - tailwindcss
fallbackSkills:
  - svelte
  - vue
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Next.js App Router & RSC Patterns

## Purpose

Provide expert guidance on Next.js 14+ App Router architecture, React Server Components, data fetching strategies, caching, and production deployment patterns. This skill focuses on the App Router paradigm and modern Next.js conventions.

## Key Patterns

### File System Routing

**Route Hierarchy:**

```
app/
  layout.tsx          # Root layout (wraps everything)
  page.tsx            # Home route /
  loading.tsx         # Suspense fallback for /
  error.tsx           # Error boundary for /
  not-found.tsx       # 404 for /
  global-error.tsx    # Root error boundary (replaces layout)

  dashboard/
    layout.tsx        # Nested layout for /dashboard/*
    page.tsx          # /dashboard
    loading.tsx       # Suspense for /dashboard

    settings/
      page.tsx        # /dashboard/settings

    [teamId]/
      page.tsx        # /dashboard/:teamId (dynamic)

    [...slug]/
      page.tsx        # /dashboard/* (catch-all)

  (marketing)/        # Route group (no URL impact)
    about/
      page.tsx        # /about
    pricing/
      page.tsx        # /pricing

  @modal/             # Parallel route (named slot)
    (.)photo/[id]/
      page.tsx        # Intercepted route

  api/
    route.ts          # API route /api
```

**Special Files Priority:** `layout > template > error > loading > not-found > page`

### Server vs Client Components

**Default: Server Components.** Only add `'use client'` when you need:
- Event handlers (`onClick`, `onChange`, etc.)
- State or effects (`useState`, `useEffect`, `useReducer`)
- Browser-only APIs (`window`, `localStorage`, `IntersectionObserver`)
- Custom hooks that use the above
- Third-party components that require client context

**Push client boundaries down:**

```tsx
// GOOD: Server component with small client island
// app/dashboard/page.tsx (Server Component)
import { getStats } from '@/lib/data';
import { StatsChart } from '@/components/stats-chart'; // client component

export default async function DashboardPage() {
  const stats = await getStats(); // runs on server, no waterfall
  return (
    <section className="py-16">
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
      {/* Pass serializable data to client component */}
      <StatsChart data={stats} />
    </section>
  );
}

// components/stats-chart.tsx
'use client';
import { useState } from 'react';

export function StatsChart({ data }: { data: StatsData }) {
  const [range, setRange] = useState<'week' | 'month'>('week');
  // Interactive chart logic...
}
```

**BAD: Making entire page client-side:**

```tsx
// AVOID: Entire page as client component
'use client'; // This kills SSR benefits for the whole subtree
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  useEffect(() => { fetch('/api/stats').then(/* waterfall! */) }, []);
}
```

### Data Fetching

**Server Components — fetch directly:**

```tsx
// Automatic request deduplication within a render pass
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetch(`https://api.example.com/products/${id}`, {
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  }).then(r => r.json());

  return <ProductDetail product={product} />;
}
```

**Parallel Data Fetching — avoid waterfalls:**

```tsx
// GOOD: Parallel fetches
async function DashboardPage() {
  const [user, stats, notifications] = await Promise.all([
    getUser(),
    getStats(),
    getNotifications(),
  ]);
  return (/* ... */);
}

// ALSO GOOD: Suspense streaming
async function DashboardPage() {
  const userPromise = getUser();
  const statsPromise = getStats();

  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserSection userPromise={userPromise} />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection statsPromise={statsPromise} />
      </Suspense>
    </div>
  );
}
```

### Caching & Revalidation

**Cache Hierarchy (Next.js 15+):**

| Layer | Scope | Default | Control |
|-------|-------|---------|---------|
| Request Memoization | Single render pass | ON | `React.cache()` |
| Data Cache | Cross-request | OFF (Next 15) | `fetch({ next: { revalidate } })` |
| Full Route Cache | Static routes | ON for static | `export const dynamic` |
| Router Cache | Client-side | ON (reduced in 15) | `router.refresh()` |

**Revalidation Strategies:**

```tsx
// Time-based revalidation
export const revalidate = 3600; // Page-level: revalidate every hour

// On-demand revalidation via Server Action
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function publishPost(id: string) {
  await db.post.update({ where: { id }, data: { published: true } });
  revalidatePath('/blog');           // Revalidate specific path
  revalidateTag('posts');            // Revalidate by cache tag
}

// Tag-based fetch caching
const posts = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'], revalidate: 3600 },
});
```

**Dynamic vs Static:**

```tsx
// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Force static generation
export const dynamic = 'force-static';

// Generate static params for dynamic routes
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(post => ({ slug: post.slug }));
}
```

### Server Actions

```tsx
// app/actions.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function createPost(prevState: ActionState, formData: FormData) {
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.post.create({ data: parsed.data });
    revalidatePath('/posts');
    return { success: true };
  } catch (e) {
    return { error: { _form: ['Failed to create post'] } };
  }
}
```

```tsx
// app/posts/new/page.tsx
'use client';

import { useActionState } from 'react';
import { createPost } from '@/app/actions';

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="title" className="block text-base font-medium mb-2">Title</label>
        <input
          id="title"
          name="title"
          className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        {state?.error?.title && (
          <p className="text-red-600 text-sm mt-1">{state.error.title[0]}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-4 text-base rounded-lg bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### Middleware

```tsx
// middleware.ts (root level)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth check
  const token = request.cookies.get('session')?.value;
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Add headers
  const response = NextResponse.next();
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
```

### Metadata & SEO

```tsx
// Static metadata
export const metadata: Metadata = {
  title: 'My App',
  description: 'Description here',
  openGraph: { title: 'My App', description: '...' },
};

// Dynamic metadata
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [post.coverImage],
    },
  };
}
```

### Image & Font Optimization

```tsx
import Image from 'next/image';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Image with proper sizing
<Image
  src={product.image}
  alt={product.name}
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="rounded-xl"
  priority={isAboveFold}
/>
```

## Best Practices

1. **Server Components by default** — Only add `'use client'` when browser APIs or interactivity are needed.
2. **Colocate data fetching** — Fetch data in the component that needs it. Request deduplication handles the rest.
3. **Stream with Suspense** — Wrap slow data sources in `<Suspense>` to stream HTML incrementally.
4. **Never fetch from client to your own API routes** — Use Server Actions or direct database access in Server Components.
5. **Use `loading.tsx`** — Provides instant loading states via Suspense.
6. **Validate Server Action inputs** — Always validate with Zod or similar. Never trust client data.
7. **Use `next/image`** — Automatic WebP/AVIF, lazy loading, and responsive sizing.
8. **Use `next/font`** — Zero layout shift, self-hosted font files.
9. **Prefer `revalidatePath`/`revalidateTag`** — Over `router.refresh()` for cache invalidation.
10. **Keep middleware lean** — It runs on every matched request. No heavy computation or database calls.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `'use client'` at page level | Entire page loses SSR benefits | Push client boundary to smallest component |
| Fetching own API routes from RSC | Unnecessary network hop | Call database/service directly in RSC |
| Missing `loading.tsx` | White flash during navigation | Add loading files for major route segments |
| Sequential awaits in RSC | Waterfall data fetching | Use `Promise.all()` or parallel Suspense |
| Huge client bundles | Slow hydration | Dynamic import heavy components, keep client islands small |
| Not using `sizes` on Image | Full-size image downloaded on mobile | Always set responsive `sizes` prop |
| Mutating in GET handlers | Caching serves stale mutations | Use POST/PUT/DELETE or Server Actions for mutations |
| Accessing `searchParams` synchronously | Next.js 15 made params async | `await params` and `await searchParams` |
| No error boundaries | Entire page crashes on component error | Use `error.tsx` per route segment |
| Hardcoding secrets client-side | Security leak | Use `NEXT_PUBLIC_` prefix only for truly public values |
