---
name: next-auth
description: NextAuth.js / Auth.js authentication library for Next.js — providers, sessions, JWT, database adapters, middleware protection
layer: domain
category: authentication
triggers:
  - "next-auth"
  - "nextauth"
  - "authjs"
  - "auth.js"
  - "getServerSession"
  - "useSession"
inputs:
  - "Authentication provider requirements"
  - "Session management strategy"
  - "Route protection rules"
outputs:
  - "NextAuth configuration and route handlers"
  - "Provider setup (OAuth, credentials, magic link)"
  - "Session access patterns (server/client)"
  - "Middleware-based route protection"
linksTo:
  - nextjs
  - authentication
  - react
  - prisma
linkedFrom: []
preferredNextSkills:
  - nextjs
  - prisma
  - authentication
fallbackSkills:
  - better-auth
  - authentication
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# NextAuth.js / Auth.js Patterns

## Purpose

Provide expert guidance on NextAuth.js (Auth.js v5) for Next.js authentication, including OAuth providers, credentials auth, JWT/session strategies, database adapters, middleware protection, role-based access, and production security patterns.

## Core Patterns

### 1. Auth.js v5 Setup (Next.js App Router)

```bash
npm install next-auth@beta @auth/prisma-adapter
```

```typescript
// auth.ts (project root)
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import type { DefaultSession } from 'next-auth';

// Extend session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'MEMBER' | 'VIEWER';
    } & DefaultSession['user'];
  }

  interface User {
    role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' }, // Use JWT for edge compatibility
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: { id: true, email: true, name: true, image: true, password: true, role: true },
        });

        if (!user?.password) return null;

        const isValid = await compare(credentials.password as string, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: persist user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle session updates (e.g., after profile change)
      if (trigger === 'update' && session) {
        token.name = session.user.name;
        token.image = session.user.image;
      }

      return token;
    },
    async session({ session, token }) {
      // Expose custom fields to the client session
      session.user.id = token.id as string;
      session.user.role = token.role as 'ADMIN' | 'MEMBER' | 'VIEWER';
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');

      if (isOnAdmin) {
        return auth?.user?.role === 'ADMIN';
      }

      if (isOnDashboard) {
        return isLoggedIn;
      }

      return true; // Allow public routes
    },
  },
  events: {
    async createUser({ user }) {
      // Post-registration logic (e.g., send welcome email)
      console.log(`New user registered: ${user.email}`);
    },
  },
});
```

### 2. Route Handler & Middleware

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

```typescript
// middleware.ts
export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    // Match all routes except static files and API auth routes
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 3. Server-Side Session Access

```typescript
// In Server Components
import { auth } from '@/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">
        Welcome, {session.user.name}
      </h1>
      <p className="text-text-secondary">Role: {session.user.role}</p>
    </div>
  );
}
```

```typescript
// In Server Actions
'use server';

import { auth } from '@/auth';

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const name = formData.get('name') as string;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath('/settings');
}
```

```typescript
// In API Routes
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await prisma.post.findMany({
    where: { authorId: session.user.id },
  });

  return NextResponse.json(data);
}
```

### 4. Client-Side Session Access

```tsx
// app/layout.tsx — wrap with SessionProvider
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

```tsx
// Client component usage
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="px-6 py-4 text-base rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-secondary">{session.user.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="px-4 py-2 text-sm rounded-lg border border-border text-text-primary hover:bg-gray-50 transition-all duration-200"
      >
        Sign out
      </button>
    </div>
  );
}
```

### 5. Role-Based Access Control Helper

```typescript
// lib/auth-utils.ts
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    redirect('/unauthorized');
  }
  return session;
}

// Usage in Server Components / Actions
export default async function AdminPage() {
  const session = await requireRole('ADMIN');
  // ... admin-only content
}
```

### 6. Sign-In Page

