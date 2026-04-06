# Jotai

- **Layer**: domain
- **Category**: state-management
- **Risk Level**: low
- **Triggers**: jotai, atom, useAtom, atomFamily, atomic state

## Overview

Jotai is a primitive and flexible state management library for React that takes an atomic approach.
State is built from the bottom up using individual atoms — minimal units of state that compose together.
No boilerplate, no string keys, full TypeScript inference, and React Suspense support out of the box.

## When to Use

- You need fine-grained reactivity without re-rendering entire subtrees
- State is naturally composed from small independent pieces
- You want derived/computed state that auto-updates
- You need async state that integrates with React Suspense
- You want a lightweight alternative to Redux or Zustand with less boilerplate
- You need parameterized state (atom families)

## Key Patterns

### Atom Creation

- `atom(initialValue)` — primitive atom (read-write)
- `atomWithStorage(key, initialValue)` — persisted to localStorage/sessionStorage (`jotai/utils`)
- `atomWithDefault(getDefault)` — resettable atom with a dynamic default

### Derived Atoms

- **Read-only**: `atom((get) => get(baseAtom) * 2)` — computed from other atoms
- **Write-only**: `atom(null, (get, set, update) => { set(baseAtom, update) })` — actions/setters
- **Read-write**: `atom((get) => get(a) + get(b), (get, set, val) => { set(a, val) })` — both

### Async Atoms

- Async read: `atom(async (get) => await fetch(...))` — suspends until resolved
- `loadable(asyncAtom)` — wraps async atom to avoid Suspense (`{ state, data, error }`)
- `atomWithQuery` (via `jotai-tanstack-query`) — integrates with TanStack Query

### Atom Families

- `atomFamily((param) => atom(param))` — creates parameterized atoms keyed by argument
- Use for lists, entity maps, or any state indexed by ID
- Call `atomFamily.remove(param)` to clean up unused atoms

### Provider Scoping

- **Provider-less mode**: atoms use a default store — simplest setup, works globally
- **`<Provider>`**: creates an isolated atom scope — useful for tests or subtree isolation
- `createStore()` + `<Provider store={store}>` for explicit store control

### DevTools & Debugging

- `jotai-devtools`: provides `<DevTools />` component and Redux DevTools integration
- `useAtomsDebugValue()` for inspecting all atom values in React DevTools
- Label atoms with `myAtom.debugLabel = 'myAtom'` for readable debug output

### Suspense Integration

- Async atoms suspend by default — wrap consumers in `<Suspense>`
- Use `loadable()` wrapper to opt out of Suspense per atom
- Pair with `<ErrorBoundary>` for async error handling

## Anti-Patterns

- **Giant atoms**: storing large objects in a single atom defeats fine-grained reactivity — split them
- **Atom creation in render**: never call `atom()` inside a component — define atoms at module scope
- **Ignoring cleanup in families**: `atomFamily` caches forever unless you call `.remove()`
- **Overusing providers**: provider-less mode is fine for most apps — add `<Provider>` only when scoping is needed
- **Skipping `loadable`**: if a component cannot show a fallback, wrap the async atom in `loadable()`

## Related Skills

- `react` — core rendering library
- `state-management` — general state patterns and selection guide
- `typescript-frontend` — type-safe frontend patterns
- `zustand` — alternative state management (store-based vs atomic)
