# Convex

> Reactive backend platform — realtime by default, zero-config, end-to-end TypeScript.

## When to Use
- Apps needing realtime data (dashboards, chat, collaboration)
- Full-stack TypeScript with automatic type safety client-to-DB
- Replacing REST APIs + database + caching with a single platform
- Serverless backends with scheduled jobs, file storage, and auth built in

## Core Patterns

### Schema Definition
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.id("users"),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["completed"]),
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
});
```

### Query, Mutation, Action
```typescript
// convex/tasks.ts
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.query("tasks").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
  },
});

export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    return ctx.db.insert("tasks", { text: args.text, completed: false, userId: identity!.subject as any });
  },
});

export const summarize = action({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.list, { userId: args.taskId }); // actions call queries/mutations
    const result = await fetch("https://api.openai.com/...", { /* ... */ });
    await ctx.runMutation(api.tasks.update, { id: args.taskId, summary: await result.json() });
  },
});
```

### React Hooks (Automatic Reactivity)
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function TaskList({ userId }: { userId: Id<"users"> }) {
  const tasks = useQuery(api.tasks.list, { userId }); // Auto-updates on DB changes
  const create = useMutation(api.tasks.create);
  return tasks?.map((t) => <div key={t._id}>{t.text}</div>);
}
```

### Key Features
- **Reactivity**: `useQuery` auto-subscribes — UI updates when data changes, no polling
- **Pagination**: `ctx.db.query("tasks").paginate(opts)` with `usePaginatedQuery` on client
- **File Storage**: `ctx.storage.store(file)` / `ctx.storage.getUrl(storageId)`
- **Crons**: `crons.interval("cleanup", { hours: 1 }, api.tasks.cleanup)` in `convex/crons.ts`
- **Scheduled**: `ctx.scheduler.runAfter(60_000, api.emails.send, { to })` for delayed execution
- **Auth**: `ctx.auth.getUserIdentity()` — integrates with Clerk, Auth0, custom JWT
- **Validators**: `v.string()`, `v.number()`, `v.boolean()`, `v.id("table")`, `v.object({})`, `v.union()`, `v.optional()`, `v.array()`
- **Indexes**: Define in schema, query with `.withIndex("name", (q) => q.eq("field", value).lt(...))`
- **Testing**: `convex dev --once` for type generation; use `ConvexTestingHelper` for unit tests
