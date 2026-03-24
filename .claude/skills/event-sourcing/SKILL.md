---
name: event-sourcing
description: Design event-sourced systems with CQRS — event stores, aggregate roots, projections, snapshots, and replay for auditable, scalable domain architectures
layer: domain
category: backend
triggers:
  - "event sourcing"
  - "event store"
  - "CQRS"
  - "event-driven architecture"
  - "audit log"
  - "projection"
  - "aggregate root"
  - "event replay"
  - "snapshot"
  - "domain events"
inputs:
  - Domain and aggregate boundaries
  - Consistency requirements (strong vs. eventual)
  - Query patterns (read:write ratio, required projections)
  - Infrastructure (PostgreSQL, EventStoreDB, Kafka)
  - Scale expectations (events/sec, total event count)
outputs:
  - Event schema definitions and versioning strategy
  - Event store implementation (append-only log)
  - Aggregate root with command handling
  - Projection builders for read models
  - Snapshot strategy for performance
  - Replay and migration tooling
linksTo:
  - message-queues
  - postgresql
  - microservices
  - api-designer
linkedFrom:
  - microservices
  - api-designer
preferredNextSkills:
  - message-queues
  - testing-patterns
fallbackSkills:
  - postgresql
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Event Sourcing Skill

## Purpose

Event sourcing stores every state change as an immutable event in an append-only log, rather than storing only the current state. The current state is derived by replaying events. Combined with CQRS (Command Query Responsibility Segregation), this pattern enables complete audit trails, temporal queries ("what was the state at time T?"), and independent scaling of reads and writes. It is the correct architecture when auditability, traceability, or complex domain logic are primary requirements.

## Key Concepts

### Event Sourcing vs. Traditional CRUD

```
CRUD:                              Event Sourcing:
┌─────────────────┐                ┌──────────────────────────────────┐
│  orders table    │                │  events table (append-only)      │
│  id: 1           │                │  1: OrderCreated { items: [...] }│
│  status: shipped │                │  2: PaymentReceived { amount }   │
│  total: $99      │                │  3: OrderShipped { trackingId }  │
│  (current only)  │                │  (full history preserved)        │
└─────────────────┘                └──────────────────────────────────┘
                                    Current state = replay(events)
```

### CQRS Pattern

```
Commands (writes)          Queries (reads)
     │                          │
     ▼                          ▼
┌──────────┐             ┌──────────────┐
│ Command  │             │  Read Model  │
│ Handler  │             │  (Projection)│
└────┬─────┘             └──────┬───────┘
     │                          │
     ▼                          ▼
┌──────────┐             ┌──────────────┐
│  Event   │───events───→│  Projection  │
│  Store   │             │  Builder     │
└──────────┘             └──────────────┘
```

### Core Terminology

| Term | Definition |
|------|-----------|
| **Event** | Immutable fact that something happened. Past tense: `OrderPlaced`, `PaymentReceived` |
| **Aggregate** | Consistency boundary that produces events from commands |
| **Command** | Intent to change state: `PlaceOrder`, `CancelOrder` |
| **Projection** | Read model built by processing events sequentially |
| **Snapshot** | Cached aggregate state at a point in time to avoid full replay |
| **Event Store** | Append-only database of events, ordered per aggregate |

## Implementation

### Event Definitions (TypeScript)

```typescript
// events.ts — Define all domain events as discriminated union
interface BaseEvent {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

interface OrderCreated extends BaseEvent {
  type: 'OrderCreated';
  payload: {
    customerId: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
    currency: string;
  };
}

interface PaymentReceived extends BaseEvent {
  type: 'PaymentReceived';
  payload: {
    paymentId: string;
    amount: number;
    method: 'card' | 'bank_transfer' | 'wallet';
  };
}

interface OrderShipped extends BaseEvent {
  type: 'OrderShipped';
  payload: {
    trackingId: string;
    carrier: string;
    estimatedDelivery: string;
  };
}

interface OrderCancelled extends BaseEvent {
  type: 'OrderCancelled';
  payload: {
    reason: string;
    cancelledBy: string;
  };
}

type OrderEvent = OrderCreated | PaymentReceived | OrderShipped | OrderCancelled;
```

### Event Store (PostgreSQL)

