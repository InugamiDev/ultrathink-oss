---
name: security-toolkit
description: "Unified web security toolkit — OWASP Top 10 prevention, dependency vulnerability scanning, HTTP security headers (HSTS, X-Frame-Options, Permissions-Policy, CORP/COEP), encryption and key management, Content Security Policy (nonce, report-uri), CORS configuration, CSRF protection, XSS prevention, webhook signature verification. Keeps auth providers (clerk/better-auth/lucia/next-auth/oauth) separate."
layer: domain
category: security
triggers: ["OWASP check", "access-control", "aes", "check for vulnerabilities", "coep", "content security policy", "corp", "cors", "cors error", "cors headers", "cross-origin", "cryptography", "csp", "csp header", "csrf", "decrypt", "dependency audit", "digital signature", "encrypt", "encryption", "harden this", "hashing", "hmac", "hsts", "is this secure", "key management", "nonce", "owasp", "permissions policy", "preflight", "referrer policy", "rsa", "script-src", "secret scan", "security audit", "security headers", "security scan", "sql injection", "vulnerability", "web security", "x-frame-options", "xss", "xss prevention"]
---

# security-toolkit

Unified web security toolkit — OWASP Top 10 prevention, dependency vulnerability scanning, HTTP security headers (HSTS, X-Frame-Options, Permissions-Policy, CORP/COEP), encryption and key management, Content Security Policy (nonce, report-uri), CORS configuration, CSRF protection, XSS prevention, webhook signature verification. Keeps auth providers (clerk/better-auth/lucia/next-auth/oauth) separate.


## Absorbs

- `owasp`
- `security-scanner`
- `security-headers`
- `encryption`
- `csp`
- `cors`
- `csrf-protection`
- `xss-prevention`
- `webhook-security`


---

## From `owasp`

> OWASP Top 10 prevention, security headers, CSP, input validation, XSS/CSRF/SQLi protection

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


---

## From `security-scanner`

> Perform OWASP Top 10 checks, dependency vulnerability audits, secret scanning, and security hardening recommendations

# Security Scanner Skill

## Purpose

Identify security vulnerabilities before they reach production. This skill systematically checks code against OWASP Top 10, scans for leaked secrets, audits dependencies for known CVEs, and recommends hardening measures appropriate to the application's risk profile.

## Key Concepts

### OWASP Top 10 (2021) Quick Reference

| # | Category | What to Check |
|---|----------|---------------|
| A01 | **Broken Access Control** | Missing auth checks, IDOR, privilege escalation |
| A02 | **Cryptographic Failures** | Weak hashing, plaintext secrets, bad TLS config |
| A03 | **Injection** | SQL injection, XSS, command injection, LDAP injection |
| A04 | **Insecure Design** | Missing threat model, business logic flaws |
| A05 | **Security Misconfiguration** | Default creds, verbose errors, missing headers |
| A06 | **Vulnerable Components** | Outdated dependencies with known CVEs |
| A07 | **Auth Failures** | Weak passwords, missing MFA, session fixation |
| A08 | **Data Integrity Failures** | Unsigned updates, insecure deserialization, CI/CD tampering |
| A09 | **Logging Failures** | No audit trail, sensitive data in logs, missing alerting |
| A10 | **SSRF** | Unvalidated URLs, internal network access from user input |

### Severity Classification

```
CRITICAL — Actively exploitable, data breach likely (e.g., SQL injection in auth)
HIGH     — Exploitable with moderate effort (e.g., XSS in user content)
MEDIUM   — Requires specific conditions to exploit (e.g., missing rate limit)
LOW      — Defense-in-depth issue (e.g., missing security header)
INFO     — Best practice recommendation (e.g., consider CSP nonce)
```

## Workflow

### Phase 1: Secret Scanning

Scan for hardcoded secrets, API keys, tokens, and credentials.

**Patterns to detect:**

```
API Keys and Tokens:
  Strings matching (?i)(api[_-]?key|api[_-]?secret|access[_-]?token)
  followed by assignment to a literal string of 16+ characters

AWS Credentials:
  Access key IDs starting with AKIA followed by 16 uppercase alphanumeric chars
  Secret keys: 40-character base64 strings assigned to aws_secret variables

Private Keys:
  PEM headers: -----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----

Database Connection Strings:
  URIs matching (mysql|postgres|mongodb|redis)://user:password@host patterns

JWT Secrets:
  Variables named jwt_secret or jwt_key assigned to literal strings
```

**Remediation:**
1. Remove secret from code immediately
2. Rotate the compromised credential
3. Add the pattern to `.gitignore` and pre-commit hooks
4. Use environment variables or a secret manager (Vault, AWS Secrets Manager, Doppler)
5. Check git history — secrets in old commits are still exposed

```bash
# Scan git history for secrets
git log --all -p | grep -E '(AKIA|password\s*=|secret\s*=)' | head -50

# Use dedicated tools
npx secretlint .
# or
gitleaks detect --source .
```

