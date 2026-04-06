---
name: csp
description: Content Security Policy — CSP headers, nonce-based script loading, report-uri/report-to, XSS prevention, and framework-specific configurations
layer: utility
category: security
triggers:
  - "content security policy"
  - "CSP header"
  - "csp nonce"
  - "XSS prevention"
  - "script-src"
  - "security headers"
  - "report-uri"
  - "inline script security"
inputs:
  - Current security header configuration
  - Framework (Next.js, Express, Nginx)
  - Third-party scripts in use (analytics, CDNs, widgets)
  - Inline script requirements
outputs:
  - CSP header configuration
  - Nonce generation and injection setup
  - Report endpoint for CSP violations
  - Testing and debugging workflow
  - Migration plan from no-CSP to strict CSP
linksTo:
  - owasp
  - security-scanner
  - nginx
  - nextjs
linkedFrom:
  - audit
  - ship
preferredNextSkills:
  - owasp
  - security-scanner
fallbackSkills:
  - audit
riskLevel: high
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Adds HTTP response headers
  - May block third-party scripts
  - May break inline styles/scripts if misconfigured
---

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
