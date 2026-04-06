# Zustand

> Minimal, un-opinionated state management for React with no boilerplate.

## When to Use
- Client-side state shared across components
- Replacing useState/useContext for global state
- Simple alternative to Redux when you don't need middleware/devtools complexity

## Core Patterns

### Store Definition
```typescript
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

interface AppStore {
  count: number;
  user: User | null;
  increment: () => void;
  setUser: (user: User) => void;
  reset: () => void;
}

const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        count: 0,
        user: null,
        increment: () => set((s) => ({ count: s.count + 1 })),
        setUser: (user) => set({ user }),
        reset: () => set({ count: 0, user: null }),
      }),
      { name: "app-store" } // localStorage key
    )
  )
);
```

### Usage in Components
```typescript
// Select specific slices to avoid unnecessary re-renders
const count = useAppStore((s) => s.count);
const increment = useAppStore((s) => s.increment);

// Shallow comparison for object slices
import { useShallow } from "zustand/react/shallow";
const { user, setUser } = useAppStore(useShallow((s) => ({ user: s.user, setUser: s.setUser })));
```

### Key Conventions
- **Selectors**: Always select specific slices, never `useStore()` without selector
- **useShallow**: Use for multi-property selections to prevent re-renders
- **Middleware**: `persist` (localStorage), `devtools` (Redux DevTools), `immer` (mutable updates)
- **Slices pattern**: Split large stores into slices combined with `...createSlice()`
- **No providers**: Zustand stores work without React context wrappers
- **Async actions**: Just use async/await inside actions, call `set()` when ready
- **Subscriptions**: `useAppStore.subscribe((state) => ...)` for side effects outside React