### Phase 2: Dependency Audit

```bash
# Node.js
npm audit --production
# or
npx audit-ci --high

# Python
pip-audit
# or
safety check

# Go
govulncheck ./...

# Rust
cargo audit
```

**Triage guidance:**
- **Direct dependencies with Critical/High CVEs** — Update immediately
- **Transitive dependencies with Critical CVEs** — Check if exploit path exists
- **No fix available** — Evaluate alternatives, apply workaround, or accept risk with documentation

### Phase 3: Code-Level Security Review

#### A01: Broken Access Control

```typescript
// VULNERABLE — no ownership check
app.get('/api/documents/:id', async (req, res) => {
  const doc = await db.document.findUnique({ where: { id: req.params.id } });
  res.json(doc); // Any authenticated user can access any document
});

// SECURE — ownership verified
app.get('/api/documents/:id', async (req, res) => {
  const doc = await db.document.findUnique({
    where: {
      id: req.params.id,
      ownerId: req.user.id, // Scoped to current user
    },
  });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});
```

**Checklist:**
- [ ] Every API endpoint has authentication middleware
- [ ] Resource access is scoped to the authenticated user (or verified role)
- [ ] No direct object references without authorization (IDOR)
- [ ] Admin endpoints require admin role verification
- [ ] CORS is configured to allow only trusted origins

#### A03: Injection Prevention

**SQL Injection:**
```typescript
// VULNERABLE — string concatenation in SQL query
const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// SECURE — parameterized query
const user = await db.query('SELECT * FROM users WHERE email = $1', [userInput]);
```

**Cross-Site Scripting (XSS):**
```typescript
// VULNERABLE — rendering unsanitized user content as HTML

// SECURE — sanitize with DOMPurify before rendering
import DOMPurify from 'dompurify';
const safeHtml = DOMPurify.sanitize(userContent);
```

**Command Injection:**
```typescript
// VULNERABLE — passing user input directly to shell commands

// SECURE — use execFile (array form) with validated input
import { execFile } from 'node:child_process';
execFile('convert', [validatedFilename, 'output.png'], callback);
// execFile does NOT spawn a shell, preventing injection
```

#### A05: Security Headers

```typescript
// Next.js security headers (next.config.js)
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.yourservice.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

module.exports = {
  headers: async () => [{ source: '/(.*)', headers: securityHeaders }],
};
```

#### A07: Authentication Hardening

```typescript
// Password hashing — ALWAYS use bcrypt or argon2, NEVER MD5/SHA
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // Minimum 10, recommended 12+

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET, // 256-bit minimum
  cookie: {
    httpOnly: true,     // Prevent JS access
    secure: true,       // HTTPS only
    sameSite: 'lax',    // CSRF protection
    maxAge: 3600000,    // 1 hour
  },
  resave: false,
  saveUninitialized: false,
};

// Rate limiting for auth endpoints
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

### Phase 4: Infrastructure Security Check

```yaml
# Checklist for deployment security
Environment Variables:
  - [ ] No secrets in code, docker images, or CI logs
  - [ ] Secrets rotated on schedule
  - [ ] Different secrets per environment

Network:
  - [ ] Database not publicly accessible
  - [ ] Internal services not exposed to internet
  - [ ] Firewall rules follow least-privilege

HTTPS:
  - [ ] TLS 1.2+ enforced
  - [ ] HSTS header enabled with preload
  - [ ] Certificate auto-renewal configured

Monitoring:
  - [ ] Failed login attempts logged and alerted
  - [ ] Unusual traffic patterns detected
  - [ ] Dependency vulnerability alerts enabled (Dependabot/Snyk)
```

## Report Format

```markdown
# Security Scan Report
**Date**: YYYY-MM-DD
**Scope**: [files/modules/endpoints scanned]

## Summary
| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 2     |
| Medium   | 5     |
| Low      | 3     |

## Findings

### [HIGH] SQL Injection in User Search (A03)
**File**: src/api/users.ts:45
**Description**: User input concatenated directly into SQL query.
**Impact**: Attacker can read/modify/delete any database record.
**Remediation**: Use parameterized queries.
**Code Fix**:
[before/after code block]

