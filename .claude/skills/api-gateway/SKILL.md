---
name: api-gateway
description: API gateway patterns — routing, rate limiting, authentication, request transformation, and service mesh.
layer: utility
category: architecture
triggers:
  - "api gateway"
  - "gateway pattern"
  - "service mesh"
  - "api proxy"
  - "ingress"
inputs:
  - "API gateway architecture decisions"
  - "Routing and load balancing requirements"
  - "Rate limiting and throttling design"
  - "Service mesh topology"
outputs:
  - "API gateway configurations"
  - "Routing and middleware chains"
  - "Rate limiting strategies"
  - "Service mesh patterns"
linksTo:
  - microservices
  - rate-limiting
  - cors
  - nginx
  - security-headers
linkedFrom: []
preferredNextSkills:
  - microservices
  - rate-limiting
  - nginx
fallbackSkills:
  - cors
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# API Gateway Patterns

## Purpose

Provide expert guidance on API gateway architecture, routing strategies, rate limiting, authentication delegation, request/response transformation, circuit breaking, and service mesh integration. Covers both dedicated gateway solutions (Kong, AWS API Gateway) and custom gateway implementations.

## Gateway Responsibilities

An API gateway is the single entry point for all client requests. Core responsibilities:

1. **Routing** — Direct requests to the correct backend service
2. **Authentication** — Validate tokens, API keys before forwarding
3. **Rate Limiting** — Protect backends from overload
4. **Request Transformation** — Modify headers, body, query params
5. **Response Aggregation** — Combine multiple service responses (BFF pattern)
6. **Circuit Breaking** — Fail fast when a backend is unhealthy
7. **Observability** — Centralized logging, metrics, tracing

## Custom Gateway with Node.js

**Express-based gateway skeleton:**

```typescript
// gateway/src/index.ts
import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { rateLimiter } from './middleware/rate-limiter';
import { authMiddleware } from './middleware/auth';
import { circuitBreaker } from './middleware/circuit-breaker';
import { requestLogger } from './middleware/logger';

const app = express();

// Global middleware
app.use(requestLogger);
app.use(rateLimiter({ windowMs: 60_000, max: 100 }));

// Service routing
const services: Record<string, Options> = {
  '/api/users': {
    target: process.env.USER_SERVICE_URL,
    pathRewrite: { '^/api/users': '' },
    changeOrigin: true,
  },
  '/api/orders': {
    target: process.env.ORDER_SERVICE_URL,
    pathRewrite: { '^/api/orders': '' },
    changeOrigin: true,
  },
  '/api/products': {
    target: process.env.PRODUCT_SERVICE_URL,
    pathRewrite: { '^/api/products': '' },
    changeOrigin: true,
  },
};

for (const [path, config] of Object.entries(services)) {
  app.use(
    path,
    authMiddleware,
    circuitBreaker(config.target as string),
    createProxyMiddleware(config),
  );
}

// Health check (no auth)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(3000);
```

## Rate Limiting Strategies

**Token bucket per API key:**

```typescript
// gateway/src/middleware/rate-limiter.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// Tiered rate limits by plan
const limiters = {
  free: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:free',
    points: 100,      // requests
    duration: 60,      // per 60 seconds
    blockDuration: 60, // block for 60s when exceeded
  }),
  pro: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:pro',
    points: 1000,
    duration: 60,
  }),
  enterprise: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:enterprise',
    points: 10000,
    duration: 60,
  }),
};

export async function rateLimitMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const plan = await getPlanForKey(apiKey); // look up plan
  const limiter = limiters[plan] ?? limiters.free;

  try {
    const result = await limiter.consume(apiKey ?? req.ip);
    // Set standard rate limit headers
    res.set({
      'X-RateLimit-Limit': String(limiter.points),
      'X-RateLimit-Remaining': String(result.remainingPoints),
      'X-RateLimit-Reset': String(Math.ceil(result.msBeforeNext / 1000)),
    });
    next();
  } catch (rateLimiterRes) {
    res.set({
      'Retry-After': String(Math.ceil(rateLimiterRes.msBeforeNext / 1000)),
      'X-RateLimit-Limit': String(limiter.points),
      'X-RateLimit-Remaining': '0',
    });
    res.status(429).json({ error: 'Too many requests' });
  }
}
```

## Authentication Delegation

**JWT validation at the gateway:**

