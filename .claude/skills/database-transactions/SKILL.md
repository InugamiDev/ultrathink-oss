---
name: database-transactions
description: Transaction isolation levels, distributed transactions, saga pattern, optimistic/pessimistic locking, and ACID guarantees across SQL and NoSQL databases
layer: domain
category: database
triggers:
  - "transaction"
  - "isolation level"
  - "distributed transaction"
  - "saga pattern"
  - "optimistic locking"
  - "pessimistic locking"
  - "deadlock"
  - "two-phase commit"
  - "ACID"
  - "race condition database"
inputs:
  - Database engine(s) in use (Postgres, MySQL, MongoDB, etc.)
  - Concurrency requirements and expected throughput
  - Consistency vs availability trade-offs
  - Distributed system topology (single DB, multi-region, microservices)
outputs:
  - Transaction strategy with chosen isolation level
  - Implementation code with proper error handling and rollback
  - Locking strategy recommendations
  - Saga orchestration or choreography design
  - Deadlock prevention guidelines
linksTo:
  - postgresql
  - microservices
  - message-queues
  - redis
linkedFrom:
  - api-designer
  - optimize
  - debug
preferredNextSkills:
  - postgresql
  - message-queues
  - monitoring
fallbackSkills:
  - caching
  - debug
riskLevel: high
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Database Transactions Skill

## Purpose

Correct transaction handling is the difference between a system that works and one that silently corrupts data under load. This skill covers isolation levels, distributed transaction patterns (2PC, sagas), optimistic and pessimistic locking, and deadlock prevention. It prioritizes correctness first, then performance.

## Key Concepts

### ACID Properties

| Property | Meaning | Failure Mode Without It |
|----------|---------|------------------------|
| **Atomicity** | All or nothing | Partial writes leave inconsistent state |
| **Consistency** | DB moves from one valid state to another | Constraint violations, orphaned records |
| **Isolation** | Concurrent transactions don't interfere | Dirty reads, phantom reads, lost updates |
| **Durability** | Committed data survives crashes | Data loss on restart |

### Isolation Levels (Weakest to Strongest)

```
READ UNCOMMITTED   ──  Dirty reads possible (almost never use this)
READ COMMITTED     ──  Default in Postgres; no dirty reads
REPEATABLE READ    ──  Default in MySQL InnoDB; no non-repeatable reads
SERIALIZABLE       ──  Full isolation; transactions behave as if sequential
```

**Postgres Isolation Behavior:**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
|-------|-----------|--------------------|--------------|-----------------------|
| Read Committed | No | Possible | Possible | Possible |
| Repeatable Read | No | No | No (in PG) | Possible |
| Serializable | No | No | No | No |

## Workflow

### Step 1: Determine Consistency Requirements

```
Is this a financial transaction or inventory decrement?
  -> Serializable or explicit locking

Is this a read-heavy dashboard query?
  -> Read Committed is fine

Are multiple services writing to the same resource?
  -> Distributed transaction pattern (saga)

Is this a user-facing update with low contention?
  -> Optimistic locking with version column
```

### Step 2: Implement the Appropriate Pattern

#### Basic Transaction with Proper Error Handling (Postgres + Drizzle)

```typescript
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

async function transferFunds(
  fromId: string,
  toId: string,
  amount: number
): Promise<void> {
  await db.transaction(async (tx) => {
    // Always acquire locks in consistent order to prevent deadlocks
    const [from, to] = fromId < toId
      ? [
          await tx.select().from(accounts).where(eq(accounts.id, fromId)).for('update'),
          await tx.select().from(accounts).where(eq(accounts.id, toId)).for('update'),
        ]
      : [
          // Reverse select order but keep variable assignment correct
          ...(await (async () => {
            const t = await tx.select().from(accounts).where(eq(accounts.id, toId)).for('update');
            const f = await tx.select().from(accounts).where(eq(accounts.id, fromId)).for('update');
            return [f, t] as const;
          })()),
        ];

    if (!from[0] || !to[0]) {
      throw new Error('Account not found');
    }

    if (from[0].balance < amount) {
      throw new Error('Insufficient funds');
    }

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.id, fromId));

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, toId));
  });
}
```