### [MEDIUM] Missing Rate Limiting on Password Reset (A07)
...
```

## Examples

### Quick Security Check for a Next.js App

1. Run `npm audit --production`
2. Check `next.config.js` for security headers
3. Search codebase for dynamic code evaluation, innerHTML, and unsanitized HTML rendering
4. Verify all API routes have auth middleware
5. Check `.env.example` does not contain real values
6. Verify CORS configuration in middleware
7. Check for `console.log` of sensitive data in production code

### Pre-Deploy Security Gate

```bash
# Run all checks as a pre-deploy script
npm audit --production --audit-level=high && \
npx secretlint . && \
echo "Security checks passed"
```

## Common Vulnerability Patterns

| Pattern | Risk | Fix |
|---------|------|-----|
| String concatenation in SQL | SQL Injection | Use parameterized queries |
| innerHTML with user data | XSS | Use textContent or sanitize with DOMPurify |
| Shell commands with user input | Command Injection | Use execFile with array args, validate input |
| Hardcoded secrets in source | Credential Leak | Use environment variables or secret manager |
| Missing auth on API route | Unauthorized Access | Add authentication middleware |
| Wildcard in CORS origin | CSRF/Data theft | Whitelist specific origins |
| Default error pages in prod | Info Disclosure | Custom error pages, no stack traces |
| Unvalidated redirects | Open Redirect | Whitelist redirect destinations |
| Weak password requirements | Account Takeover | Min 12 chars, check against breach lists |
| Missing rate limiting | Brute Force/DoS | Add rate limiting on auth and sensitive endpoints |

## Security Testing Patterns

### Input Validation Testing

Test all user inputs with:
- Empty strings
- Very long strings (10K+ characters)
- SQL metacharacters: `' " ; -- /* */`
- HTML/JS injection payloads
- Unicode: null bytes, RTL override, homoglyphs
- Path traversal: `../../../etc/passwd`
- Protocol handlers: `javascript:`, `data:`, `file://`

### Authentication Testing

- Test login with invalid credentials (should not reveal which field is wrong)
- Test session expiry
- Test concurrent sessions
- Test password reset flow
- Test token invalidation on password change
- Test brute force protection triggers


---

## From `security-headers`

> HTTP security headers — HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy, CORP/COEP/COOP

# HTTP Security Headers

## Purpose

Provide expert guidance on configuring HTTP security headers to protect web applications against common attacks including clickjacking, MIME sniffing, protocol downgrade, information leakage, and cross-origin attacks. Covers all major security headers with platform-specific implementation for Next.js, Nginx, and Vercel.

## Key Patterns

### Essential Security Headers

Every production web application should set these headers.

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restrict browser APIs |
| `X-DNS-Prefetch-Control` | `off` | Prevent DNS prefetch leakage |

### Next.js Implementation

```typescript
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Remove X-Powered-By header
  poweredByHeader: false,
};

export default nextConfig;
```

**Using middleware for dynamic headers:**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Set security headers
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // CSP with nonce for inline scripts
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.myapp.com; frame-ancestors 'none';`
  );

  // Pass nonce to server components
  response.headers.set("X-Nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
```

### Nginx Configuration

```nginx
# /etc/nginx/conf.d/security-headers.conf
# Include in your server block: include /etc/nginx/conf.d/security-headers.conf;

# HSTS -- only set on HTTPS server blocks
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Prevent clickjacking
add_header X-Frame-Options "DENY" always;

# Prevent MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# Referrer policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions policy
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), browsing-topics=()" always;

# Remove server version
server_tokens off;

# Remove X-Powered-By (if proxying to Node.js)
proxy_hide_header X-Powered-By;
```

### Vercel Configuration

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), browsing-topics=()"
        }
      ]
    }
  ]
}
```

### HSTS (HTTP Strict Transport Security)

Forces browsers to use HTTPS for all future requests to the domain.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**Deployment strategy -- ramp up gradually:**

```
# Week 1: Short max-age, no includeSubDomains
Strict-Transport-Security: max-age=86400

# Week 2: Increase to 1 week
Strict-Transport-Security: max-age=604800

# Week 3: Add includeSubDomains
Strict-Transport-Security: max-age=604800; includeSubDomains

# Week 4+: Full duration and preload
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**HSTS Preload:** Submit your domain to https://hstspreload.org/ to be hardcoded into browsers' HSTS list. Requirements:
- Valid HTTPS certificate
- Redirect HTTP to HTTPS
- `max-age` >= 31536000 (1 year)
- `includeSubDomains` directive
- `preload` directive

### Permissions-Policy

Control which browser APIs your site can use. Deny everything you do not need.

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()
```

**Common directives:**

| Directive | Default | Recommendation |
|-----------|---------|----------------|
| `camera` | `*` | `()` unless needed |
| `microphone` | `*` | `()` unless needed |
| `geolocation` | `*` | `()` or `(self)` |
| `payment` | `*` | `(self)` if using Payment Request API |
| `browsing-topics` | `*` | `()` -- opt out of Topics API |
| `interest-cohort` | `*` | `()` -- opt out of FLoC |
| `fullscreen` | `self` | `(self)` |
| `autoplay` | `*` | `(self)` or `()` |

**When embedding third-party iframes:**

```
Permissions-Policy: camera=(self "https://meet.example.com"), microphone=(self "https://meet.example.com"), geolocation=()
```

### Referrer-Policy

Control how much URL information is shared in the Referer header.

| Policy | Cross-Origin | Same-Origin | Recommendation |
|--------|-------------|-------------|----------------|
| `no-referrer` | Nothing | Nothing | Maximum privacy, breaks some analytics |
| `strict-origin` | Origin only (HTTPS) | Origin only | Good for APIs |
| `strict-origin-when-cross-origin` | Origin only (HTTPS) | Full URL | **Recommended default** |
| `same-origin` | Nothing | Full URL | Good for intranets |
| `origin` | Origin only | Origin only | Use when full URL leaks sensitive data |

### Cross-Origin Isolation (CORP/COEP/COOP)

Required for `SharedArrayBuffer`, high-resolution timers, and `performance.measureUserAgentSpecificMemory()`.

```
# Cross-Origin-Opener-Policy -- isolate browsing context
Cross-Origin-Opener-Policy: same-origin

