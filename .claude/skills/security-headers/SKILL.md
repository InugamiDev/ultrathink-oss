---
name: security-headers
description: HTTP security headers — HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy, CORP/COEP/COOP
layer: domain
category: security
triggers:
  - "security headers"
  - "hsts"
  - "x-frame-options"
  - "permissions policy"
  - "referrer policy"
  - "corp"
  - "coep"
inputs:
  - "Application security hardening requirements"
  - "Security header audit results"
  - "Cross-origin isolation needs"
  - "Embedding and framing policy requirements"
outputs:
  - "Security header configurations for various platforms"
  - "Header explanations and risk assessments"
  - "Cross-origin isolation setup"
  - "Platform-specific implementation (Next.js, Nginx, Vercel)"
linksTo:
  - csp
  - owasp
  - nginx
  - nextjs
linkedFrom:
  - owasp
  - csp
preferredNextSkills:
  - csp
  - owasp
fallbackSkills:
  - nginx
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
