---
name: circuit-breaker
description: Circuit breaker for fault tolerance — closed/open/half-open states, fallback, resilience libs
layer: domain
category: architecture
triggers:
  - circuit breaker
  - fault tolerance
  - resilience
  - fallback pattern
  - service degradation
  - cascading failure
linksTo:
  - error-handling
  - microservices
  - api-gateway
linkedFrom:
  - microservices
  - api-gateway
riskLevel: high
---

# Circuit Breaker

## Overview

The circuit breaker pattern prevents cascading failures in distributed systems by wrapping calls to external services in a state machine. When failures exceed a threshold, the circuit "opens" and short-circuits requests, returning a fallback response instead of overwhelming a degraded service.

## When to Use

- Calling external APIs or microservices that may become unavailable
- Database connections under heavy load
- Any I/O operation where repeated failures waste resources and degrade UX
- Systems where partial degradation is preferable to total failure

## Key Patterns

### Three States

| State | Behavior |
|-------|----------|
| **Closed** | Requests pass through normally; failures are counted |
| **Open** | Requests are immediately rejected; fallback is returned |
| **Half-Open** | A limited number of probe requests are allowed to test recovery |

### Basic Implementation

```typescript
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number;   // failures before opening
  resetTimeoutMs: number;     // time before half-open probe
  halfOpenMax: number;        // probe requests in half-open
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  constructor(private opts: CircuitBreakerOptions) {}

  async call<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.opts.resetTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
      } else {
        return fallback();
      }
    }

    if (this.state === 'half-open' && this.halfOpenAttempts >= this.opts.halfOpenMax) {
      return fallback();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      return fallback();
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'half-open' || this.failureCount >= this.opts.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

### Usage with a Resilience Library (opossum)

```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(fetchUserProfile, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
});

breaker.fallback(() => ({ name: 'Guest', cached: true }));
breaker.on('open', () => metrics.increment('circuit.open'));
breaker.on('halfOpen', () => metrics.increment('circuit.halfOpen'));

const profile = await breaker.fire(userId);
```

### Per-Service Breakers in an API Gateway

```typescript
const breakers = new Map<string, CircuitBreaker>();

function getBreaker(service: string) {
  if (!breakers.has(service)) {
    breakers.set(service, new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      halfOpenMax: 2,
    }));
  }
  return breakers.get(service)!;
}
```

## Pitfalls

- **Threshold too low**: Normal transient errors trip the breaker unnecessarily. Use error-rate percentages rather than raw counts.
- **No fallback defined**: An open circuit with no fallback just throws a different error — always provide a degraded response.
- **Shared state in serverless**: Each Lambda/Edge Function instance has its own breaker state. Use Redis or a shared store for distributed breakers.
- **Missing observability**: Always emit metrics on state transitions — an open circuit you don't know about is a silent outage.
- **Reset timeout too short**: Half-open probes hit a still-recovering service and re-open the circuit. Start with 30s+ and tune from there.