# Cross-Origin-Embedder-Policy -- require CORP on subresources
Cross-Origin-Embedder-Policy: require-corp

# Cross-Origin-Resource-Policy -- on your static assets
Cross-Origin-Resource-Policy: same-site
```

**Gradual rollout with reporting:**

```
# Start with report-only mode
Cross-Origin-Opener-Policy: same-origin; report-to="coop-report"
Cross-Origin-Embedder-Policy: require-corp; report-to="coep-report"

# Reporting endpoint
Reporting-Endpoints: coop-report="https://myapp.com/api/reports/coop", coep-report="https://myapp.com/api/reports/coep"
```

**When COEP breaks third-party resources:**

```html
<!-- Allow specific cross-origin resources without CORP header -->
<img src="https://cdn.example.com/image.jpg" crossorigin="anonymous" />

<!-- Or use credentialless for iframes -->
<iframe src="https://widget.example.com" credentialless></iframe>
```

### Testing Security Headers

```bash
# Quick check with curl
curl -I https://myapp.com | grep -iE "(strict|x-frame|x-content|referrer|permissions|cross-origin)"

# Use securityheaders.com for a grade
# https://securityheaders.com/?q=myapp.com

# Mozilla Observatory
# https://observatory.mozilla.org/
```

## Best Practices

- **Set headers on all responses** -- use `always` directive in Nginx; apply to `/(.*) ` in Next.js/Vercel.
- **Ramp up HSTS gradually** -- start with short `max-age` and increase once confirmed working.
- **Deny by default in Permissions-Policy** -- only allow APIs your application actually uses.
- **Use `strict-origin-when-cross-origin`** as the default Referrer-Policy -- it balances privacy with analytics needs.
- **Remove server identification headers** -- `X-Powered-By`, `Server` version strings leak technology stack.
- **Test after deployment** -- use securityheaders.com and Mozilla Observatory to verify headers are applied correctly.
- **Document header decisions** -- record why each header value was chosen for future maintainers.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| HSTS with `preload` before testing | Cannot easily undo preload submission | Test without `preload` first; submit only when fully confident |
| `X-Frame-Options: DENY` breaking own embeds | Legitimate iframes within your app blocked | Use `SAMEORIGIN` if you embed your own pages; use CSP `frame-ancestors` for more control |
| Forgetting `always` in Nginx | Headers not sent on error responses (4xx, 5xx) | Add `always` to every `add_header` directive |
| COEP breaking third-party images | Images without CORP header fail to load | Add `crossorigin="anonymous"` to img tags or use `credentialless` |
| Permissions-Policy blocking wanted features | Camera/mic denied when app needs them | Explicitly allow with `camera=(self)` for your origin |
| Headers set in CDN and origin | Duplicate headers with conflicting values | Set security headers at one layer only (preferably CDN/edge) |


---

## From `encryption`

> Encryption patterns, key management, hashing, digital signatures, TLS, and secure data storage

# Encryption Specialist

## Purpose

Implement correct cryptographic patterns for data protection including symmetric encryption (AES-GCM), asymmetric encryption (RSA, ECDSA), hashing (SHA-256, Argon2), HMAC, digital signatures, key management, and TLS configuration.

## Key Patterns

### Algorithm Selection Guide

| Use Case | Algorithm | Notes |
|----------|-----------|-------|
| **Password hashing** | Argon2id | Memory-hard, best for passwords |
| **Password hashing (alt)** | bcrypt (cost 12+) | Well-tested, widely available |
| **Data integrity** | SHA-256 | Fast, collision-resistant |
| **Message auth** | HMAC-SHA256 | Verify integrity + authenticity |
| **Symmetric encryption** | AES-256-GCM | Authenticated encryption |
| **Asymmetric encryption** | RSA-OAEP (2048+) | Key exchange, small data |
| **Digital signatures** | Ed25519 or ECDSA P-256 | Fast, compact signatures |
| **Key derivation** | HKDF or PBKDF2 | Derive keys from passwords/secrets |
| **Random tokens** | `crypto.randomBytes(32)` | API keys, session tokens |

### AES-256-GCM Encryption (Web Crypto API)

```typescript
// Works in Node.js, Deno, Cloudflare Workers, and browsers

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable for export
    ["encrypt", "decrypt"]
  );
}

