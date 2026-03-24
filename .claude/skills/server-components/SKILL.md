---
name: server-components
description: React Server Components deep dive — RSC payload, streaming SSR, server/client boundaries, data patterns
layer: domain
category: frontend
triggers:
  - "server component"
  - "rsc"
  - "server client boundary"
  - "use server"
  - "server-only"
  - "rsc payload"
inputs:
  - "Server vs client component decisions"
  - "Data fetching patterns in RSC"
  - "Server/client boundary architecture"
  - "Streaming and Suspense patterns"
outputs:
  - "Server/client component architecture"
  - "RSC data fetching patterns"
  - "Boundary optimization strategies"
  - "Streaming SSR implementations"
linksTo:
  - nextjs
  - react
  - streaming
  - suspense
linkedFrom:
  - nextjs
  - react
preferredNextSkills:
  - nextjs
  - streaming
fallbackSkills:
  - react
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# React Server Components

## Purpose

Provide expert guidance on React Server Components (RSC) architecture, including server/client boundary decisions, data fetching patterns, streaming SSR, RSC payload optimization, and common patterns for building performant applications with the App Router in Next.js 14+.

## Key Patterns

### Server vs Client Components

**Default to Server Components.** Only add `"use client"` when you need browser APIs, event handlers, or React state/effects.

| Feature | Server Component | Client Component |
|---------|-----------------|------------------|
| `async/await` for data | Yes | No (use hooks) |
| Database/file access | Yes | No |
| `useState`, `useEffect` | No | Yes |
| Event handlers (`onClick`) | No | Yes |
| Browser APIs (`window`, `localStorage`) | No | Yes |
| Bundle size impact | Zero JS sent | Adds to bundle |
| Re-renders on state change | No | Yes |

**Decision tree:**

```
Does it need useState/useEffect/event handlers?
  YES -> "use client"
  NO  -> Does it fetch data or access server resources?
    YES -> Server Component (default)
    NO  -> Server Component (default, still zero JS)
```

### Server/Client Boundary Architecture

Push `"use client"` boundaries as deep as possible in the component tree. Keep data fetching and layout in Server Components, and only wrap interactive leaf components as Client Components.

```tsx
// app/products/page.tsx -- Server Component (default)
import { Suspense } from "react";
import { ProductList } from "./product-list";
import { ProductFilters } from "./product-filters"; // "use client"
import { Skeleton } from "@/components/skeleton";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex gap-8">
      {/* Client Component for interactive filters */}
      <aside className="w-64">
        <ProductFilters
          initialCategory={params.category}
          initialSort={params.sort}
        />
      </aside>

      {/* Server Component with streaming */}
      <main className="flex-1">
        <Suspense fallback={<Skeleton count={12} />}>
          <ProductList
            category={params.category}
            sort={params.sort}
          />
        </Suspense>
      </main>
    </div>
  );
}
```

```tsx
// app/products/product-list.tsx -- Server Component
import { db } from "@/lib/db";

export async function ProductList({
  category,
  sort,
}: {
  category?: string;
  sort?: string;
}) {
  const products = await db.query.products.findMany({
    where: category ? eq(products.category, category) : undefined,
    orderBy: sort === "price" ? asc(products.price) : desc(products.createdAt),
  });

  return (
    <div className="grid grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

```tsx
// app/products/product-filters.tsx -- Client Component
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function ProductFilters({
  initialCategory,
  initialSort,
}: {
  initialCategory?: string;
  initialSort?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  }

  return (
    <div className={`p-6 rounded-xl shadow-sm ${isPending ? "opacity-60" : ""}`}>
      <select
        defaultValue={initialCategory}
        onChange={(e) => updateFilter("category", e.target.value)}
        className="px-4 py-3 rounded-lg border w-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>
    </div>
  );
}
```

### Composition Pattern: Server Components as Children

Pass Server Components as `children` to Client Components to avoid pulling them into the client bundle.

```tsx
// app/layout.tsx -- Server Component
import { AuthProvider } from "./auth-provider"; // "use client"
import { Sidebar } from "./sidebar"; // Server Component

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </AuthProvider>
  );
}
```

```tsx
// app/auth-provider.tsx -- Client Component
"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // children (including Server Components) are pre-rendered on the server
  // and passed as the RSC payload -- not re-rendered on the client
  return <SessionProvider>{children}</SessionProvider>;
}
```

### Data Fetching Patterns

**Pattern 1: Direct database access in Server Components**

```tsx
import { db } from "@/lib/db";

