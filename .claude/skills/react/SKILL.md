---
name: react
description: React patterns, hooks, state management, performance optimization, and component architecture for production applications
layer: domain
category: frontend
triggers:
  - "react component"
  - "react hook"
  - "react performance"
  - "react pattern"
  - "useState"
  - "useEffect"
  - "react render"
  - "JSX"
  - "react context"
  - "react memo"
inputs:
  - "Component requirements or UI specifications"
  - "Performance issues or rendering problems"
  - "Hook composition questions"
  - "State architecture decisions"
outputs:
  - "React components with proper patterns"
  - "Custom hooks with correct dependency management"
  - "Performance-optimized rendering strategies"
  - "Component architecture recommendations"
linksTo:
  - state-management
  - forms
  - animation
  - typescript-frontend
  - design-systems
linkedFrom:
  - code-writer
  - code-reviewer
  - refactorer
preferredNextSkills:
  - typescript-frontend
  - state-management
  - nextjs
fallbackSkills:
  - vue
  - svelte
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# React Patterns & Performance

## Purpose

Provide expert-level guidance on React component architecture, hook patterns, rendering optimization, and idiomatic React development. This skill covers React 18+ with a focus on concurrent features, Server Components readiness, and production-grade patterns.

## Key Patterns

### Component Architecture

**Compound Components** — Use when building flexible, composable UI primitives:

```tsx
// Parent owns state, children consume via context
const Tabs = ({ children, defaultValue }: TabsProps) => {
  const [active, setActive] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div role="tablist">{children}</div>
    </TabsContext.Provider>
  );
};

Tabs.Tab = ({ value, children }: TabProps) => {
  const { active, setActive } = useTabsContext();
  return (
    <button
      role="tab"
      aria-selected={active === value}
      onClick={() => setActive(value)}
      className="px-6 py-4 text-base rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
};
```

**Render Props vs Hooks** — Prefer hooks for logic reuse. Use render props only when the consumer needs to control rendering output that depends on the shared state:

```tsx
// Prefer: Custom hook
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn(prev => !prev), []);
  const setTrue = useCallback(() => setOn(true), []);
  const setFalse = useCallback(() => setOn(false), []);
  return { on, toggle, setTrue, setFalse } as const;
}

// Avoid: Render prop for simple logic reuse
// Only use render props when children need positional/layout control
```

**Container/Presenter Split** — Separate data-fetching and side-effect logic from rendering:

```tsx
// Container: handles data and effects
function UserProfileContainer({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // React 19 use()
  return <UserProfileView user={user} />;
}

// Presenter: pure rendering, easy to test and storybook
function UserProfileView({ user }: { user: User }) {
  return (
    <div className="p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold">{user.name}</h2>
      <p className="text-base text-gray-600">{user.bio}</p>
    </div>
  );
}
```

### Hook Patterns

**Custom Hook Rules:**
1. Always prefix with `use`
2. Call hooks at the top level only (no conditionals, loops)
3. Return stable references — wrap callbacks in `useCallback`, derived objects in `useMemo`
4. Document dependency arrays explicitly

**useEffect Discipline:**

```tsx
// GOOD: Single responsibility, clear cleanup
useEffect(() => {
  const controller = new AbortController();
  fetchData(id, { signal: controller.signal })
    .then(setData)
    .catch(err => {
      if (!controller.signal.aborted) setError(err);
    });
  return () => controller.abort();
}, [id]);

// BAD: Multiple concerns in one effect
useEffect(() => {
  fetchData(id).then(setData);
  trackPageView(id);     // separate effect
  document.title = name; // separate effect
}, [id, name]);
```

**Derived State — Never sync state from props:**

```tsx
// BAD: Syncing state from props
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// GOOD: Derive during render
const fullName = `${first} ${last}`;

// GOOD: Expensive derivation
const sortedItems = useMemo(
  () => items.toSorted((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

### Rendering Optimization

**When to use `React.memo`:**
- Component receives the same props frequently but parent re-renders often
- Component is expensive to render (large lists, complex SVG, charts)
- Component is a leaf node in a frequently-updating tree

```tsx
// Wrap with memo when the component is expensive and receives stable-ish props
const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});
```

**When NOT to use `React.memo`:**
- The component is cheap to render
- Props change on every render anyway (new objects/arrays inline)
- The component already uses context that changes frequently

**Avoid Re-render Cascades:**

```tsx
// BAD: New object every render breaks memo
<Child style={{ color: 'red' }} />

