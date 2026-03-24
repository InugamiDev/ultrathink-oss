---
name: api-throttling
description: API throttling and backpressure — token bucket, sliding window, per-user limits, 429 handling
layer: domain
category: backend
triggers: [throttle, throttling, backpressure, token bucket, sliding window, 429]
linksTo: [rate-limiting, api-gateway, redis]
linkedFrom: []
riskLevel: low
---

# api-throttling

API throttling and backpressure — token bucket, sliding window, per-user limits, 429 handling

## When to Use
Activate when the prompt involves: throttle, throttling, backpressure, token bucket, sliding window, 429

## Key Patterns

```typescript
// See documentation for api-throttling patterns
```

## Best Practices
- Follow established api-throttling conventions
- Test thoroughly before production
- Document decisions and trade-offs