```sql
-- Append-only event store table
CREATE TABLE events (
  event_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id   UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type     VARCHAR(100) NOT NULL,
  version        INTEGER NOT NULL,
  payload        JSONB NOT NULL,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optimistic concurrency: no two events for the same aggregate at the same version
  UNIQUE (aggregate_id, version)
);

CREATE INDEX idx_events_aggregate ON events (aggregate_id, version);
CREATE INDEX idx_events_type ON events (event_type, created_at);

-- Snapshot table for performance
CREATE TABLE snapshots (
  aggregate_id   UUID PRIMARY KEY,
  aggregate_type VARCHAR(100) NOT NULL,
  version        INTEGER NOT NULL,
  state          JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```typescript
// event-store.ts
import { Pool } from 'pg';

interface StoredEvent {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class PostgresEventStore {
  constructor(private pool: Pool) {}

  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: Array<{ type: string; payload: Record<string, unknown> }>,
    expectedVersion: number
  ): Promise<StoredEvent[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Optimistic concurrency check
      const { rows } = await client.query(
        'SELECT MAX(version) as max_version FROM events WHERE aggregate_id = $1',
        [aggregateId]
      );
      const currentVersion = rows[0].max_version ?? 0;

      if (currentVersion !== expectedVersion) {
        throw new ConcurrencyError(
          `Expected version ${expectedVersion}, but aggregate is at version ${currentVersion}`
        );
      }

      const stored: StoredEvent[] = [];

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const version = expectedVersion + i + 1;

        const result = await client.query(
          `INSERT INTO events (aggregate_id, aggregate_type, event_type, version, payload, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [aggregateId, aggregateType, event.type, version, event.payload, {}]
        );

        stored.push(this.mapRow(result.rows[0]));
      }

      await client.query('COMMIT');
      return stored;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(aggregateId: string, afterVersion = 0): Promise<StoredEvent[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM events WHERE aggregate_id = $1 AND version > $2 ORDER BY version',
      [aggregateId, afterVersion]
    );
    return rows.map(this.mapRow);
  }

  async getAllEvents(afterTimestamp?: Date, limit = 1000): Promise<StoredEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM events
       WHERE ($1::timestamptz IS NULL OR created_at > $1)
       ORDER BY created_at, version
       LIMIT $2`,
      [afterTimestamp ?? null, limit]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): StoredEvent {
    return {
      eventId: row.event_id as string,
      aggregateId: row.aggregate_id as string,
      aggregateType: row.aggregate_type as string,
      eventType: row.event_type as string,
      version: row.version as number,
      payload: row.payload as Record<string, unknown>,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at as Date,
    };
  }
}

class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}
```

### Aggregate Root

```typescript
// order-aggregate.ts
type OrderStatus = 'created' | 'paid' | 'shipped' | 'cancelled';

interface OrderState {
  id: string;
  status: OrderStatus;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
  paidAmount: number;
  version: number;
}

export class OrderAggregate {
  private state: OrderState;
  private uncommittedEvents: OrderEvent[] = [];

  private constructor(state: OrderState) {
    this.state = state;
  }

  // Rehydrate from event history
  static fromEvents(events: OrderEvent[]): OrderAggregate {
    const initial: OrderState = {
      id: '',
      status: 'created',
      customerId: '',
      items: [],
      totalAmount: 0,
      paidAmount: 0,
      version: 0,
    };

    const aggregate = new OrderAggregate(initial);
    for (const event of events) {
      aggregate.apply(event);
    }
    return aggregate;
  }

  // Command: create order
  static create(
    orderId: string,
    customerId: string,
    items: Array<{ productId: string; quantity: number; price: number }>
  ): OrderAggregate {
    const aggregate = new OrderAggregate({
      id: '',
      status: 'created',
      customerId: '',
      items: [],
      totalAmount: 0,
      paidAmount: 0,
      version: 0,
    });

    aggregate.raise({
      type: 'OrderCreated',
      payload: {
        customerId,
        items,
        currency: 'USD',
      },
    } as OrderCreated);

    return aggregate;
  }

