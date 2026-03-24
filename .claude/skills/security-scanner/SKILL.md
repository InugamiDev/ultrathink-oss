---
name: security-scanner
description: Perform OWASP Top 10 checks, dependency vulnerability audits, secret scanning, and security hardening recommendations
layer: utility
category: security
triggers:
  - "security scan"
  - "security audit"
  - "check for vulnerabilities"
  - "OWASP check"
  - "secret scan"
  - "dependency audit"
  - "is this secure"
  - "harden this"
inputs:
  - Codebase or specific files/modules to audit
  - Dependency manifest (package.json, requirements.txt, go.mod)
  - Deployment environment details
  - Compliance requirements (SOC2, HIPAA, PCI-DSS)
outputs:
  - Security findings report with severity levels (Critical, High, Medium, Low, Info)
  - Remediation steps for each finding
  - Hardened code replacements
  - Security headers and configuration recommendations
  - Dependency vulnerability report
linksTo:
  - error-handling
  - code-review
  - api-designer
linkedFrom:
  - ship
  - code-review
  - audit
preferredNextSkills:
  - fix
  - testing-patterns
fallbackSkills:
  - code-review
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - May modify code to fix vulnerabilities
  - May update dependencies
  - May add security headers/middleware
  - May create security configuration files
---

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
