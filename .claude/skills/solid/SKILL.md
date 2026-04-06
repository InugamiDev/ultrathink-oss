# Skill: solid
> Layer: domain | Category: frontend

## Triggers
- SolidJS, Solid Start, createSignal, createStore, createEffect, createMemo, fine-grained reactivity

## Links
- linksTo: web-components, reactive-patterns
- linkedFrom: reactive-patterns

## Overview

SolidJS is a declarative UI library with fine-grained reactivity. Unlike React, there is no
virtual DOM — components run once, and only the exact DOM nodes tied to reactive values update.
JSX compiles to real DOM operations, making Solid one of the fastest UI frameworks.

## createSignal — Reactive Primitives

Signals are the core reactive atom. Reading a signal inside a tracking scope (JSX, effects,
memos) creates a subscription.

```tsx
import { createSignal } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button
      class="px-6 py-4 text-base rounded-lg bg-blue-600 text-white
             transition-all duration-200 hover:bg-blue-700"
      onClick={() => setCount((c) => c + 1)}
    >
      Count: {count()}
    </button>
  );
}
```

**Key difference from React**: `count` is a function call `count()`, not a value. This is how
Solid tracks reads. Components do not re-run — only the `{count()}` text node updates.

## createStore — Nested Reactive State

For objects and arrays, `createStore` provides deep reactivity with path-based setters.

```tsx
import { createStore } from "solid-js/store";

function TodoApp() {
  const [state, setState] = createStore({
    todos: [{ id: 1, text: "Learn Solid", done: false }],
  });

  const toggle = (id: number) => {
    setState("todos", (t) => t.id === id, "done", (d) => !d);
  };

  return (
    <ul class="p-6 space-y-3">
      <For each={state.todos}>
        {(todo) => (
          <li
            class="p-4 rounded-lg border cursor-pointer transition-all duration-200"
            classList={{ "line-through opacity-50": todo.done }}
            onClick={() => toggle(todo.id)}
          >
            {todo.text}
          </li>
        )}
      </For>
    </ul>
  );
}
```

## createEffect — Side Effects

Effects run after render and re-run when their tracked signals change.

```tsx
import { createSignal, createEffect } from "solid-js";

function Logger() {
  const [query, setQuery] = createSignal("");

  createEffect(() => {
    console.log("Search query:", query());
  });

  return (
    <input
      class="px-4 py-3 rounded-lg border text-base
             focus-visible:ring-2 focus-visible:ring-offset-2"
      value={query()}
      onInput={(e) => setQuery(e.currentTarget.value)}
      placeholder="Search..."
    />
  );
}
```

## createMemo — Derived Computations

Memos cache derived values and only recompute when dependencies change.

```tsx
import { createSignal, createMemo } from "solid-js";

function FilteredList() {
  const [items] = createSignal(["apple", "banana", "avocado", "blueberry"]);
  const [search, setSearch] = createSignal("");

  const filtered = createMemo(() =>
    items().filter((i) => i.includes(search().toLowerCase()))
  );

  return (
    <div class="p-6">
      <input
        class="px-4 py-3 rounded-lg border text-base w-full"
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />
      <p class="mt-4 text-base">{filtered().length} results</p>
    </div>
  );
}
```

## Control Flow Components

Solid uses components for control flow to maintain fine-grained tracking.

```tsx
import { Show, For, Switch, Match } from "solid-js";

// Conditional rendering
<Show when={user()} fallback={<p>Loading...</p>}>
  {(u) => <p>Hello, {u().name}</p>}
</Show>

// List rendering — items are not recreated on array change
<For each={items()}>
  {(item, index) => <li>{index()}: {item.name}</li>}
</For>

// Pattern matching
<Switch>
  <Match when={status() === "loading"}>Loading...</Match>
  <Match when={status() === "error"}>Error occurred</Match>
  <Match when={status() === "ready"}>Content here</Match>
</Switch>
```

## SolidStart — Meta-Framework

SolidStart is the official meta-framework (like Next.js for React).

```tsx
// routes/index.tsx — file-based routing
import { createAsync, query } from "@solidjs/router";

const getProjects = query(async () => {
  "use server";
  return db.select().from(projects);
}, "projects");

export default function Home() {
  const projects = createAsync(() => getProjects());

  return (
    <main class="py-16 max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold">Projects</h1>
      <For each={projects()}>
        {(p) => <div class="p-6 rounded-xl shadow-sm border mt-4">{p.name}</div>}
      </For>
    </main>
  );
}
```

## Key Rules

1. Components run **once** — never place side-effect logic at the component body level expecting re-runs.
2. Always call signals as functions: `count()`, not `count`. Destructuring kills reactivity.
3. Use `<For>` instead of `.map()` — it tracks items by reference and avoids recreating DOM nodes.
4. `createStore` uses proxy-based tracking; do not spread or destructure store values outside JSX.
5. `onCleanup()` inside effects handles disposal — equivalent to React's effect cleanup return.
6. SolidStart `"use server"` marks server-only code; `query()` caches and deduplicates fetches.