#### Optimistic Locking with Version Column

```typescript
import { eq, and } from 'drizzle-orm';

// Schema includes a `version` integer column
async function updateProductPrice(
  productId: string,
  newPrice: number,
  expectedVersion: number
): Promise<boolean> {
  const result = await db.update(products)
    .set({
      price: newPrice,
      version: expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, productId),
        eq(products.version, expectedVersion) // Only update if version matches
      )
    )
    .returning();

  if (result.length === 0) {
    // Version mismatch — another transaction modified this row
    // Caller should re-read and retry or inform the user
    return false;
  }

  return true;
}

// Retry wrapper for optimistic locking
async function withOptimisticRetry<T>(
  fn: () => Promise<T | null>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fn();
    if (result !== null) return result;
    // Exponential backoff with jitter
    await new Promise((r) =>
      setTimeout(r, Math.random() * 50 * Math.pow(2, attempt))
    );
  }
  throw new Error('Optimistic locking failed after max retries');
}
```

#### Pessimistic Locking (SELECT FOR UPDATE)

```typescript
// Use when contention is HIGH and you want to block rather than retry
async function decrementInventory(
  productId: string,
  quantity: number
): Promise<void> {
  await db.transaction(async (tx) => {
    // Lock the row — other transactions will WAIT here
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .for('update');

    if (!product) throw new Error('Product not found');
    if (product.stock < quantity) throw new Error('Insufficient stock');

    await tx.update(products)
      .set({ stock: product.stock - quantity })
      .where(eq(products.id, productId));
  });
}

// FOR UPDATE SKIP LOCKED — great for job queues
async function claimNextJob(): Promise<Job | null> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'pending'))
      .orderBy(jobs.createdAt)
      .limit(1)
      .for('update', { skipLocked: true }); // Skip rows locked by other workers

    if (!job) return null;

    await tx.update(jobs)
      .set({ status: 'processing', claimedAt: new Date() })
      .where(eq(jobs.id, job.id));

    return job;
  });
}
```

#### Raw SQL Transaction with Serializable Isolation (Postgres)

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Idempotent insert: create account summary or update it
INSERT INTO account_summaries (account_id, total_transactions, total_amount)
SELECT
  account_id,
  COUNT(*),
  SUM(amount)
FROM transactions
WHERE account_id = $1
  AND processed = false
GROUP BY account_id
ON CONFLICT (account_id) DO UPDATE SET
  total_transactions = account_summaries.total_transactions + EXCLUDED.total_transactions,
  total_amount = account_summaries.total_amount + EXCLUDED.total_amount;

UPDATE transactions SET processed = true WHERE account_id = $1 AND processed = false;

COMMIT;
-- On serialization failure (SQLSTATE 40001), the application MUST retry
```

### Step 3: Distributed Transactions — The Saga Pattern

When transactions span multiple services, traditional ACID is not possible. Use sagas instead.

#### Choreography-Based Saga (Event-Driven)

```typescript
// Each service listens for events and emits compensating events on failure
// Order Service
async function createOrder(orderData: OrderInput) {
  const order = await db.insert(orders).values({
    ...orderData,
    status: 'pending',
  }).returning();

  // Emit event — payment service listens
  await messageQueue.publish('order.created', {
    orderId: order[0].id,
    amount: orderData.total,
    customerId: orderData.customerId,
  });

  return order[0];
}

// Payment Service (listening to order.created)
async function handleOrderCreated(event: OrderCreatedEvent) {
  try {
    const payment = await processPayment(event.customerId, event.amount);
    await messageQueue.publish('payment.completed', {
      orderId: event.orderId,
      paymentId: payment.id,
    });
  } catch (error) {
    // Compensating action: tell order service to cancel
    await messageQueue.publish('payment.failed', {
      orderId: event.orderId,
      reason: error.message,
    });
  }
}
```

#### Orchestration-Based Saga (Central Coordinator)

```typescript
interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<T>;
  compensate: (context: T) => Promise<void>;
}

