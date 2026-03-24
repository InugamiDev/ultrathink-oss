# tRPC

> End-to-end typesafe APIs — no code generation, no schemas, just TypeScript inference from backend to frontend.

## When to Use
- Full-stack TypeScript apps needing type-safe client-server communication
- Next.js / React apps where API types should auto-propagate to the client
- Replacing REST boilerplate with procedure-based RPC

## Core Patterns
### Router Definition
```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.context<Context>().create();

const appRouter = t.router({
  user: t.router({
    byId: t.procedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        const user = await ctx.db.user.findUnique({ where: { id: input.id } });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        return user;
      }),
    create: t.procedure
      .input(z.object({ name: z.string().min(1), email: z.string().email() }))
      .mutation(async ({ input, ctx }) => ctx.db.user.create({ data: input })),
  }),
});

export type AppRouter = typeof appRouter;
```

### Middleware & Context
```typescript
const createContext = async ({ req }: { req: Request }) => ({
  db: prisma,
  user: await getUserFromHeader(req),
});

const authed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } }); // Narrowed type
});
const protectedProcedure = t.procedure.use(authed);
```

### React Query Integration
```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "~/server/router";

export const trpc = createTRPCReact<AppRouter>();

const { data } = trpc.user.byId.useQuery({ id: "abc" }); // Fully typed
const mutation = trpc.user.create.useMutation({
  onSuccess: () => utils.user.byId.invalidate(),
});
```

### Server-Side Caller
```typescript
const caller = appRouter.createCaller(await createContext({ req }));
const user = await caller.user.byId({ id: "abc" }); // Direct call, no HTTP
```

### Key Features
- **Adapters**: `@trpc/server/adapters/next`, `/express`, `/standalone`, `/fetch`
- **Subscriptions**: `t.procedure.subscription()` with WebSocket adapter
- **Error handling**: `TRPCError` codes: `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`
- **Batching**: Requests batched automatically — multiple queries in one HTTP call
- **Links**: `httpBatchLink`, `wsLink`, `splitLink` for transport customization
- **Testing**: `createCaller` for unit tests — no HTTP server needed
