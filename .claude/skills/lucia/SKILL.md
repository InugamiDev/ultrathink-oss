# Lucia

> Lightweight session-based auth library — adapter pattern, no JWT, full control over your auth flow.

## When to Use
- Building auth from scratch with full control (not drop-in UI)
- Need session-based auth with database-backed sessions
- Using Drizzle, Prisma, or other ORMs (adapter pattern)
- Integrating OAuth via Arctic library
- Want type-safe sessions with custom user attributes

## Core Patterns

### Setup with Drizzle Adapter
```typescript
// lib/auth.ts
import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db, sessionTable, userTable } from "./db";

const adapter = new DrizzlePostgreSQLAdapter(db, sessionTable, userTable);

export const lucia = new Lucia(adapter, {
  sessionCookie: { attributes: { secure: process.env.NODE_ENV === "production" } },
  getUserAttributes: (attrs) => ({ email: attrs.email, name: attrs.name }),
});

declare module "lucia" {
  interface Register { Lucia: typeof lucia; DatabaseUserAttributes: { email: string; name: string } }
}
```

### Session Management
```typescript
import { lucia } from "@/lib/auth";
import { generateIdFromEntropySize } from "lucia";

// Create session after login
const session = await lucia.createSession(userId, {});
const cookie = lucia.createSessionCookie(session.id);
cookies().set(cookie.name, cookie.value, cookie.attributes);

// Validate session (middleware / server component)
const cookieValue = cookies().get(lucia.sessionCookieName)?.value ?? "";
const { session, user } = await lucia.validateSession(cookieValue);
if (session?.fresh) {
  const fresh = lucia.createSessionCookie(session.id);
  cookies().set(fresh.name, fresh.value, fresh.attributes);
}

// Logout
await lucia.invalidateSession(sessionId);
const blank = lucia.createBlankSessionCookie();
cookies().set(blank.name, blank.value, blank.attributes);
```

### Password Auth (Argon2)
```typescript
import { hash, verify } from "@node-rs/argon2";

// Sign up
const hashedPassword = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
const userId = generateIdFromEntropySize(10);
await db.insert(userTable).values({ id: userId, email, hashedPassword });

// Sign in
const valid = await verify(user.hashedPassword, password);
if (!valid) throw new Error("Invalid credentials");
```

### OAuth with Arctic
```typescript
import { GitHub } from "arctic";

export const github = new GitHub(clientId, clientSecret, redirectURI);

// Redirect to provider
const state = generateState();
const url = github.createAuthorizationURL(state, ["user:email"]);
cookies().set("oauth_state", state, { httpOnly: true, maxAge: 600 });

// Callback — exchange code for tokens, then create session
const tokens = await github.validateAuthorizationCode(code);
const githubUser = await fetch("https://api.github.com/user", {
  headers: { Authorization: `Bearer ${tokens.accessToken()}` },
}).then((r) => r.json());
```

## Key Features
- **Adapters**: Drizzle, Prisma, Mongoose, better-sqlite3, unstorage — swap DB without changing auth logic
- **Framework helpers**: `astro`, `next`, `sveltekit` middleware examples in docs — no lock-in
- **Type-safe sessions**: Extend `DatabaseUserAttributes` for fully typed `user` on every request
- **Cookie control**: `sessionCookie.attributes` — set `secure`, `sameSite`, `domain`, `maxAge`
- **Session table**: Requires `id` (text PK), `user_id` (FK), `expires_at` (timestamp) columns
- **No JWT**: Sessions live in your DB — revoke instantly, no token expiry lag
- **Arctic OAuth**: 50+ providers (GitHub, Google, Discord, Apple, etc.) via `arctic` package
