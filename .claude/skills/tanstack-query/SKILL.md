---
name: tanstack-query
description: TanStack Query (React Query) — data fetching, caching, mutations, optimistic updates, infinite scrolling, and prefetching
layer: domain
category: data-fetching
triggers:
  - "tanstack query"
  - "react query"
  - "useQuery"
  - "useMutation"
  - "queryClient"
  - "useInfiniteQuery"
inputs:
  - "Data fetching requirements"
  - "Cache invalidation strategy"
  - "Optimistic update specifications"
outputs:
  - "Query and mutation hooks"
  - "Cache management patterns"
  - "Optimistic update implementations"
  - "Prefetching strategies"
linksTo:
  - tanstack
  - react
  - typescript-frontend
  - swr
linkedFrom: []
preferredNextSkills:
  - react
  - typescript-frontend
  - nextjs
fallbackSkills:
  - swr
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# TanStack Query (React Query) Patterns

## Purpose

Provide expert guidance on TanStack Query v5 for React, including data fetching, caching strategies, mutations with optimistic updates, infinite queries, prefetching, SSR hydration with Next.js, and production-grade patterns.

## Core Patterns

### 1. Provider Setup

```tsx
// providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,        // 1 minute before refetch
            gcTime: 5 * 60 * 1000,       // 5 minutes in cache after unmount
            retry: 2,
            refetchOnWindowFocus: false,  // Disable for less aggressive refetching
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

### 2. Query Keys Factory

```typescript
// lib/query-keys.ts
export const queryKeys = {
  // Posts
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: PostFilters) => [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
    infinite: (filters?: PostFilters) => [...queryKeys.posts.all, 'infinite', filters] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    byPost: (postId: string) => [...queryKeys.comments.all, 'post', postId] as const,
  },
} as const;
```

### 3. Basic Queries with Type Safety

```typescript
// hooks/use-posts.ts
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Post {
  id: string;
  title: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

interface PostFilters {
  search?: string;
  category?: string;
  page?: number;
}

async function fetchPosts(filters: PostFilters): Promise<{ posts: Post[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.page) params.set('page', String(filters.page));

  const res = await fetch(`/api/posts?${params}`);
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

// Standard query hook
export function usePosts(filters: PostFilters = {}) {
  return useQuery({
    queryKey: queryKeys.posts.list(filters),
    queryFn: () => fetchPosts(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

// Suspense query hook (for use with React Suspense)
export function usePostsSuspense(filters: PostFilters = {}) {
  return useSuspenseQuery({
    queryKey: queryKeys.posts.list(filters),
    queryFn: () => fetchPosts(filters),
  });
}

// Single post query
export function usePost(id: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error('Post not found');
      return res.json() as Promise<Post>;
    },
    enabled: !!id, // Only fetch when id is truthy
  });
}
```

### 4. Mutations with Optimistic Updates

```typescript
// hooks/use-create-post.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface CreatePostInput {
  title: string;
  content: string;
  categoryId?: string;
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create post');
      return res.json() as Promise<Post>;
    },
    onSuccess: () => {
      // Invalidate all post lists so they refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
}

// Optimistic update for toggling a like
export function useToggleLike(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle like');
      return res.json();
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });

      // Snapshot previous value
      const previousPost = queryClient.getQueryData<Post>(queryKeys.posts.detail(postId));

      // Optimistically update
      queryClient.setQueryData<Post>(queryKeys.posts.detail(postId), (old) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !old.isLiked,
          likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount + 1,
        };
      });

      return { previousPost };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(postId), context.previousPost);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}

// Delete with optimistic removal from list
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.lists() });

      // Remove from all cached lists
      queryClient.setQueriesData<{ posts: Post[]; total: number }>(
        { queryKey: queryKeys.posts.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            posts: old.posts.filter((p) => p.id !== postId),
            total: old.total - 1,
          };
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
}
```

### 5. Infinite Queries (Infinite Scroll)

```typescript
// hooks/use-infinite-posts.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface PostsPage {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useInfinitePosts(filters?: PostFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.infinite(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      if (filters?.search) params.set('search', filters.search);

      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json() as Promise<PostsPage>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
```

```tsx
// components/infinite-post-list.tsx
'use client';

import { useInfinitePosts } from '@/hooks/use-infinite-posts';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function InfinitePostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfinitePosts();

  const { ref, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === 'pending') return <PostListSkeleton />;
  if (status === 'error') return <ErrorMessage />;

  const allPosts = data.pages.flatMap((page) => page.posts);

  return (
    <div className="space-y-4">
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Sentinel element for infinite scroll */}
      <div ref={ref} className="h-10">
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}
      </div>

      {!hasNextPage && allPosts.length > 0 && (
        <p className="text-center text-text-secondary py-4">
          No more posts to load.
        </p>
      )}
    </div>
  );
}
```

### 6. Prefetching & SSR with Next.js

```tsx
// app/posts/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { PostList } from '@/components/post-list';

