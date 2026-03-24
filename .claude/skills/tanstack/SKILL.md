# TanStack

> Type-safe, headless utilities for React: Query, Table, Router, Form, Virtual.

## When to Use
- Server state management (fetching, caching, mutations)
- Complex data tables with sorting, filtering, pagination
- Type-safe routing with loaders and search params
- Virtualizing large lists/grids for performance

## Core Patterns

### TanStack Query
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch with caching
const { data, isLoading, error } = useQuery({
  queryKey: ["users", filters],
  queryFn: () => fetchUsers(filters),
  staleTime: 5 * 60 * 1000, // 5 min
});

// Mutation with cache invalidation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
});
```

### TanStack Table
```typescript
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
```

### Key Conventions
- **Query keys**: Array format `["entity", ...params]` — enables granular invalidation
- **Optimistic updates**: `onMutate` → update cache → `onError` → rollback
- **Prefetching**: `queryClient.prefetchQuery()` on hover/route transition
- **Infinite scroll**: `useInfiniteQuery` with `getNextPageParam`
- **Column defs**: `columnHelper.accessor()` for type-safe column definitions
- **Headless**: TanStack provides logic, you provide markup — pairs with shadcn/ui