  // Command: receive payment
  receivePayment(paymentId: string, amount: number, method: 'card' | 'bank_transfer' | 'wallet') {
    if (this.state.status === 'cancelled') {
      throw new Error('Cannot accept payment for cancelled order');
    }
    if (this.state.status === 'paid') {
      throw new Error('Order is already paid');
    }

    this.raise({
      type: 'PaymentReceived',
      payload: { paymentId, amount, method },
    } as PaymentReceived);
  }

  // Command: ship order
  ship(trackingId: string, carrier: string, estimatedDelivery: string) {
    if (this.state.status !== 'paid') {
      throw new Error(`Cannot ship order in status: ${this.state.status}`);
    }

    this.raise({
      type: 'OrderShipped',
      payload: { trackingId, carrier, estimatedDelivery },
    } as OrderShipped);
  }

  // Command: cancel order
  cancel(reason: string, cancelledBy: string) {
    if (this.state.status === 'shipped') {
      throw new Error('Cannot cancel shipped order');
    }

    this.raise({
      type: 'OrderCancelled',
      payload: { reason, cancelledBy },
    } as OrderCancelled);
  }

  // Apply event to state (the ONLY place state changes)
  private apply(event: OrderEvent) {
    switch (event.type) {
      case 'OrderCreated':
        this.state.id = event.aggregateId;
        this.state.customerId = event.payload.customerId;
        this.state.items = event.payload.items;
        this.state.totalAmount = event.payload.items.reduce(
          (sum, item) => sum + item.price * item.quantity, 0
        );
        this.state.status = 'created';
        break;

      case 'PaymentReceived':
        this.state.paidAmount += event.payload.amount;
        if (this.state.paidAmount >= this.state.totalAmount) {
          this.state.status = 'paid';
        }
        break;

      case 'OrderShipped':
        this.state.status = 'shipped';
        break;

      case 'OrderCancelled':
        this.state.status = 'cancelled';
        break;
    }

    this.state.version = event.version;
  }

  private raise(event: Partial<OrderEvent>) {
    const fullEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      aggregateId: this.state.id,
      aggregateType: 'Order',
      version: this.state.version + this.uncommittedEvents.length + 1,
      timestamp: new Date(),
      metadata: {},
    } as OrderEvent;

    this.apply(fullEvent);
    this.uncommittedEvents.push(fullEvent);
  }

  getUncommittedEvents(): OrderEvent[] {
    return [...this.uncommittedEvents];
  }

  clearUncommittedEvents() {
    this.uncommittedEvents = [];
  }

  get currentState(): Readonly<OrderState> {
    return { ...this.state };
  }
}
```

### Projections (Read Models)

```typescript
// projections/order-summary.ts
interface OrderSummaryView {
  orderId: string;
  customerId: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  trackingId: string | null;
  createdAt: Date;
  lastUpdatedAt: Date;
}

export class OrderSummaryProjection {
  constructor(private pool: Pool) {}

  async handle(event: OrderEvent): Promise<void> {
    switch (event.type) {
      case 'OrderCreated':
        await this.pool.query(
          `INSERT INTO order_summaries
           (order_id, customer_id, status, total_amount, item_count, created_at, last_updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6)`,
          [
            event.aggregateId,
            event.payload.customerId,
            'created',
            event.payload.items.reduce((s, i) => s + i.price * i.quantity, 0),
            event.payload.items.length,
            event.timestamp,
          ]
        );
        break;

      case 'PaymentReceived':
        await this.pool.query(
          `UPDATE order_summaries SET status = 'paid', last_updated_at = $2
           WHERE order_id = $1`,
          [event.aggregateId, event.timestamp]
        );
        break;

      case 'OrderShipped':
        await this.pool.query(
          `UPDATE order_summaries
           SET status = 'shipped', tracking_id = $2, last_updated_at = $3
           WHERE order_id = $1`,
          [event.aggregateId, event.payload.trackingId, event.timestamp]
        );
        break;

      case 'OrderCancelled':
        await this.pool.query(
          `UPDATE order_summaries SET status = 'cancelled', last_updated_at = $2
           WHERE order_id = $1`,
          [event.aggregateId, event.timestamp]
        );
        break;
    }
  }

