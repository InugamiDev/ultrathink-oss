---
name: better-auth
description: Better-Auth library integration for authentication with social providers, sessions, RBAC, and organization management
layer: domain
category: security
triggers:
  - "better-auth"
  - "better auth"
  - "betterauth"
inputs: [application framework, auth requirements, database adapter, social providers]
outputs: [auth configuration, client setup, middleware, protected routes, plugin configuration]
linksTo: [authentication, nextjs, drizzle, prisma]
linkedFrom: [authentication, code-review]
preferredNextSkills: [authentication, owasp, nextjs]
fallbackSkills: [authentication]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [database migrations, session creation]
---

# Better-Auth Specialist

## Purpose

Integrate Better-Auth as the authentication solution for web applications. This skill covers server and client configuration, social providers, session management, email/password auth, RBAC, organization/team support, two-factor authentication, and database adapter setup.

## Key Patterns

### Server Configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins/two-factor";
import { organization } from "better-auth/plugins/organization";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `<a href="${url}">Reset Password</a>`,
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24h
  },

  plugins: [
    twoFactor({
      issuer: "MyApp",
      otpOptions: {
        digits: 6,
        period: 30,
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
    }),
    admin(),
  ],

  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],

  advanced: {
    generateId: () => crypto.randomUUID(),
  },
});

export type Session = typeof auth.$Infer.Session;
```

### Next.js API Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Client Configuration

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [
    twoFactorClient(),
    organizationClient(),
    adminClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
```

### Protected Server Component

```typescript
// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

### Client Component Auth Hooks

```typescript
"use client";

import { useSession, signIn, signUp, signOut } from "@/lib/auth-client";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const result = await signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message);
    }
  }

  async function handleGoogleLogin() {
    await signIn.social({ provider: "google" });
  }

  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p>{error}</p>}
      <button type="submit">Sign In</button>
      <button type="button" onClick={handleGoogleLogin}>Sign in with Google</button>
    </form>
  );
}

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <a href="/login">Sign In</a>;

  return (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Middleware for Route Protection

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedPaths = ["/dashboard", "/settings", "/admin"];
const authPaths = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
```

### Database Schema Generation

```bash
# Generate schema for your database adapter
npx @better-auth/cli generate --config ./lib/auth.ts --output ./db/auth-schema.ts

# Or push schema directly to database
npx @better-auth/cli migrate --config ./lib/auth.ts
```

## Best Practices

### Configuration
- Always set `trustedOrigins` to prevent open redirect attacks
- Enable `requireEmailVerification` for email/password auth
- Use `cookieCache` to reduce database lookups for sessions
- Configure `session.expiresIn` based on your security requirements
- Set `updateAge` to refresh sessions periodically

### Social Providers
- Store client IDs and secrets in environment variables
- Handle account linking when user signs in with multiple providers
- Request minimal scopes needed

### Two-Factor Authentication
- Offer TOTP as the default 2FA method
- Provide backup codes during 2FA setup
- Allow trusted devices to skip 2FA for a period

### Organizations/Teams
- Use the organization plugin for multi-tenant applications
- Define roles at the organization level, not just globally
- Set `allowUserToCreateOrganization` based on your business model

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Missing `trustedOrigins` | Set it to your app URL to prevent CSRF |
| Not running migrations | Run `npx @better-auth/cli migrate` after config changes |
| Client/server plugin mismatch | Add matching client plugins for each server plugin |
| Session not found in Server Components | Pass `headers: await headers()` to `getSession` |
| Middleware blocking auth API | Exclude `/api/auth` from middleware matcher |
| Missing email verification | Enable `requireEmailVerification` in production |

## Examples

### Admin Role Check

```typescript
// Server-side admin check
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function isAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.role === "admin";
}
```

### Email Verification Setup

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      html: `<a href="${url}">Verify Email</a>`,
    });
  },
},
```

### Rate Limiting Auth Endpoints

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  rateLimit: {
    window: 60, // 60 seconds
    max: 10,    // 10 requests per window
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/forgot-password": { window: 300, max: 3 },
    },
  },
  // ... rest of config
});
```