// GOOD: Stable reference
const style = useMemo(() => ({ color: 'red' }), []);
<Child style={style} />

// BEST: Just use className
<Child className="text-red-500" />
```

**Key Prop Strategy:**
- Use stable, unique IDs from data (never array index for reorderable lists)
- Reset component state by changing key: `<Form key={formId} />`

### Concurrent React Features

**useTransition** — For non-urgent state updates:

```tsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Urgent: update input immediately
    setQuery(e.target.value);
    // Non-urgent: filter results can wait
    startTransition(() => {
      setFilteredResults(filterBy(e.target.value));
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={handleChange}
        className="px-4 py-3 rounded-lg border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
      />
      {isPending && <Spinner />}
      <ResultsList results={filteredResults} />
    </div>
  );
}
```

**useDeferredValue** — Defer expensive renders:

```tsx
function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.7 : 1, transition: 'opacity 200ms' }}>
      <SlowList query={deferredQuery} />
    </div>
  );
}
```

### Error Boundaries

Always wrap major sections in error boundaries:

```tsx
class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

## Best Practices

1. **Composition over configuration** — Build small, focused components and compose them rather than adding props for every variation.
2. **Lift state only as high as necessary** — Keep state as close to where it is used as possible.
3. **Prefer controlled components** — Uncontrolled components (refs) only for integration with non-React libraries or performance-critical inputs.
4. **Type events properly** — Use `React.ChangeEvent<HTMLInputElement>` not `any`.
5. **Avoid prop drilling beyond 2 levels** — Use context or composition (children/render slots) instead.
6. **Use Suspense boundaries** — Wrap async data sources and lazy components in `<Suspense>`.
7. **Clean up all effects** — Every subscription, timer, or listener must have a cleanup function.
8. **Avoid `useEffect` for derived state** — Compute during render or use `useMemo`.
9. **Do not call setState in render** — This causes infinite loops. Derive values instead.
10. **Use `key` to reset component state** — Changing key unmounts/remounts, resetting all internal state.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Stale closures in effects | Callback references old state | Add dependencies to array or use `useRef` for latest value |
| Object/array in dependency array | Effect runs every render | `useMemo` the value or compare individual fields |
| Forgetting cleanup | Memory leaks, zombie subscriptions | Return cleanup function from `useEffect` |
| Conditional hooks | Breaks hook ordering | Always call all hooks, guard logic inside |
| Setting state in render | Infinite loop | Derive the value or move to effect |
| Over-using context | Unnecessary re-renders on unrelated changes | Split contexts by update frequency or use selectors (Zustand) |
| Index as key in dynamic lists | Incorrect DOM reuse on reorder/delete | Use stable unique IDs |
| Fetching in useEffect without abort | Race conditions on fast navigation | Use `AbortController` or a data library (TanStack Query) |

## React 19+ Patterns

**`use()` hook** — Read promises and context in render:

```tsx
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends until resolved
  return <div>{user.name}</div>;
}
```

**`useActionState`** — For form actions with pending state:

```tsx
function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  return (
    <form action={formAction}>
      <input name="email" className="px-4 py-3 rounded-lg border" />
      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-4 text-base rounded-lg bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? 'Signing in...' : 'Sign In'}
      </button>
      {state?.error && <p className="text-red-600 text-sm">{state.error}</p>}
    </form>
  );
}
```

**`useOptimistic`** — Optimistic UI updates:

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (current, newTodo: Todo) => [...current, newTodo]
  );

  async function handleAdd(formData: FormData) {
    const newTodo = { id: crypto.randomUUID(), text: formData.get('text') as string };
    addOptimistic(newTodo);
    await saveTodo(newTodo);
  }

  return (
    <form action={handleAdd}>
      {optimisticTodos.map(t => <TodoItem key={t.id} todo={t} />)}
    </form>
  );
}
```