  // Rebuild projection from scratch by replaying all events
  async rebuild(eventStore: PostgresEventStore): Promise<void> {
    await this.pool.query('TRUNCATE order_summaries');

    let lastTimestamp: Date | undefined;
    let batch: StoredEvent[];

    do {
      batch = await eventStore.getAllEvents(lastTimestamp, 1000);
      for (const event of batch) {
        await this.handle(event as unknown as OrderEvent);
      }
      if (batch.length > 0) {
        lastTimestamp = batch[batch.length - 1].createdAt;
      }
    } while (batch.length === 1000);
  }
}
```

### Snapshots

```typescript
// snapshot-store.ts
export class SnapshotStore {
  constructor(private pool: Pool) {}

  async save(aggregateId: string, aggregateType: string, version: number, state: unknown) {
    await this.pool.query(
      `INSERT INTO snapshots (aggregate_id, aggregate_type, version, state)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (aggregate_id) DO UPDATE
       SET version = $3, state = $4, created_at = NOW()`,
      [aggregateId, aggregateType, version, JSON.stringify(state)]
    );
  }

  async load(aggregateId: string): Promise<{ version: number; state: unknown } | null> {
    const { rows } = await this.pool.query(
      'SELECT version, state FROM snapshots WHERE aggregate_id = $1',
      [aggregateId]
    );
    return rows[0] ? { version: rows[0].version, state: rows[0].state } : null;
  }
}

// Usage: load aggregate with snapshot optimization
async function loadOrder(orderId: string): Promise<OrderAggregate> {
  const snapshot = await snapshotStore.load(orderId);
  const afterVersion = snapshot?.version ?? 0;

  const events = await eventStore.getEvents(orderId, afterVersion);

  // If snapshot exists, start from snapshot state; otherwise replay all events
  if (snapshot) {
    return OrderAggregate.fromSnapshot(snapshot.state, events);
  }

  return OrderAggregate.fromEvents(events);
}
```

### Event Versioning (Schema Evolution)

```typescript
// Upcast old event versions to current format
type EventUpcaster = (event: StoredEvent) => StoredEvent;

const upcasters: Record<string, EventUpcaster[]> = {
  'OrderCreated': [
    // v1 → v2: added currency field
    (event) => {
      if (!event.payload.currency) {
        return { ...event, payload: { ...event.payload, currency: 'USD' } };
      }
      return event;
    },
  ],
};

function upcastEvent(event: StoredEvent): StoredEvent {
  const casters = upcasters[event.eventType] ?? [];
  return casters.reduce((e, upcast) => upcast(e), event);
}
```

## Best Practices

1. **Name events in past tense.** Events represent facts that already happened: `OrderCreated`, not `CreateOrder`. Commands are imperative: `CreateOrder`.
2. **Events are immutable.** Never modify or delete events. Use compensating events (`OrderCancelled`) to reverse a previous event's effect.
3. **Keep aggregates small.** An aggregate with thousands of events is slow to rehydrate. Use snapshots every ~100 events or when replay exceeds 50ms.
4. **Version your events from day one.** Event schemas will change. Use upcasters to transform old events to the current format on read.
5. **Projections are disposable.** They can always be rebuilt from the event log. Do not treat projection tables as the source of truth.
6. **Use optimistic concurrency** on the event store. The `(aggregate_id, version)` unique constraint prevents two concurrent commands from producing conflicting events.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Events too granular | Thousands of tiny events per aggregate, slow replay | Combine related changes into meaningful domain events |
| Events too coarse | `OrderUpdated` with entire state diff — loses meaning | Each event should represent a single domain-meaningful action |
| Missing optimistic concurrency | Lost updates when two commands modify same aggregate | Add `(aggregate_id, version)` unique constraint; retry on conflict |
| Projection treated as source of truth | Data loss when projection DB fails | Always rebuild projections from event store; never write to event store from projection |
| No snapshot strategy | Aggregates with 10K+ events take seconds to load | Snapshot every N events or on a time schedule |
| Coupling projections to event store writes | Event store write fails if projection is down | Project asynchronously; use outbox pattern or CDC |
| No event versioning | Old events break new code after schema change | Implement upcasters from the start; include schema version in event metadata |
| Giant aggregate boundaries | Contention and serialization bottleneck | Split into smaller aggregates; use sagas for cross-aggregate coordination |
