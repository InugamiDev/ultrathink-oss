---
name: cors
description: Configure Cross-Origin Resource Sharing (CORS) policies — Access-Control headers, preflight handling, credentials, wildcard risks, and dev proxy setups for secure cross-origin communication
layer: domain
category: security
triggers:
  - "CORS error"
  - "cors configuration"
  - "Access-Control-Allow-Origin"
  - "preflight request"
  - "cross-origin request"
  - "cors headers"
  - "blocked by CORS"
  - "cors proxy"
  - "credentials cors"
inputs:
  - Origin(s) that need access
  - HTTP methods and headers required
  - Whether credentials (cookies, auth headers) are needed
  - Backend framework (Express, Next.js, Fastify, Go, etc.)
  - Deployment environment (dev proxy, production CDN)
outputs:
  - CORS middleware or header configuration
  - Preflight handler for OPTIONS requests
  - Dev proxy setup for local development
  - Security audit of CORS policy
  - Troubleshooting guide for common CORS errors
linksTo:
  - authentication
  - api-designer
  - nginx
  - security-scanner
linkedFrom:
  - api-designer
  - debug
preferredNextSkills:
  - security-scanner
  - api-designer
fallbackSkills:
  - debug
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
