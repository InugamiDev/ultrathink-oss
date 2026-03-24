# Skill: prefetch
> Layer: domain | Category: frontend

## Triggers
- prefetch, preload data, prefetchQuery, router.prefetch, hover preload, stale-while-revalidate, link prefetch

## Links
- linksTo: react-query, nextjs-app-router, server-components
- linkedFrom: react-query, nextjs-app-router

## Overview

Data prefetching loads resources before the user needs them, eliminating perceived latency.
Strategies range from automatic link prefetching to manual hover-triggered data preloading.

## Next.js Link Prefetch

Next.js automatically prefetches `<Link>` routes when they enter the viewport.

```tsx
import Link from "next/link";

// Automatic: prefetches when link scrolls into view (production only)
<Link href="/dashboard">Dashboard</Link>

// Disable prefetch for rarely visited routes
<Link href="/settings" prefetch={false}>Settings</Link>

// Force full page prefetch (not just loading boundary)
<Link href="/dashboard" prefetch={true}>Dashboard</Link>
```

| `prefetch` value | Behavior                                               |
|------------------|--------------------------------------------------------|
| `undefined`      | Prefetches up to the nearest `loading.tsx` boundary     |
| `true`           | Prefetches the full page data                           |
| `false`          | No prefetching — fetches on click                       |

## router.prefetch()

Programmatically prefetch a route before navigation.

```tsx
"use client";
import { useRouter } from "next/navigation";

export function ProjectCard({ id }: { id: string }) {
  const router = useRouter();

  return (
    <div
      className="p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md"
      onMouseEnter={() => router.prefetch(`/project/${id}`)}
      onClick={() => router.push(`/project/${id}`)}
    >
      <h3 className="text-base font-semibold">Project {id}</h3>
    </div>
  );
}
```

## React Query — prefetchQuery

Prefetch data into the query cache so it is instantly available when the component mounts.

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { getProject } from "@/lib/api";

export function ProjectLink({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ["project", id],
      queryFn: () => getProject(id),
      staleTime: 60_000, // won't refetch if data is < 60s old
    });
  };

  return (
    <a
      href={`/project/${id}`}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className="px-6 py-4 text-base rounded-lg transition-all duration-200
                 hover:bg-muted focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      View Project
    </a>
  );
}
```

## Server Component Preloading Pattern

Preload functions let you start fetching data at the top of a server component tree.

```ts
// lib/data.ts
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json();
});

// Call early to start the fetch — the cache deduplicates
export const preloadUser = (id: string) => {
  void getUser(id);
};
```

```tsx
// app/user/[id]/page.tsx
import { preloadUser, getUser } from "@/lib/data";

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  preloadUser(id); // starts fetch immediately

  // other async work can happen here...

  const user = await getUser(id); // resolves instantly if already fetched
  return <h1 className="text-2xl font-bold py-16">{user.name}</h1>;
}
```

## Stale-While-Revalidate

Show cached data immediately while revalidating in the background.

```tsx
const { data } = useQuery({
  queryKey: ["projects"],
  queryFn: fetchProjects,
  staleTime: 30_000,       // fresh for 30s
  gcTime: 5 * 60_000,      // keep in cache for 5min
  refetchOnWindowFocus: true,
});
```

## Key Rules

1. Prefetch on **hover and focus** — not just hover — for keyboard accessibility.
2. Set `staleTime` when prefetching with React Query to avoid immediate refetch on mount.
3. Use `React.cache()` for server component data deduplication across the tree.
4. Avoid prefetching large payloads unconditionally — use viewport or hover triggers.
5. `router.prefetch()` caches the RSC payload; combine with data prefetching for full coverage.
6. In production, Next.js `<Link>` prefetches automatically — disable for auth-gated routes.
