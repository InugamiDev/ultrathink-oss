---
name: microservices
description: Service decomposition, inter-service communication, saga patterns, service mesh, API gateway, and distributed systems patterns
layer: domain
category: backend
triggers:
  - "microservices"
  - "micro services"
  - "service mesh"
  - "api gateway"
  - "saga pattern"
  - "service decomposition"
  - "distributed system"
  - "cqrs"
  - "event sourcing"
inputs:
  - "System architecture requirements"
  - "Service boundary definitions"
  - "Scaling requirements"
outputs:
  - "Service decomposition designs"
  - "Communication patterns"
  - "Saga orchestration implementations"
linksTo:
  - message-queues
  - redis
  - postgresql
  - graphql
  - golang
  - nodejs
  - rust
linkedFrom:
  - error-handling
  - logging
  - monitoring
preferredNextSkills:
  - message-queues
  - redis
  - postgresql
fallbackSkills:
  - nodejs
  - golang
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Microservices Domain Skill

## Purpose

Provide expert-level guidance on microservice architecture, including service decomposition strategies, inter-service communication patterns, saga orchestration, CQRS/event sourcing, API gateway design, resilience patterns, and distributed data management.

## When to Use Microservices

**Start with a modular monolith.** Extract microservices only when you have:
- Different scaling requirements per module
- Different deployment cadences per team
- Technology diversity needs (e.g., ML service in Python, API in Go)
- Team autonomy requirements (Conway's Law)

**Do NOT use microservices for:**
- Small teams (< 10 engineers)
- Simple CRUD applications
- Premature optimization of theoretical scaling needs

## Key Patterns

### 1. Service Decomposition

```
# Bounded Context identification (Domain-Driven Design)

┌─────────────────────────────────────────────────────┐
│                    E-Commerce System                 │
├──────────────┬──────────────┬────────────────────────┤
│  Order       │  Inventory   │  Payment               │
│  Context     │  Context     │  Context               │
│              │              │                        │
│  - Order     │  - Product   │  - Payment             │
│  - OrderItem │  - Stock     │  - Refund              │
│  - Shipping  │  - Warehouse │  - PaymentMethod       │
│              │              │                        │
│  Team: Order │  Team: Ops   │  Team: Payments        │
│  DB: Postgres│  DB: Postgres│  DB: Postgres          │
│  Lang: Go    │  Lang: Go    │  Lang: Node.js         │
└──────────────┴──────────────┴────────────────────────┘

# Each service owns its data -- no shared databases
# Communication via APIs (sync) or events (async)
```

**Decomposition heuristics:**
- **Business capability**: Order management, inventory, billing
- **Subdomain**: Core, supporting, generic (DDD)
- **Data ownership**: Group by data that changes together
- **Team ownership**: Align with organizational structure

### 2. Communication Patterns

```
Synchronous (Request-Response):
┌─────────┐    HTTP/gRPC    ┌─────────┐
│ Service A│───────────────→│Service B │
│         │←───────────────│         │
└─────────┘                └─────────┘
Use for: Queries, commands needing immediate response

Asynchronous (Event-Driven):
┌─────────┐    Event Bus    ┌─────────┐
│ Service A│───→ [Event] ───→│Service B │
└─────────┘                 └─────────┘
                            ┌─────────┐
                        ───→│Service C │
                            └─────────┘
Use for: Notifications, eventual consistency, decoupling
```

```typescript
// API Gateway pattern (Node.js with Express)
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import CircuitBreaker from 'opossum';

const app = express();

// Rate limiting per client
app.use(rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
}));

// Circuit breaker for downstream services
function createServiceProxy(name: string, target: string) {
  const breaker = new CircuitBreaker(
    async (req: express.Request) => {
      return fetch(`${target}${req.path}`, {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(5000),
      });
    },
    {
      timeout: 5000,        // Request timeout
      errorThresholdPercentage: 50, // Open circuit at 50% failure
      resetTimeout: 30000,  // Try again after 30s
      volumeThreshold: 10,  // Min requests before tripping
    }
  );

  breaker.on('open', () => logger.warn(`Circuit breaker OPEN for ${name}`));
  breaker.on('halfOpen', () => logger.info(`Circuit breaker half-open for ${name}`));
  breaker.on('close', () => logger.info(`Circuit breaker CLOSED for ${name}`));

  return breaker;
}

// Route to services
const services = {
  orders: createServiceProxy('orders', 'http://order-service:3001'),
  inventory: createServiceProxy('inventory', 'http://inventory-service:3002'),
  payments: createServiceProxy('payments', 'http://payment-service:3003'),
};
```

### 3. Saga Pattern (Orchestration)

```typescript
// Saga for order creation spanning multiple services
interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<void>;
  compensate: (context: T) => Promise<void>;
}

class SagaOrchestrator<T> {
  private steps: SagaStep<T>[] = [];

  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  async execute(context: T): Promise<void> {
    const completedSteps: SagaStep<T>[] = [];

    try {
      for (const step of this.steps) {
        logger.info({ step: step.name }, 'Executing saga step');
        await step.execute(context);
        completedSteps.push(step);
      }
    } catch (error) {
      logger.error({ error, completedSteps: completedSteps.length }, 'Saga failed, compensating');

      // Compensate in reverse order
      for (const step of completedSteps.reverse()) {
        try {
          logger.info({ step: step.name }, 'Compensating saga step');
          await step.compensate(context);
        } catch (compensateError) {
          logger.error(
            { step: step.name, error: compensateError },
            'Compensation failed -- manual intervention required'
          );
          // Store in dead letter for manual resolution
          await dlq.add('saga-compensation-failed', {
            sagaId: context.sagaId,
            step: step.name,
            error: compensateError,
          });
        }
      }

      throw error;
    }
  }
}

// Usage: Create Order Saga
interface OrderSagaContext {
  sagaId: string;
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentId?: string;
  reservationId?: string;
}

const createOrderSaga = new SagaOrchestrator<OrderSagaContext>()
  .addStep({
    name: 'reserve-inventory',
    execute: async (ctx) => {
      ctx.reservationId = await inventoryService.reserve(ctx.items);
    },
    compensate: async (ctx) => {
      if (ctx.reservationId) {
        await inventoryService.releaseReservation(ctx.reservationId);
      }
    },
  })
  .addStep({
    name: 'process-payment',
    execute: async (ctx) => {
      ctx.paymentId = await paymentService.charge(ctx.userId, calculateTotal(ctx.items));
    },
    compensate: async (ctx) => {
      if (ctx.paymentId) {
        await paymentService.refund(ctx.paymentId);
      }
    },
  })
  .addStep({
    name: 'create-order',
    execute: async (ctx) => {
      await orderService.create(ctx.orderId, ctx.items, ctx.paymentId!);
    },
    compensate: async (ctx) => {
      await orderService.cancel(ctx.orderId);
    },
  });
```

### 4. CQRS (Command Query Responsibility Segregation)

```typescript
// Separate write model (commands) from read model (queries)

// Command side: Handles writes, emits events
class OrderCommandService {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus,
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: OrderCreatedEvent = {
      type: 'OrderCreated',
      aggregateId: orderId,
      data: {
        userId: command.userId,
        items: command.items,
        total: command.total,
      },
      timestamp: new Date(),
      version: 1,
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side: Optimized read models, updated by event handlers
class OrderQueryService {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(id: string): Promise<OrderView | null> {
    return this.readDb.query('SELECT * FROM order_views WHERE id = $1', [id]);
  }

  async getOrdersByUser(userId: string, pagination: Pagination): Promise<OrderView[]> {
    return this.readDb.query(
      'SELECT * FROM order_views WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, pagination.limit, pagination.offset]
    );
  }
}

// Projection: Updates read model from events
class OrderProjection {
  constructor(private readDb: ReadDatabase) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'OrderCreated':
        await this.readDb.execute(
          'INSERT INTO order_views (id, user_id, items, total, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [event.aggregateId, event.data.userId, JSON.stringify(event.data.items), event.data.total, 'pending', event.timestamp]
        );
        break;
      case 'OrderShipped':
        await this.readDb.execute(
          'UPDATE order_views SET status = $1, shipped_at = $2 WHERE id = $3',
          ['shipped', event.timestamp, event.aggregateId]
        );
        break;
    }
  }
}
```

### 5. Health Checks and Service Discovery

```typescript
// Standard health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    downstream: await checkDownstreamServices(),
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
  });
});
```

## Best Practices

1. **Start monolith, extract later** -- premature decomposition is worse than a monolith
2. **One database per service** -- never share databases across services
3. **Design for failure** -- every network call can fail (circuit breakers, retries, timeouts)
4. **Use async communication** where possible -- reduces coupling
5. **Implement correlation IDs** across all service calls for distributed tracing
6. **Version your APIs** -- services must evolve independently
7. **Use contract testing** (Pact) to verify service interfaces
8. **Implement health checks** (liveness + readiness) for orchestrators
9. **Use idempotency keys** for all mutations across service boundaries
10. **Monitor the four golden signals**: latency, traffic, errors, saturation

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Shared database between services | Tight coupling, deployment conflicts | One DB per service, sync via events |
| Synchronous chains (A->B->C->D) | Cascading failures, high latency | Use async messaging, saga pattern |
| No circuit breakers | One slow service degrades all | Implement circuit breaker on every outbound call |
| Distributed monolith | Worst of both worlds | Ensure services are truly independent (own data, deploy independently) |
| Ignoring data consistency | Lost updates, inconsistent state | Saga pattern, eventual consistency, idempotency |
| Too many services too early | Operational overhead kills velocity | Start with modular monolith, extract when needed |
| No observability | Impossible to debug distributed issues | Distributed tracing, centralized logging, metrics |