```tsx
// app/login/page.tsx
import { signIn } from '@/auth';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white shadow-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-text-secondary mt-2">Sign in to your account</p>
        </div>

        {searchParams.error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
            {searchParams.error === 'CredentialsSignin'
              ? 'Invalid email or password.'
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        {/* OAuth Providers */}
        <div className="space-y-3">
          <form
            action={async () => {
              'use server';
              await signIn('github', { redirectTo: searchParams.callbackUrl ?? '/dashboard' });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base rounded-lg border border-border hover:bg-gray-50 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Continue with GitHub
            </button>
          </form>

          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: searchParams.callbackUrl ?? '/dashboard' });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base rounded-lg border border-border hover:bg-gray-50 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Continue with Google
            </button>
          </form>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-text-secondary">Or continue with email</span>
          </div>
        </div>

        {/* Credentials Form */}
        <form
          action={async (formData) => {
            'use server';
            await signIn('credentials', {
              email: formData.get('email'),
              password: formData.get('password'),
              redirectTo: searchParams.callbackUrl ?? '/dashboard',
            });
          }}
          className="space-y-4"
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full px-4 py-3 rounded-lg border border-border text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 focus-visible:outline-none transition-all duration-200"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full px-4 py-3 rounded-lg border border-border text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 focus-visible:outline-none transition-all duration-200"
          />
          <button
            type="submit"
            className="w-full px-6 py-4 text-base rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Best Practices

1. **Use JWT strategy** for edge runtime compatibility (middleware runs on edge).
2. **Never expose sensitive fields** in the session -- only add `id`, `role`, and display fields via callbacks.
3. **Always use `auth()` server-side** instead of `getServerSession` (v5 pattern).
4. **Set custom pages** for `signIn` and `error` -- the default pages are not production-ready.
5. **Hash passwords with bcrypt** (cost factor 12+) before storing; never store plaintext.
6. **Use CSRF protection** -- NextAuth handles this automatically; do not disable it.
7. **Set `AUTH_SECRET`** in production -- a 32+ character random string. Generate with `openssl rand -base64 32`.
8. **Use Prisma adapter** for persistent sessions and account linking across providers.
9. **Configure `authorized` callback** in `auth.ts` for declarative route protection rather than per-page checks.
10. **Always validate server-side** -- never trust `useSession()` alone for authorization; re-check in Server Actions and API routes.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Client-only auth checks | Session can be spoofed in browser | Always verify with `auth()` on the server |
| Storing passwords in JWT | Token size bloat + security risk | Only store `id` and `role` in JWT |
| Using `getSession()` in Server Components | Deprecated in v5, causes hydration issues | Use `auth()` from `@/auth` |
| No `callbackUrl` on sign-in | Users land on homepage instead of their target page | Pass `callbackUrl` from `searchParams` |
| Skipping email verification | Fake accounts, OAuth account linking issues | Enable email verification flow |
| Hardcoded secrets in code | Credential leaks | Use environment variables exclusively |
| Not setting `AUTH_TRUST_HOST` | Redirect URI mismatch behind proxies | Set `AUTH_TRUST_HOST=true` when behind a reverse proxy |
| Using Credentials provider without rate limiting | Brute force attacks | Add rate limiting middleware (e.g., `upstash/ratelimit`) |

## Decision Guide

| Scenario | Approach |
|----------|----------|
| SaaS with social login | OAuth providers (GitHub, Google) + Prisma adapter |
| Email/password auth | Credentials provider + bcrypt + email verification |
| Magic link (passwordless) | Email provider with Resend/Nodemailer |
| API-only auth | JWT strategy + Bearer token validation in API routes |
| Role-based pages | `authorized` callback in middleware + `requireRole()` helper |
| Multi-tenant | Add `organizationId` to session via JWT callback |
| Session refresh | JWT strategy with `maxAge` + `updateAge` in session config |
| Account linking | Prisma adapter handles linking OAuth accounts to same email |