export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded
  );

  // Prepend IV to ciphertext: [IV (12 bytes)][ciphertext + auth tag]
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
```

### HMAC for Webhook Verification

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret);

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

// Usage in a webhook handler
export async function handleWebhook(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!signature || !verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET!)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  // Process verified event
}
```

### Password Hashing (Argon2id)

```typescript
import { hash, verify } from "@node-rs/argon2";

// Recommended Argon2id parameters (OWASP 2024)
const ARGON2_OPTIONS = {
  memoryCost: 19456,  // 19 MiB
  timeCost: 2,        // 2 iterations
  parallelism: 1,     // 1 thread
  outputLen: 32,      // 32 bytes
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
```

### Secure Token Generation

```typescript
import { randomBytes, randomUUID } from "node:crypto";

// API key (256-bit, base64url-encoded)
export function generateApiKey(): string {
  return randomBytes(32).toString("base64url");
}

// Session ID (UUID v4)
export function generateSessionId(): string {
  return randomUUID();
}

// Verification code (6-digit numeric)
export function generateVerificationCode(): string {
  const buffer = randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, "0");
}

// URL-safe token (for reset links, invitations)
export function generateUrlToken(): string {
  return randomBytes(48).toString("base64url");
}
```

### Field-Level Encryption (Database)

```typescript
// Encrypt sensitive fields before storing in DB

const ENCRYPTION_KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, "base64");

export async function encryptField(value: string): Promise<string> {
  const key = await importKey(ENCRYPTION_KEY);
  return encrypt(value, key);
}

export async function decryptField(encrypted: string): Promise<string> {
  const key = await importKey(ENCRYPTION_KEY);
  return decrypt(encrypted, key);
}

// Usage in a user model
async function createUser(data: { email: string; ssn: string }) {
  return db.insert(users).values({
    email: data.email,
    ssnEncrypted: await encryptField(data.ssn),
  });
}
```

## Best Practices

### General Rules
- Never implement your own cryptographic algorithms
- Use well-audited libraries (Web Crypto API, libsodium, @node-rs/argon2)
- Always use authenticated encryption (AES-GCM, ChaCha20-Poly1305)
- Use constant-time comparison for secrets (`timingSafeEqual`)
- Generate unique IVs/nonces for every encryption operation
- Never reuse an IV with the same key in GCM mode

### Key Management
- Store encryption keys in environment variables or secret managers (AWS KMS, Vault)
- Rotate keys periodically; support multiple active key versions
- Use key derivation (HKDF) to derive per-purpose keys from a master key
- Never log, commit, or embed keys in source code
- Use separate keys for different purposes (encryption, signing, hashing)

### Password Storage
- Use Argon2id (or bcrypt as fallback) — never SHA-256/MD5 for passwords
- Use per-user random salts (Argon2 handles this automatically)
- Tune cost parameters so hashing takes 100-500ms
- Rehash on login when upgrading algorithms

### Data at Rest
- Encrypt PII and sensitive fields at the application level
- Use database-level encryption (TDE) as defense in depth
- Encrypt backups with a separate key

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using MD5/SHA for passwords | Use Argon2id or bcrypt |
| Reusing IVs in AES-GCM | Generate a fresh random IV every time |
| String comparison for secrets | Use `timingSafeEqual` |
| ECB mode for AES | Use GCM or CBC with HMAC |
| Hardcoded encryption keys | Use env vars or key management service |
| `Math.random()` for tokens | Use `crypto.randomBytes()` or `crypto.getRandomValues()` |
| Logging decrypted values | Never log sensitive plaintext |

## Examples

### Key Rotation Pattern

```typescript
interface KeyVersion {
  version: number;
  key: CryptoKey;
  active: boolean;
}

class KeyManager {
  private keys: Map<number, KeyVersion> = new Map();
  private activeVersion: number = 0;

  async encrypt(plaintext: string): Promise<{ version: number; data: string }> {
    const active = this.keys.get(this.activeVersion)!;
    const data = await encrypt(plaintext, active.key);
    return { version: active.version, data };
  }

  async decrypt(version: number, encryptedData: string): Promise<string> {
    const keyVersion = this.keys.get(version);
    if (!keyVersion) throw new Error(`Key version ${version} not found`);
    return decrypt(encryptedData, keyVersion.key);
  }
}
```

### Ed25519 Digital Signatures

```typescript
async function generateSigningKeys() {
  return crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
}

async function sign(data: string, privateKey: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const signature = await crypto.subtle.sign("Ed25519", privateKey, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verify(data: string, signature: string, publicKey: CryptoKey): Promise<boolean> {
  const encoded = new TextEncoder().encode(data);
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("Ed25519", publicKey, sigBytes, encoded);
}
```


---

## From `csp`

> Content Security Policy — CSP headers, nonce-based script loading, report-uri/report-to, XSS prevention, and framework-specific configurations

# Content Security Policy (CSP) Skill

