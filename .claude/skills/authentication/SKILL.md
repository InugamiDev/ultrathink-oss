---
name: authentication
description: Authentication patterns including JWT, sessions, OAuth 2.0, OIDC, passkeys, RBAC, and multi-factor authentication
layer: domain
category: security
triggers:
  - "authentication"
  - "auth"
  - "jwt"
  - "session"
  - "oauth"
  - "oidc"
  - "passkey"
  - "rbac"
  - "login"
  - "signup"
  - "mfa"
  - "two factor"
inputs: [auth requirements, user model, provider preferences, security constraints]
outputs: [auth flows, middleware, token strategies, RBAC policies, session configs]
linksTo: [better-auth, encryption, owasp, nextjs]
linkedFrom: [api-designer, code-review, security-scanner]
preferredNextSkills: [better-auth, owasp, encryption]
fallbackSkills: [nextjs, api-designer]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Authentication Specialist

## Purpose

Design and implement secure authentication systems including token-based auth (JWT), server-side sessions, OAuth 2.0/OIDC flows, passkeys (WebAuthn), role-based access control (RBAC), and multi-factor authentication (MFA).

## Key Patterns

### Authentication Strategy Comparison

| Strategy | Best For | Pros | Cons |
|----------|----------|------|------|
| **Sessions** | Traditional web apps | Simple, revocable, secure | Requires session store |
| **JWT** | APIs, microservices | Stateless, scalable | Hard to revoke, size |
| **OAuth 2.0** | Third-party login | Delegated auth, standard | Complex flows |
| **Passkeys** | Passwordless | Phishing-resistant, UX | Browser support varies |

### JWT Token Flow (Access + Refresh)

```typescript
import { SignJWT, jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

// Access token: short-lived, contains claims
async function createAccessToken(user: { id: string; role: string }) {
  return new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("my-app")
    .sign(ACCESS_SECRET);
}

// Refresh token: long-lived, stored securely
async function createRefreshToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setJti(crypto.randomUUID()) // Unique ID for revocation
    .setIssuer("my-app")
    .sign(REFRESH_SECRET);
}

// Verify token
async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, { issuer: "my-app" });
    return payload;
  } catch {
    return null;
  }
}

// Token refresh endpoint
async function refreshTokens(refreshToken: string) {
  const payload = await jwtVerify(refreshToken, REFRESH_SECRET, { issuer: "my-app" });

  // Check if refresh token is revoked (store JTI in DB/Redis)
  const isRevoked = await checkRevoked(payload.payload.jti as string);
  if (isRevoked) throw new Error("Token revoked");

  // Rotate: revoke old, issue new pair
  await revokeToken(payload.payload.jti as string);

  const user = await getUser(payload.payload.sub as string);
  return {
    accessToken: await createAccessToken(user),
    refreshToken: await createRefreshToken(user.id),
  };
}
```

### Session-Based Auth (with Cookies)

```typescript
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SESSION_SECRET);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
```

### OAuth 2.0 Authorization Code Flow

```typescript
// Step 1: Redirect to provider
function getAuthorizationUrl(provider: "google" | "github") {
  const configs = {
    google: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      clientId: process.env.GOOGLE_CLIENT_ID,
      scopes: "openid email profile",
    },
    github: {
      authUrl: "https://github.com/login/oauth/authorize",
      clientId: process.env.GITHUB_CLIENT_ID,
      scopes: "read:user user:email",
    },
  };

  const config = configs[provider];
  const state = crypto.randomUUID(); // Store in session for CSRF protection
  const params = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: `${process.env.APP_URL}/api/auth/callback/${provider}`,
    response_type: "code",
    scope: config.scopes,
    state,
  });

  return `${config.authUrl}?${params}`;
}

// Step 2: Handle callback
async function handleCallback(provider: string, code: string, state: string) {
  // Verify state matches session
  const tokenUrl = provider === "google"
    ? "https://oauth2.googleapis.com/token"
    : "https://github.com/login/oauth/access_token";

  // Exchange code for tokens
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
      code,
      redirect_uri: `${process.env.APP_URL}/api/auth/callback/${provider}`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();
  // Fetch user profile, create/update user, create session
  return tokens;
}
```

### RBAC (Role-Based Access Control)

```typescript
type Role = "admin" | "editor" | "viewer";
type Permission = "read" | "write" | "delete" | "manage_users";

const rolePermissions: Record<Role, Permission[]> = {
  admin: ["read", "write", "delete", "manage_users"],
  editor: ["read", "write"],
  viewer: ["read"],
};

function hasPermission(userRole: Role, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) ?? false;
}

// Middleware
function requirePermission(permission: Permission) {
  return async (req: Request) => {
    const session = await getSession();
    if (!session) return new Response("Unauthorized", { status: 401 });

    const user = await getUser(session.userId);
    if (!hasPermission(user.role as Role, permission)) {
      return new Response("Forbidden", { status: 403 });
    }
  };
}
```

## Best Practices

### Password Handling
- Hash with Argon2id (preferred) or bcrypt (min cost 12)
- Never store plaintext passwords
- Enforce minimum 8 characters, check against breached password lists
- Use constant-time comparison for hash verification

### Token Security
- Access tokens: 15 minutes max, stored in memory only
- Refresh tokens: 7-30 days, httpOnly cookie or secure storage
- Rotate refresh tokens on every use (detect reuse = compromise)
- Include `iss`, `exp`, `sub`, `jti` claims in JWTs

### Cookie Security
- `httpOnly`: prevent JavaScript access
- `secure`: HTTPS only
- `sameSite: lax`: CSRF protection for most cases
- `path: /`: or scope to specific routes

### OAuth 2.0
- Always use the Authorization Code flow (not Implicit)
- Validate `state` parameter to prevent CSRF
- Use PKCE for public clients (SPAs, mobile)
- Store provider tokens encrypted, not in plain text

### MFA
- Support TOTP (Google Authenticator) as baseline
- Offer WebAuthn/passkeys as phishing-resistant option
- Provide recovery codes (10 single-use codes)
- Rate limit MFA verification attempts

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Storing JWT in localStorage | Use httpOnly cookies for refresh tokens |
| No token rotation | Rotate refresh tokens on each use |
| Missing CSRF protection | Use `sameSite` cookies + state parameter |
| Password in URL parameters | Always send credentials in POST body |
| No rate limiting on login | Rate limit by IP and username |
| Hardcoded secrets | Use environment variables, rotate regularly |
| Missing logout flow | Clear session, revoke tokens, clear cookies |

## Examples

### Password Hashing with Argon2

```typescript
import { hash, verify } from "@node-rs/argon2";

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password);
}
```

### Next.js Auth Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedPaths = ["/dashboard", "/settings", "/api/user"];
const authPaths = ["/login", "/signup"];
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session")?.value;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  let isValid = false;
  if (session) {
    try {
      await jwtVerify(session, SECRET);
      isValid = true;
    } catch {}
  }

  if (isProtected && !isValid) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${pathname}`, request.url));
  }

  if (isAuthPage && isValid) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
```