class SagaOrchestrator<T> {
  private steps: SagaStep<T>[] = [];
  private completedSteps: SagaStep<T>[] = [];

  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  async execute(initialContext: T): Promise<T> {
    let context = initialContext;

    for (const step of this.steps) {
      try {
        context = await step.execute(context);
        this.completedSteps.push(step);
      } catch (error) {
        // Compensate in reverse order
        console.error(`Saga failed at step "${step.name}":`, error);
        await this.compensate(context);
        throw new Error(`Saga failed at "${step.name}": ${error.message}`);
      }
    }

    return context;
  }

  private async compensate(context: T): Promise<void> {
    for (const step of [...this.completedSteps].reverse()) {
      try {
        await step.compensate(context);
      } catch (compError) {
        console.error(`Compensation failed for "${step.name}":`, compError);
        // Log for manual intervention — do NOT throw
      }
    }
  }
}

// Usage
const orderSaga = new SagaOrchestrator<OrderContext>()
  .addStep({
    name: 'reserve-inventory',
    execute: async (ctx) => {
      ctx.reservationId = await inventoryService.reserve(ctx.items);
      return ctx;
    },
    compensate: async (ctx) => {
      await inventoryService.release(ctx.reservationId);
    },
  })
  .addStep({
    name: 'charge-payment',
    execute: async (ctx) => {
      ctx.paymentId = await paymentService.charge(ctx.customerId, ctx.total);
      return ctx;
    },
    compensate: async (ctx) => {
      await paymentService.refund(ctx.paymentId);
    },
  })
  .addStep({
    name: 'create-shipment',
    execute: async (ctx) => {
      ctx.shipmentId = await shippingService.create(ctx.address, ctx.items);
      return ctx;
    },
    compensate: async (ctx) => {
      await shippingService.cancel(ctx.shipmentId);
    },
  });

await orderSaga.execute({ customerId, items, total, address });
```

## Best Practices

1. **Always order lock acquisition** — Acquire locks on rows/tables in a consistent order (e.g., by ID ascending) to prevent deadlocks.
2. **Keep transactions short** — Long transactions hold locks and block other queries. Do all non-DB work (API calls, file I/O) outside the transaction.
3. **Use the weakest isolation level that is correct** — Serializable is safest but slowest. Read Committed is sufficient for most CRUD operations.
4. **Retry serialization failures** — Postgres SERIALIZABLE isolation will throw error code `40001` on conflicts. Your application must catch and retry.
5. **Prefer optimistic locking for low-contention writes** — A version column is cheaper than holding row locks when conflicts are rare.
6. **Design sagas with idempotent steps** — Compensations and retries may fire multiple times. Every step must be safe to re-run.
7. **Set statement_timeout in Postgres** — Prevent runaway transactions: `SET statement_timeout = '5s';`
8. **Monitor lock waits** — Query `pg_stat_activity` for `wait_event_type = 'Lock'` to detect contention.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **Deadlock from inconsistent lock order** | `ERROR: deadlock detected` | Always lock rows in a deterministic order (e.g., sort by PK) |
| **Long-running transaction holding locks** | Other queries timeout or queue up | Move non-DB work outside the transaction; set `idle_in_transaction_session_timeout` |
| **Lost update (no locking)** | Two users edit the same row, last write wins silently | Add a `version` column and use optimistic locking |
| **Saga without idempotency** | Double-charge on retry, duplicate inventory deduction | Use idempotency keys; make every saga step re-runnable |
| **Catching errors inside transaction without re-throwing** | Transaction commits despite a failed step | Always re-throw or explicitly call `tx.rollback()` |
| **N+1 lock acquisition** | Locking rows one at a time in a loop causes serialization failures | Batch lock acquisition: `SELECT ... WHERE id IN (...) FOR UPDATE` |
| **Using SERIALIZABLE everywhere** | Massive retry overhead, throughput collapse | Reserve SERIALIZABLE for financial/inventory operations; use Read Committed elsewhere |
| **Forgetting to handle serialization retries** | App crashes on `40001` errors under load | Wrap serializable transactions in a retry loop with exponential backoff |