async function UserProfile({ userId }: { userId: string }) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { posts: { limit: 10 } },
  });

  if (!user) notFound();

  return (
    <div className="p-6 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold">{user.name}</h1>
      <p className="text-base text-gray-600">{user.bio}</p>
    </div>
  );
}
```

**Pattern 2: Parallel data fetching**

```tsx
async function Dashboard() {
  const [stats, recentOrders, notifications] = await Promise.all([
    getStats(),
    getRecentOrders(),
    getNotifications(),
  ]);

  return (
    <div className="grid grid-cols-3 gap-6">
      <StatsCard stats={stats} />
      <OrderList orders={recentOrders} />
      <NotificationList notifications={notifications} />
    </div>
  );
}
```

**Pattern 3: Streaming with Suspense boundaries**

```tsx
async function Page() {
  return (
    <div>
      {/* Fast: renders immediately */}
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Streams in when ready */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Independent stream -- does not block above */}
      <Suspense fallback={<OrdersSkeleton />}>
        <RecentOrders />
      </Suspense>

      {/* Slow query streams last */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsChart />
      </Suspense>
    </div>
  );
}
```

### Server Actions

Server-side mutations callable from Client Components.

```tsx
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function createPost(formData: FormData) {
  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const post = await db.insert(posts).values(parsed.data).returning();

  revalidatePath("/posts");
  redirect(`/posts/${post[0].id}`);
}
```

```tsx
// app/posts/new/page.tsx -- Client Component using Server Action
"use client";

import { useActionState } from "react";
import { createPost } from "../actions";

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="title" className="block text-base font-medium mb-2">
          Title
        </label>
        <input
          id="title"
          name="title"
          className="px-4 py-3 rounded-lg border w-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        {state?.error?.title && (
          <p className="text-red-600 text-sm mt-1">{state.error.title}</p>
        )}
      </div>

      <div>
        <label htmlFor="content" className="block text-base font-medium mb-2">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          className="px-4 py-3 rounded-lg border w-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        {state?.error?.content && (
          <p className="text-red-600 text-sm mt-1">{state.error.content}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-4 text-base rounded-lg bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "Publishing..." : "Publish"}
      </button>
    </form>
  );
}
```

### Protecting Server-Only Code

Prevent accidental import of server code into Client Components.

```typescript
// lib/db.ts
import "server-only"; // Throws build error if imported in a Client Component

import { drizzle } from "drizzle-orm/neon-http";

export const db = drizzle(process.env.DATABASE_URL!);
```

```typescript
// lib/auth.ts
import "server-only";

import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}
```

### RSC Payload Optimization

Keep the RSC payload small by avoiding passing large data through component props.

```tsx
// BAD: Entire product object serialized in RSC payload
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id); // 50 fields
  return <ProductView product={product} />;
}

// GOOD: Only pass what the component needs
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  return (
    <ProductView
      name={product.name}
      price={product.price}
      image={product.image}
      description={product.description}
    />
  );
}
```

**Avoid serializing non-serializable values:**

```tsx
// BAD: Functions cannot be serialized across the server/client boundary
<ClientComponent onClick={() => console.log("click")} />

// GOOD: Use Server Actions for server-side logic
<ClientComponent action={serverAction} />

// GOOD: Handle events in the Client Component itself
<ClientComponent productId={product.id} />
```

## Best Practices

- **Default to Server Components** -- only add `"use client"` when you need interactivity, state, or browser APIs.
- **Push client boundaries down** -- wrap the smallest interactive subtree, not entire pages.
- **Use `server-only` package** to guard server code from accidental client import.
- **Fetch data in Server Components** directly -- no need for API routes or `useEffect` + `fetch`.
- **Use `Promise.all` for parallel fetches** -- do not `await` sequentially unless data depends on each other.
- **Wrap slow data fetches in `<Suspense>`** -- stream the shell immediately and fill in data as it resolves.
- **Pass Server Components as `children`** to Client Components to keep them out of the client bundle.
- **Validate Server Action inputs** with Zod -- never trust form data from the client.
- **Use `revalidatePath` or `revalidateTag`** after mutations to refresh cached data.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Adding `"use client"` to a page component | Entire page tree becomes client-rendered, losing RSC benefits | Keep page as Server Component; extract interactive parts into Client child components |
| Importing `useState` in a Server Component | Build error: hooks only work in Client Components | Move stateful logic to a `"use client"` child component |
| Passing functions as props across boundary | Serialization error: functions are not serializable | Use Server Actions (`"use server"`) or handle events inside the Client Component |
| Sequential `await` in Server Components | Waterfall: each fetch waits for the previous one | Use `Promise.all()` for independent data or Suspense for parallel streaming |
| Importing `server-only` modules in Client Components | Build error (good) or runtime error (bad without `server-only`) | Add `import "server-only"` to all files that use `process.env`, DB, cookies, etc. |
| Huge RSC payload | Slow initial load due to large serialized props | Only pass necessary fields; avoid serializing entire database rows |
| Not using Suspense boundaries | Entire page blocked until slowest query resolves | Wrap independent data sections in separate `<Suspense>` boundaries |
| Mutating data without revalidation | UI shows stale data after Server Action | Call `revalidatePath()` or `revalidateTag()` at the end of every mutation |
