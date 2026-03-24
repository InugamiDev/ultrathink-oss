---
name: owasp
description: OWASP Top 10 prevention, security headers, CSP, input validation, XSS/CSRF/SQLi protection
layer: domain
category: security
triggers:
  - "owasp"
  - "security headers"
  - "csp"
  - "content security policy"
  - "xss"
  - "csrf"
  - "sql injection"
  - "web security"
  - "vulnerability"
  - "security audit"
inputs: [application code, deployment config, security requirements]
outputs: [security headers, CSP policies, validation middleware, security audit checklists]
linksTo: [authentication, encryption, nginx, nextjs]
linkedFrom: [code-review, security-scanner, audit]
preferredNextSkills: [encryption, authentication, nginx]
fallbackSkills: [code-review, security-scanner]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# OWASP Security Specialist

## Purpose

Prevent the OWASP Top 10 vulnerabilities in web applications. This skill covers security headers, Content Security Policy (CSP), input validation, output encoding, CSRF protection, SQL injection prevention, XSS mitigation, and security hardening checklists.

## Key Patterns

### OWASP Top 10 (2021) Quick Reference

| # | Risk | Primary Defense |
|---|------|-----------------|
| A01 | Broken Access Control | RBAC, server-side checks, deny by default |
| A02 | Cryptographic Failures | TLS, AES-GCM, Argon2id, no plaintext secrets |
| A03 | Injection (SQL, XSS, etc.) | Parameterized queries, output encoding, CSP |
| A04 | Insecure Design | Threat modeling, secure design patterns |
| A05 | Security Misconfiguration | Security headers, minimal permissions, hardened defaults |
| A06 | Vulnerable Components | Dependency scanning, auto-updates |
| A07 | Auth Failures | MFA, rate limiting, secure session management |
| A08 | Data Integrity Failures | Signed updates, SRI, CI/CD pipeline security |
| A09 | Logging Failures | Structured logging, alerting on auth failures |
| A10 | SSRF | Allowlist URLs, block internal IPs, validate redirects |

### Security Headers (Next.js)

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-XSS-Protection",
    value: "0", // Disabled in favor of CSP
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

### Content Security Policy (CSP)

```typescript
// Strict CSP with nonces for inline scripts
function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
}

export function getCSPHeader(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`, // Needed for many CSS-in-JS solutions
    `img-src 'self' data: https:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://api.example.com`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join("; ");
}

// In middleware.ts
export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = getCSPHeader(nonce);

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  return response;
}
```

### Input Validation with Zod

```typescript
import { z } from "zod";

// Strict input schemas
const CreateUserSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  name: z.string().min(1).max(100).trim(),
  password: z.string().min(8).max(128),
  age: z.number().int().min(13).max(150).optional(),
});

const SearchQuerySchema = z.object({
  q: z.string().max(200).trim(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["newest", "oldest", "popular"]).default("newest"),
});

// Usage in API route
export async function POST(request: Request) {
  const body = await request.json();
  const result = CreateUserSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const validated = result.data;
  // Safe to use validated data
}
```

### SQL Injection Prevention

```typescript
// ALWAYS use parameterized queries

// Drizzle ORM (safe by default)
const user = await db.select().from(users).where(eq(users.id, userId));

// Raw SQL with parameters (Drizzle)
const results = await db.execute(
  sql`SELECT * FROM users WHERE email = ${email} AND status = ${status}`
);

// NEVER do this:
// const results = await db.execute(`SELECT * FROM users WHERE email = '${email}'`);

// D1 (Cloudflare) - use bind parameters
const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
```

### CSRF Protection

```typescript
// For traditional form submissions (not needed for JSON APIs with SameSite cookies)
import { randomBytes, timingSafeEqual } from "node:crypto";

// Generate CSRF token
function generateCSRFToken(): string {
  return randomBytes(32).toString("hex");
}

// Validate CSRF token
function validateCSRFToken(sessionToken: string, requestToken: string): boolean {
  if (!sessionToken || !requestToken) return false;
  return timingSafeEqual(
    Buffer.from(sessionToken),
    Buffer.from(requestToken)
  );
}