## Purpose

Content Security Policy is the most effective defense against Cross-Site Scripting (XSS). CSP tells the browser which sources of content (scripts, styles, images, etc.) are allowed. An attacker who injects a `<script>` tag is blocked because the script's origin is not in the policy. This skill covers header configuration, nonce-based scripts, reporting, and framework integration.

## Key Concepts

### CSP Directive Reference

| Directive | Controls | Example |
|-----------|----------|---------|
| `default-src` | Fallback for all directives | `'self'` |
| `script-src` | JavaScript sources | `'self' 'nonce-abc123'` |
| `style-src` | CSS sources | `'self' 'unsafe-inline'` |
| `img-src` | Image sources | `'self' data: https://cdn.example.com` |
| `font-src` | Font sources | `'self' https://fonts.gstatic.com` |
| `connect-src` | XHR, fetch, WebSocket | `'self' https://api.example.com` |
| `media-src` | Audio/video sources | `'self'` |
| `frame-src` | iframe sources | `https://www.youtube.com` |
| `frame-ancestors` | Who can iframe this page | `'none'` (prevents clickjacking) |
| `object-src` | Flash, Java applets | `'none'` (always) |
| `base-uri` | `<base>` tag restriction | `'self'` |
| `form-action` | Form submission targets | `'self'` |
| `report-uri` | Where to send violation reports | `/api/csp-report` |
| `report-to` | Reporting API v2 | `csp-endpoint` |
| `upgrade-insecure-requests` | Upgrade HTTP to HTTPS | (no value) |

### Source Values

| Value | Meaning |
|-------|---------|
| `'self'` | Same origin only |
| `'none'` | Block everything |
| `'unsafe-inline'` | Allow inline scripts/styles (defeats CSP for XSS) |
| `'unsafe-eval'` | Allow `eval()` (dangerous) |
| `'nonce-{base64}'` | Allow specific inline script/style with matching nonce |
| `'strict-dynamic'` | Trust scripts loaded by already-trusted scripts |
| `https:` | Any HTTPS source |
| `data:` | Data URIs (images, fonts) |
| `blob:` | Blob URIs |
| `https://cdn.example.com` | Specific origin |

### Security Levels

```
Level 0: No CSP (default — no protection)
Level 1: Report-only mode (monitor without blocking)
Level 2: Basic CSP with allowlists (blocks obvious attacks)
Level 3: Strict nonce-based CSP (blocks most XSS, including injected scripts)
Level 4: Strict + no unsafe-inline styles (maximum protection, hardest to implement)
```

## Workflow

### Step 1: Start with Report-Only Mode

Never deploy CSP in enforcement mode first. Start by monitoring:

```typescript
// next.config.ts — Report-only mode
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  report-uri /api/csp-report;
`.replace(/\n/g, ' ').trim();

const nextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy-Report-Only', // Report only — does not block
          value: cspHeader,
        },
      ],
    },
  ],
};
```

### Step 2: CSP Violation Report Endpoint

```typescript
// app/api/csp-report/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    const violation = report['csp-report'] || report;

    console.warn('CSP Violation:', {
      blockedUri: violation['blocked-uri'],
      violatedDirective: violation['violated-directive'],
      documentUri: violation['document-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      originalPolicy: violation['original-policy'],
    });

    // In production, send to your logging service
    // await logger.warn('csp-violation', violation);

    return NextResponse.json({ received: true }, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}
```

### Step 3: Nonce-Based CSP (Strict Mode)

Nonces are the recommended approach. Each response generates a unique nonce that must match inline scripts:

```typescript
// middleware.ts (Next.js)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Generate a unique nonce per request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Build strict CSP
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://api.example.com wss://api.example.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
    `report-uri /api/csp-report`,
  ].join('; ');

  const response = NextResponse.next();

  // Set CSP header
  response.headers.set('Content-Security-Policy', csp);

  // Pass nonce to the page via a custom header (read in layout)
  response.headers.set('X-Nonce', nonce);

  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    { source: '/((?!api|_next/static|_next/image|favicon.ico).*)' },
  ],
};
```

### Step 4: Use Nonce in Next.js Layout

```tsx
// app/layout.tsx
import { headers } from 'next/headers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const nonce = headersList.get('X-Nonce') ?? '';

  return (
    <html lang="en">
      <head>
        {/* Third-party scripts must include the nonce */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // Theme detection (blocking — must run before paint)
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Step 5: Express.js CSP with Helmet

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.nonce}'`, // Dynamic nonce
        ],
        styleSrc: ["'self'", "'unsafe-inline'"], // Often needed for CSS-in-JS
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.example.com"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
        reportUri: ["/api/csp-report"],
      },
    },
  })
);

// Generate nonce per request
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});
```

### Step 6: Handling Common Third-Party Scripts

```typescript
// Common third-party script sources to allowlist:

