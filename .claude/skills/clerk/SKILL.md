# Clerk

> Drop-in authentication and user management — sign-in, sign-up, orgs, RBAC, webhooks.

## When to Use
- Adding auth to Next.js (App Router or Pages), React, or Remix apps
- Need pre-built sign-in/sign-up UI with social, email, MFA support
- Managing organizations, roles, and permissions (RBAC)
- Syncing user data to your DB via webhooks

## Core Patterns

### Provider Setup (Next.js App Router)
```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html><body>{children}</body></html>
    </ClerkProvider>
  );
}
```

### Middleware (Protect Routes)
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/webhooks(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = { matcher: ["/((?!_next|.*\\.).*)"] };
```

### Client Hooks
```typescript
import { useUser, useAuth, useOrganization } from "@clerk/nextjs";

const { user, isLoaded } = useUser();           // Full user object
const { userId, getToken } = useAuth();          // Auth state + JWT access
const { organization, membership } = useOrganization(); // Active org + role
```

### Server-Side Auth
```typescript
import { auth, currentUser } from "@clerk/nextjs/server";

// Route handler or Server Component
const { userId, orgId, orgRole } = await auth();
const user = await currentUser(); // Full User object
if (!userId) redirect("/sign-in");
```

### Webhook (Sync Users to DB)
```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const event = wh.verify(payload, headers) as WebhookEvent;

  if (event.type === "user.created") await db.users.create(event.data);
  if (event.type === "user.updated") await db.users.update(event.data);
  return Response.json({ received: true });
}
```

## Key Features
- **Components**: `<SignIn />`, `<SignUp />`, `<UserButton />`, `<OrganizationSwitcher />`
- **RBAC**: `auth.protect({ role: "org:admin" })` or `auth.protect({ permission: "org:posts:create" })`
- **JWT Templates**: Dashboard > JWT Templates — add custom claims (`metadata`, `orgRole`)
- **Custom Claims**: `const token = await getToken({ template: "supabase" })` for third-party JWTs
- **Organizations**: Create orgs, invite members, assign roles — all via components or JS SDK
- **Metadata**: `user.publicMetadata` (server-set), `user.unsafeMetadata` (client-set)
- **Multi-session**: `useSessionList()` for apps supporting multiple active sessions
- **Env vars**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