// For APIs: Use SameSite=Lax cookies + Origin header validation
function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const allowedOrigins = [process.env.APP_URL];
  return origin !== null && allowedOrigins.includes(origin);
}
```

### XSS Prevention

```typescript
// 1. React auto-escapes JSX (safe by default)
// <p>{userInput}</p>  -- safe, React escapes this

// 2. If you must render user-provided HTML, ALWAYS sanitize with DOMPurify first
// This is the ONLY safe way to render untrusted HTML in React
import DOMPurify from "isomorphic-dompurify";

function SafeHTML({ html }: { html: string }) {
  // DOMPurify sanitizes the HTML, removing all dangerous elements/attributes
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  // Only render after sanitization
  return <div>{clean}</div>;
}

// 3. URL validation (prevent javascript: protocol)
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// 4. Prefer text-based rendering over HTML rendering
// Instead of rendering HTML, use a markdown renderer with sanitization
```

### SSRF Prevention

```typescript
import { isIP } from "node:net";

const BLOCKED_RANGES = [
  /^127\./,           // Loopback
  /^10\./,            // Private Class A
  /^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
  /^192\.168\./,      // Private Class C
  /^169\.254\./,      // Link-local
  /^0\./,             // Current network
];

function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // Block internal hostnames
    if (hostname === "localhost" || hostname === "metadata.google.internal") {
      return true;
    }

    // Block internal IPs
    if (isIP(hostname)) {
      return BLOCKED_RANGES.some((range) => range.test(hostname));
    }

    return false;
  } catch {
    return true; // Block invalid URLs
  }
}

async function safeFetch(url: string): Promise<Response> {
  if (isInternalUrl(url)) {
    throw new Error("Request to internal resource blocked");
  }
  return fetch(url, { redirect: "error" }); // Don't follow redirects to internal URLs
}
```

## Best Practices

### Headers
- Set `Strict-Transport-Security` with a long max-age and preload
- Use `X-Content-Type-Options: nosniff` to prevent MIME sniffing
- Set `X-Frame-Options: SAMEORIGIN` or use `frame-ancestors` in CSP
- Use `Referrer-Policy: strict-origin-when-cross-origin`
- Disable unused browser features with `Permissions-Policy`

### Input Handling
- Validate ALL input on the server side (never trust client validation alone)
- Use allowlists over denylists for input validation
- Limit input lengths to prevent DoS
- Sanitize HTML input with DOMPurify if rich text is required
- Validate file uploads by checking magic bytes, not just extensions

### Cookie Security
- Set `HttpOnly` to prevent JavaScript access
- Set `Secure` to transmit only over HTTPS
- Set `SameSite=Lax` minimum (or `Strict` for sensitive cookies)
- Scope cookies with `Path` and `Domain`

### Dependency Security
- Run `npm audit` or `pnpm audit` in CI
- Use Dependabot or Renovate for automated updates
- Pin dependencies and review lockfile changes
- Use Subresource Integrity (SRI) for CDN scripts

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Rendering unsanitized user HTML | Always sanitize with DOMPurify before rendering |
| String concatenation in SQL | Use parameterized queries / ORM |
| Missing `SameSite` on cookies | Set `SameSite=Lax` at minimum |
| Allowing `javascript:` URLs | Validate URL protocol against allowlist |
| CSP too permissive (`unsafe-inline`) | Use nonces or hashes instead |
| No rate limiting on auth endpoints | Implement rate limiting |
| Logging sensitive data | Redact passwords, tokens, PII from logs |
| Open redirects | Validate redirect URLs against allowlist |

## Examples

### Security Audit Checklist

```markdown
## Pre-Deployment Security Checklist

### Headers
- [ ] HSTS enabled with preload
- [ ] CSP configured (no unsafe-inline for scripts)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options or CSP frame-ancestors

### Authentication
- [ ] Passwords hashed with Argon2id/bcrypt
- [ ] Rate limiting on login/signup
- [ ] Session timeout configured
- [ ] MFA available

### Data
- [ ] All queries parameterized
- [ ] Input validated server-side with Zod
- [ ] File uploads validated (type, size)
- [ ] PII encrypted at rest

### Dependencies
- [ ] npm audit clean
- [ ] No known CVEs in deps
- [ ] Lockfile committed

### Infrastructure
- [ ] TLS 1.2+ only
- [ ] CORS configured (not *)
- [ ] Error messages don't leak internals
- [ ] Logs don't contain secrets
```