const thirdPartyScripts = {
  googleAnalytics: 'https://www.googletagmanager.com https://www.google-analytics.com',
  googleFonts: 'https://fonts.googleapis.com https://fonts.gstatic.com',
  stripe: 'https://js.stripe.com https://api.stripe.com',
  cloudflare: 'https://challenges.cloudflare.com',
  youtube: 'https://www.youtube.com https://www.youtube-nocookie.com',
  vercelAnalytics: 'https://va.vercel-scripts.com',
  sentry: 'https://*.ingest.sentry.io',
};

// With strict-dynamic, you only need the nonce on the initial script tag.
// Scripts loaded BY trusted scripts are automatically trusted.
// This means: Add nonce to your GTM snippet, and all GTM-loaded scripts are allowed.
```

### Step 7: Gradual Migration Path

```
Week 1: Add CSP in Report-Only mode with permissive policy
  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...

Week 2: Review violation reports, add legitimate sources
  - Add CDN origins
  - Add API origins to connect-src
  - Identify inline scripts that need nonces

Week 3: Implement nonce generation, add nonces to inline scripts
  script-src 'self' 'nonce-xxx' 'strict-dynamic'

Week 4: Remove 'unsafe-inline' and 'unsafe-eval' from script-src
  (strict-dynamic with nonce supersedes unsafe-inline)

Week 5: Switch from Report-Only to enforcing
  Content-Security-Policy: ... (same policy, now blocking)

Week 6: Monitor reports, fix any remaining violations
```

## Common Pitfalls

1. **Deploying CSP in enforcement mode without testing** — Always start with `Content-Security-Policy-Report-Only`. Enforcement mode will break your site if the policy is wrong.
2. **Using `unsafe-inline` for scripts** — This defeats CSP's XSS protection entirely. Use nonces instead. With `'strict-dynamic'` and a nonce, you get strong protection.
3. **Forgetting `connect-src` for API calls** — `fetch()` and WebSocket connections are controlled by `connect-src`, not `script-src`. Forgetting this breaks all API calls.
4. **Not allowing `data:` for images** — Many applications use data URIs for thumbnails, avatars, or placeholders. Add `data:` to `img-src` if needed.
5. **Nonce reuse** — Every HTTP response must have a unique nonce. Reusing nonces across requests defeats the purpose. Generate per-request in middleware.
6. **CSP breaking CSS-in-JS** — Libraries like styled-components inject `<style>` tags at runtime. Either add nonces to the style injection or allow `'unsafe-inline'` for `style-src` only (style injection is lower risk than script injection).
7. **Forgetting `frame-ancestors 'none'`** — Without this, your site can be embedded in an iframe for clickjacking attacks. Always set `frame-ancestors`.

## Complete Security Headers Set

```typescript
// All recommended security headers (not just CSP)
const securityHeaders = {
  'Content-Security-Policy': csp,
  'X-Content-Type-Options': 'nosniff',           // Prevent MIME sniffing
  'X-Frame-Options': 'DENY',                      // Prevent clickjacking (legacy)
  'X-XSS-Protection': '0',                        // Disable browser XSS filter (CSP is better)
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', // Disable APIs
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload', // HSTS
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};
```

## Best Practices

- **Start with Report-Only**: Monitor before enforcing
- **Use nonces, not allowlists**: Nonces are more secure than domain allowlists (which can be bypassed via JSONP endpoints)
- **`strict-dynamic` is your friend**: Trusts scripts loaded by trusted scripts, reducing allowlist maintenance
- **`object-src 'none'` always**: Flash/Java applets are attack vectors with no modern use
- **Monitor violations continuously**: CSP reports reveal attack attempts and misconfigurations
- **Test with browser DevTools**: Console shows blocked resources with the violated directive


---

## From `cors`

> Configure Cross-Origin Resource Sharing (CORS) policies — Access-Control headers, preflight handling, credentials, wildcard risks, and dev proxy setups for secure cross-origin communication

# CORS Configuration Skill

## Purpose

CORS is the browser's same-origin policy enforcement mechanism. Misconfigured CORS either blocks legitimate requests (breaking your app) or opens your API to unauthorized origins (security hole). This skill configures CORS correctly for every environment — development, staging, and production — with proper preflight handling, credential support, and security hardening.

## Key Concepts

### How CORS Works

```
Browser sends request from origin A to server at origin B

1. SIMPLE REQUEST (GET/POST with standard headers):
   Browser → Server: Request + Origin header
   Server → Browser: Response + Access-Control-Allow-Origin
   Browser: If origin matches → allow, else → block JS access

2. PREFLIGHT REQUEST (PUT/DELETE, custom headers, JSON content-type):
   Browser → Server: OPTIONS + Origin + Access-Control-Request-Method/Headers
   Server → Browser: Access-Control-Allow-* headers
   Browser: If allowed → send actual request, else → block