```typescript
// gateway/src/middleware/auth.ts
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(new URL(process.env.JWKS_URL!));

const PUBLIC_PATHS = ['/health', '/api/auth/login', '/api/auth/register'];

export async function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.some((p) => req.originalUrl.startsWith(p))) {
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    // Forward user context to downstream services
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-roles'] = (payload.roles as string[])?.join(',');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

## Circuit Breaker

```typescript
// gateway/src/middleware/circuit-breaker.ts
import CircuitBreaker from 'opossum';

const breakers = new Map<string, CircuitBreaker>();

interface BreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
}

const defaults: BreakerOptions = {
  timeout: 5000,           // 5s request timeout
  errorThresholdPercentage: 50, // open circuit at 50% errors
  resetTimeout: 30000,     // try again after 30s
};

export function circuitBreaker(serviceUrl: string) {
  return (req, res, next) => {
    let breaker = breakers.get(serviceUrl);
    if (!breaker) {
      breaker = new CircuitBreaker(
        async () => next(),
        defaults,
      );

      breaker.on('open', () =>
        console.warn(`Circuit OPEN for ${serviceUrl}`),
      );
      breaker.on('halfOpen', () =>
        console.info(`Circuit HALF-OPEN for ${serviceUrl}`),
      );
      breaker.on('close', () =>
        console.info(`Circuit CLOSED for ${serviceUrl}`),
      );

      breakers.set(serviceUrl, breaker);
    }

    breaker.fire().catch(() => {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceUrl,
      });
    });
  };
}
```

## Request/Response Transformation

```typescript
// gateway/src/middleware/transform.ts

// Add correlation ID for distributed tracing
export function correlationId(req, _res, next) {
  req.headers['x-correlation-id'] =
    req.headers['x-correlation-id'] ?? crypto.randomUUID();
  next();
}

// Strip internal headers from responses
export function stripInternalHeaders(_req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    res.removeHeader('x-internal-service-id');
    res.removeHeader('x-internal-trace');
    return originalSend.call(this, body);
  };
  next();
}

// Response aggregation (BFF pattern)
export async function aggregateUserProfile(req, res) {
  const userId = req.params.id;
  const [user, orders, preferences] = await Promise.allSettled([
    fetch(`${USER_SERVICE}/users/${userId}`).then((r) => r.json()),
    fetch(`${ORDER_SERVICE}/users/${userId}/orders?limit=5`).then((r) => r.json()),
    fetch(`${PREF_SERVICE}/users/${userId}/preferences`).then((r) => r.json()),
  ]);

  res.json({
    user: user.status === 'fulfilled' ? user.value : null,
    recentOrders: orders.status === 'fulfilled' ? orders.value : [],
    preferences: preferences.status === 'fulfilled' ? preferences.value : {},
  });
}
```

## Nginx as API Gateway

```nginx
# nginx.conf
upstream user_service {
    server user-service:3001;
    server user-service:3002;
}

upstream order_service {
    server order-service:3003;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

server {
    listen 80;

    # Global rate limit
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;

    # User service
    location /api/users/ {
        proxy_pass http://user_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Correlation-ID $request_id;

        # Circuit breaker via timeouts
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
    }

    # Order service
    location /api/orders/ {
        proxy_pass http://order_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        access_log off;
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}
```

## Best Practices

1. **Single entry point** — All external traffic routes through the gateway.
2. **No business logic in the gateway** — Only cross-cutting concerns (auth, rate limit, routing).
3. **Validate auth at the gateway** — Forward user context in headers to downstream services.
4. **Use circuit breakers** — Prevent cascading failures when a backend is down.
5. **Set request timeouts** — Prevent slow backends from consuming gateway resources.
6. **Add correlation IDs** — Inject a unique ID at the gateway for distributed tracing.
7. **Rate limit by API key, not just IP** — IP-based limits break for shared networks.
8. **Strip internal headers** — Never leak internal service metadata to clients.
9. **Health check all backends** — Remove unhealthy instances from the routing pool.
10. **Cache at the edge** — Cache GET responses for read-heavy APIs (CDN or gateway-level).

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Gateway as monolith | Single point of failure | Deploy multiple instances behind a load balancer |
| No timeout on proxied requests | Slow backend blocks gateway threads | Set `proxy_read_timeout` and circuit breaker |
| Rate limiting by IP only | Punishes shared networks, misses API key abuse | Rate limit by authenticated identity or API key |
| Missing CORS at gateway | Browsers block API calls | Configure CORS headers at the gateway level |
| No retry budget | Retries amplify load on failing services | Limit total retries per request, use exponential backoff |
| Business logic in gateway | Gateway becomes coupled to services | Keep gateway stateless; only cross-cutting concerns |
