# SWR

layer: domain | category: data-fetching | riskLevel: low
triggers: ["swr", "stale-while-revalidate", "useSWR", "data fetching hook"]

## Overview

React hooks library for data fetching using the stale-while-revalidate HTTP cache strategy. Returns cached (stale) data first, then fetches (revalidates), and finally delivers fresh data. Built-in caching, deduplication, revalidation, and focus tracking.

## When to Use

- Client-side data fetching in React/Next.js apps
- Real-time or near-real-time data that benefits from cache-first rendering
- Paginated or infinite scroll lists
- Replacing manual `useEffect` + `useState` fetch patterns

## Key Patterns

### Basic Usage
```ts
const { data, error, isLoading, mutate } = useSWR('/api/user', fetcher)
```

### Remote Mutations
```ts
const { trigger, isMutating } = useSWRMutation('/api/user', updateUser)
```

### Infinite Scroll / Pagination
```ts
const { data, size, setSize } = useSWRInfinite(
  (index) => `/api/items?page=${index + 1}`, fetcher
)
```

### Global Configuration
```tsx
<SWRConfig value={{ fetcher, revalidateOnFocus: true, dedupingInterval: 2000 }}>
  <App />
</SWRConfig>
```

### Conditional Fetching — pass `null` key to skip
```ts
const { data } = useSWR(userId ? `/api/user/${userId}` : null, fetcher)
```

### Optimistic Updates
```ts
mutate('/api/todos', async (todos) => {
  return [...todos, newTodo]
}, { optimisticData: [...currentTodos, newTodo], rollbackOnError: true })
```

### Revalidation Strategies
- `revalidateOnFocus` — refetch on window focus (default: true)
- `refreshInterval` — polling interval in ms
- `revalidateOnReconnect` — refetch on network recovery

### Error Retry
```ts
useSWR(key, fetcher, { onErrorRetry: (err, key, config, revalidate, { retryCount }) => {
  if (retryCount >= 3) return
  setTimeout(() => revalidate({ retryCount }), 5000)
}})
```

### Cache Provider & Persistence
```tsx
<SWRConfig value={{ provider: () => new Map() }}> {/* or localStorage-backed */}
```

### Middleware
```ts
const logger = (useSWRNext) => (key, fetcher, config) => {
  const swr = useSWRNext(key, fetcher, config)
  useEffect(() => { console.log(key, swr.data) }, [swr.data])
  return swr
}
```

## Anti-Patterns

- Fetching inside `useEffect` when SWR handles it — duplicates requests
- Using mutable objects as keys — causes infinite revalidation loops
- Ignoring `isLoading` vs `isValidating` — they indicate different states
- Calling `mutate()` without a key — always scope mutations to a specific key
- Nesting `SWRConfig` without intent — inner config merges with outer

## Related Skills

react, nextjs, typescript-frontend, tanstack