export default async function PostsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.posts.list({}),
    queryFn: () => fetchPosts({}), // Direct fetch, no browser API needed
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostList />
    </HydrationBoundary>
  );
}
```

```tsx
// Prefetch on hover for instant navigation
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import Link from 'next/link';

export function PostLink({ post }: { post: Post }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.posts.detail(post.id),
      queryFn: () => fetch(`/api/posts/${post.id}`).then((r) => r.json()),
      staleTime: 30 * 1000, // Don't refetch if prefetched within 30s
    });
  };

  return (
    <Link
      href={`/posts/${post.id}`}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className="text-brand-600 hover:underline transition-all duration-200"
    >
      {post.title}
    </Link>
  );
}
```

### 7. Dependent Queries

```typescript
// Fetch user, then fetch their posts
export function useUserPosts(userId?: string) {
  const userQuery = useQuery({
    queryKey: queryKeys.users.detail(userId!),
    queryFn: () => fetchUser(userId!),
    enabled: !!userId,
  });

  const postsQuery = useQuery({
    queryKey: queryKeys.posts.list({ authorId: userId }),
    queryFn: () => fetchPosts({ authorId: userId }),
    enabled: !!userQuery.data, // Only fetch when user is loaded
  });

  return { user: userQuery, posts: postsQuery };
}
```

### 8. Typed API Client Helper

```typescript
// lib/api-client.ts
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(res.status, error.message);
  }

  return res.json();
}

// Usage in query hooks
export function usePosts(filters: PostFilters) {
  return useQuery({
    queryKey: queryKeys.posts.list(filters),
    queryFn: () => apiClient<{ posts: Post[]; total: number }>(`/posts?${buildParams(filters)}`),
  });
}
```

## Best Practices

1. **Use a query key factory** -- centralize all keys in one file for consistency and easy invalidation.
2. **Set `staleTime` globally** -- default `0` causes unnecessary refetches; 60s is a good starting point.
3. **Use `placeholderData`** for paginated queries to keep previous data visible during refetch.
4. **Invalidate broadly, fetch narrowly** -- invalidate at the list level, but queries only refetch if mounted.
5. **Use `useSuspenseQuery`** with React Suspense boundaries for cleaner loading states.
6. **Prefetch on hover/focus** for detail pages to make navigation feel instant.
7. **Always roll back optimistic updates** in `onError` with the snapshot from `onMutate`.
8. **Use `onSettled`** (not just `onSuccess`) to invalidate, ensuring consistency even after errors.
9. **Separate query functions from hooks** -- makes them testable and reusable for SSR prefetching.
10. **Use `gcTime` (not `cacheTime`)** -- renamed in v5; controls how long inactive data stays in memory.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Inline query keys `['posts', id]` | Typos, inconsistent invalidation | Use a query key factory |
| `staleTime: 0` (default) everywhere | Excessive refetching, bandwidth waste | Set reasonable global `staleTime` |
| Fetching in `useEffect` + `useState` | Loses caching, dedup, background refetch | Use `useQuery` instead |
| Calling `queryClient.fetchQuery` in components | Bypasses React lifecycle, no auto-refetch | Use `useQuery` or `usePrefetchQuery` |
| Not handling error states | Blank screen on failure | Check `isError` or use error boundaries |
| Optimistic update without rollback | UI stuck in wrong state after API error | Always implement `onError` rollback |
| Over-invalidating with `queryKey: ['posts']` | Refetches every posts query variant | Invalidate specific sub-keys when possible |
| `refetchOnWindowFocus: true` for mutation-heavy UIs | Constant refetching disrupts user flow | Disable per-query or globally for write-heavy apps |

## Decision Guide

| Scenario | Approach |
|----------|----------|
| Simple data fetch | `useQuery` with typed fetcher |
| Server-rendered page | Prefetch in Server Component + `HydrationBoundary` |
| Infinite scroll / load more | `useInfiniteQuery` with cursor pagination |
| Form submission | `useMutation` with `onSuccess` invalidation |
| Like/toggle action | `useMutation` with optimistic update + rollback |
| Dependent data (A then B) | Chain queries with `enabled: !!parentData` |
| Real-time data | `refetchInterval: 5000` or combine with WebSocket invalidation |
| Search with debounce | Debounce input state, pass to `useQuery` queryKey |
| Prefetch next page | `queryClient.prefetchQuery` on hover or in `getNextPageParam` |