```

### CORS Header Reference

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Access-Control-Allow-Origin` | Response | Which origin(s) can read the response |
| `Access-Control-Allow-Methods` | Response (preflight) | Allowed HTTP methods |
| `Access-Control-Allow-Headers` | Response (preflight) | Allowed request headers |
| `Access-Control-Allow-Credentials` | Response | Whether cookies/auth are allowed |
| `Access-Control-Expose-Headers` | Response | Headers JS can read beyond defaults |
| `Access-Control-Max-Age` | Response (preflight) | How long to cache preflight result (seconds) |
| `Origin` | Request | The requesting origin (set by browser) |

### The Credentials Trap

```
Access-Control-Allow-Origin: *        ← OK without credentials
Access-Control-Allow-Credentials: true ← Requires SPECIFIC origin, NOT wildcard

❌ INVALID: Allow-Origin: * + Allow-Credentials: true
✅ VALID:   Allow-Origin: https://app.example.com + Allow-Credentials: true
```

## Implementation

### Express.js with `cors` Package

```typescript
import cors from 'cors';
import express from 'express';

const app = express();

// Production: explicit allowlist
const allowedOrigins = [
  'https://app.example.com',
  'https://admin.example.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
}));
```

### Express.js Manual Implementation (No Dependencies)

```typescript
import { Request, Response, NextFunction } from 'express';

function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    'https://app.example.com',
    'https://admin.example.com',
  ]);

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin'); // Critical for CDN caching
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  next();
}
```

### Next.js API Routes

```typescript
// next.config.ts — header-based CORS for all API routes
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://app.example.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

```typescript
// middleware.ts — dynamic CORS with origin validation
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
]);

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isPreflight = request.method === 'OPTIONS';

  if (!ALLOWED_ORIGINS.has(origin)) {
    return isPreflight
      ? new NextResponse(null, { status: 403 })
      : NextResponse.next();
  }

  const response = isPreflight
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');

  if (isPreflight) {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  return response;
}

export const config = { matcher: '/api/:path*' };
```

### Go (net/http)

```go
func corsMiddleware(next http.Handler) http.Handler {
    allowedOrigins := map[string]bool{
        "https://app.example.com":   true,
        "https://admin.example.com": true,
    }

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")

        if allowedOrigins[origin] {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Vary", "Origin")
        }

        if r.Method == http.MethodOptions {
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
            w.Header().Set("Access-Control-Max-Age", "86400")
            w.WriteHeader(http.StatusNoContent)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

### Dev Proxy (Avoiding CORS in Development)

```typescript
// vite.config.ts — proxy API requests to backend
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

```typescript
// next.config.ts — rewrites as dev proxy
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/external/:path*',
        destination: 'http://localhost:8080/:path*',
      },
    ];
  },
};
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    location / {
        # Dynamic origin validation
        set $cors_origin "";
        if ($http_origin ~* "^https://(app|admin)\.example\.com$") {
            set $cors_origin $http_origin;
        }

        add_header 'Access-Control-Allow-Origin' $cors_origin always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Vary' 'Origin' always;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
            add_header 'Access-Control-Max-Age' 86400;
            add_header 'Content-Length' 0;
            return 204;
        }

        proxy_pass http://backend;
    }
}
```

## Best Practices

1. **Always set `Vary: Origin`** when the response differs by origin. Without it, CDNs may serve a cached response with the wrong `Allow-Origin` header to a different origin.
2. **Never use `Access-Control-Allow-Origin: *` in production with credentials.** The browser will reject it. Use an explicit origin allowlist.
3. **Cache preflight responses** with `Access-Control-Max-Age` to reduce OPTIONS requests. 86400 (24h) is a safe default; browsers cap at varying maximums.
4. **Keep `allowedHeaders` minimal.** Only list headers your API actually reads. Overly permissive headers expand the attack surface.
5. **Validate origins server-side**, not just via CORS. CORS is a browser feature — non-browser clients bypass it entirely.
6. **Use dev proxies** instead of permissive CORS in development. This avoids the need for environment-conditional CORS configs.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Wildcard with credentials | Browser error: "Cannot use wildcard with credentials" | Replace `*` with explicit origin from allowlist |
| Missing `Vary: Origin` | CDN serves wrong origin's CORS header | Add `Vary: Origin` to every CORS response |
| Forgetting OPTIONS handler | Preflight returns 404 or 405 | Ensure OPTIONS routes exist and return 204 |
| Regex origin matching | ReDoS vulnerability or overly broad matches | Use exact `Set` lookup, not regex on untrusted input |
| CORS on server-to-server calls | Unnecessary headers on internal traffic | Only apply CORS middleware to public-facing routes |
| Double CORS headers | `Access-Control-Allow-Origin` appears twice | Check that only one layer (app OR proxy) sets CORS, not both |
| `Content-Type: application/json` triggers preflight | Unexpected OPTIONS requests on POST | This is correct behavior — ensure preflight handler exists |
| Dev `*` leaking to production | Open CORS in production | Use environment-based origin allowlists, never hardcode `*` |

