---
name: state-management
description: Client-side state management with Zustand, Jotai, Redux Toolkit, and URL state patterns
layer: domain
category: frontend
triggers:
  - "state management"
  - "zustand"
  - "jotai"
  - "redux"
  - "global state"
  - "client state"
  - "signals"
inputs:
  - requirements: What state needs to be managed and how it is accessed
  - scale: App complexity (small/medium/large)
  - framework: React | Next.js | Vue (optional, defaults to React)
outputs:
  - store_definition: State store with actions and selectors
  - pattern_recommendation: Which library and pattern to use
  - integration_code: How to connect state to components
linksTo:
  - react
  - nextjs
  - forms
linkedFrom:
  - cook
  - react
  - nextjs
preferredNextSkills:
  - react
  - forms
fallbackSkills:
  - react
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# State Management Skill

## Purpose

Select and implement the right state management approach for React applications. This skill covers Zustand for simple-to-medium apps, Jotai for atomic state, Redux Toolkit for large-scale apps, and URL/server state patterns. The key insight: most apps need less state management than developers think.

## Key Concepts

### State Categories

```
SERVER STATE (fetched from API):
  Use: TanStack Query, SWR, or Next.js server components
  NOT Zustand/Redux. Server state belongs in a cache, not a store.

CLIENT STATE (UI interactions):
  Local:  useState, useReducer (component-scoped)
  Shared: Zustand, Jotai (cross-component)
  Global: Redux Toolkit (large-scale, complex flows)

URL STATE (route parameters, search params):
  Use: nuqs, next/navigation, URLSearchParams
  Filters, pagination, sort order belong in the URL, not in a store.

FORM STATE:
  Use: React Hook Form, useActionState
  Form data belongs in the form library, not in a store.

DECISION TREE:
  Is it server data?    -> TanStack Query / SWR / RSC
  Is it in the URL?     -> URL params (nuqs, searchParams)
  Is it form data?      -> React Hook Form
  Is it local UI state? -> useState / useReducer
  Is it shared UI state? -> Zustand (simple) or Jotai (atomic)
  Is it complex with many actions? -> Redux Toolkit
```

### Library Comparison

```
ZUSTAND:
  Mental model: Top-down store (like Redux, but simpler)
  Bundle size: ~1KB
  Best for: Shared UI state, simple to medium apps
  API: create store -> useStore hook

JOTAI:
  Mental model: Bottom-up atoms (like Recoil, but simpler)
  Bundle size: ~2KB
  Best for: Independent pieces of state, derived state
  API: atom() -> useAtom()

REDUX TOOLKIT:
  Mental model: Centralized store with slices
  Bundle size: ~10KB
  Best for: Large apps, complex state machines, middleware
  API: createSlice -> configureStore -> useSelector/useDispatch

URL STATE (nuqs):
  Mental model: State in the URL, synced with React
  Bundle size: ~2KB
  Best for: Filters, search, pagination, shareable state
  API: useQueryState()
```

## Patterns

### Zustand Store

```typescript
// stores/cart-store.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  // Computed
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      immer((set, get) => ({
        items: [],

        addItem: (item) =>
          set((state) => {
            const existing = state.items.find((i) => i.id === item.id);
            if (existing) {
              existing.quantity += 1;
            } else {
              state.items.push({ ...item, quantity: 1 });
            }
          }),

        removeItem: (id) =>
          set((state) => {
            state.items = state.items.filter((i) => i.id !== id);
          }),

        updateQuantity: (id, quantity) =>
          set((state) => {
            const item = state.items.find((i) => i.id === id);
            if (item) {
              item.quantity = Math.max(0, quantity);
              if (item.quantity === 0) {
                state.items = state.items.filter((i) => i.id !== id);
              }
            }
          }),

        clearCart: () => set({ items: [] }),

        totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
        totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      })),
      { name: 'cart-storage' }
    ),
    { name: 'CartStore' }
  )
);

// Usage in components -- subscribe to specific slices to avoid re-renders
function CartBadge() {
  const totalItems = useCartStore((s) => s.totalItems());
  return <span>{totalItems}</span>;
}

function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  // ...
}
```

### Jotai Atoms

```typescript
// atoms/theme.ts
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Primitive atom (stored in localStorage)
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('theme', 'system');

// Derived atom (computed from other atoms)
export const resolvedThemeAtom = atom((get) => {
  const theme = get(themeAtom);
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
});

// Async atom (fetches data)
export const userAtom = atom(async () => {
  const res = await fetch('/api/me');
  return res.json();
});

// Write-only atom (action)
export const toggleThemeAtom = atom(null, (get, set) => {
  const current = get(themeAtom);
  set(themeAtom, current === 'dark' ? 'light' : 'dark');
});

// Usage
function ThemeToggle() {
  const theme = useAtomValue(themeAtom);
  const toggle = useSetAtom(toggleThemeAtom);
  return <button onClick={toggle}>{theme}</button>;
}
```

### URL State with nuqs

```typescript
// For filters, search, pagination -- state belongs in the URL
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';

function ProductList() {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('newest'));

  // URL: /products?q=shoes&page=2&sort=price
  // State is shareable, bookmarkable, and survives refreshes
}
```

## Best Practices

1. **Start with server state** -- most "state management" problems are actually data fetching problems
2. **Use the URL for shareable state** -- filters, search, pagination belong in URL params
3. **Keep stores small** -- one store per domain concern, not one mega-store
4. **Subscribe to slices** -- `useStore(s => s.field)` prevents unnecessary re-renders
5. **Derive, do not duplicate** -- computed values should be derived from base state, not stored separately
6. **Colocate state** -- start with local state; lift to shared only when needed
7. **Type your stores** -- define interfaces for state shape and actions
8. **Use middleware sparingly** -- devtools in development, persist for specific stores
9. **Avoid state for server data** -- use TanStack Query or SWR for API data
10. **Test stores in isolation** -- Zustand stores can be tested without rendering components

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Storing server data in Zustand | Stale data, no cache invalidation | Use TanStack Query or SWR |
| One mega-store | Everything re-renders on any change | Split into domain-specific stores |
| Not selecting slices | Component re-renders on unrelated changes | `useStore(s => s.specificField)` |
| Duplicating derived state | Out of sync, extra updates | Use computed getters or derived atoms |
| URL state in a store | Not shareable, lost on refresh | Use URL params (nuqs) |
| Over-engineering | useState would have sufficed | Start simple, upgrade only when needed |
