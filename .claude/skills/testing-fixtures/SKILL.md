---
name: testing-fixtures
description: Test fixture patterns — factories, builders, seeders, snapshot testing, and test data management.
layer: domain
category: testing
triggers:
  - "test fixture"
  - "factory pattern"
  - "test builder"
  - "snapshot test"
  - "test data"
  - "faker"
inputs:
  - "Test data generation requirements"
  - "Factory or builder pattern questions"
  - "Snapshot testing configuration"
  - "Database seeding for tests"
outputs:
  - "Type-safe factory implementations"
  - "Builder patterns for complex test objects"
  - "Snapshot testing configurations"
  - "Test data management strategies"
linksTo:
  - testing-patterns
  - database-seeding
  - vitest
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Testing Fixtures

## Purpose

Build maintainable, type-safe test data infrastructure. Covers factory functions, the builder pattern, faker integration, snapshot testing, database fixtures, and strategies for managing test data at scale.

## Key Patterns

### Factory Functions

**Basic factory** — Generate valid test objects with sensible defaults:

```typescript
import { faker } from '@faker-js/faker';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
  metadata: Record<string, unknown>;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: Date;
}

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

// Factory with override support
function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'user',
    createdAt: faker.date.recent({ days: 30 }),
    metadata: {},
    ...overrides,
  };
}

function createOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  const price = faker.number.float({ min: 1, max: 500, fractionDigits: 2 });
  return {
    productId: faker.string.uuid(),
    name: faker.commerce.productName(),
    quantity: faker.number.int({ min: 1, max: 5 }),
    price,
    ...overrides,
  };
}

function createOrder(overrides: Partial<Order> = {}): Order {
  const items = overrides.items ?? [createOrderItem(), createOrderItem()];
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: 'pending',
    createdAt: faker.date.recent({ days: 7 }),
    ...overrides,
  };
}

// Usage in tests
describe('OrderService', () => {
  it('should calculate total correctly', () => {
    const order = createOrder({
      items: [
        createOrderItem({ price: 10, quantity: 2 }),
        createOrderItem({ price: 25, quantity: 1 }),
      ],
    });

    expect(order.total).toBe(45);
  });

  it('should process admin orders immediately', () => {
    const admin = createUser({ role: 'admin' });
    const order = createOrder({ userId: admin.id });
    // ...
  });
});
```

### Builder Pattern

**Fluent builder** — For complex objects with many optional fields:

```typescript
class UserBuilder {
  private data: Partial<User> = {};

  static create(): UserBuilder {
    return new UserBuilder();
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  asAdmin(): this {
    this.data.role = 'admin';
    return this;
  }

  asViewer(): this {
    this.data.role = 'viewer';
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.data.metadata = metadata;
    return this;
  }

  build(): User {
    return createUser(this.data);
  }

  // Build multiple with variations
  buildMany(count: number, variator?: (builder: UserBuilder, index: number) => UserBuilder): User[] {
    return Array.from({ length: count }, (_, i) => {
      const builder = UserBuilder.create();
      Object.assign(builder, { data: { ...this.data } });
      return (variator ? variator(builder, i) : builder).build();
    });
  }
}

// Usage
const admin = UserBuilder.create().asAdmin().withName('Admin User').build();
const users = UserBuilder.create().buildMany(5, (b, i) => b.withName(`User ${i}`));
```

### Generic Factory System

```typescript
// A reusable factory registry
type FactoryFn<T> = (overrides?: Partial<T>) => T;

class FactoryRegistry {
  private factories = new Map<string, FactoryFn<any>>();

  define<T>(name: string, factory: FactoryFn<T>): void {
    this.factories.set(name, factory);
  }

  create<T>(name: string, overrides?: Partial<T>): T {
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Factory '${name}' not registered`);
    return factory(overrides);
  }

  createMany<T>(name: string, count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.create<T>(name, overrides));
  }
}

// Setup
const factory = new FactoryRegistry();
factory.define<User>('user', createUser);
factory.define<Order>('order', createOrder);

// Usage
const user = factory.create<User>('user', { role: 'admin' });
const orders = factory.createMany<Order>('order', 10, { status: 'confirmed' });
```

### Database Fixtures

**Setup and teardown** — Isolate test data with transactions:

```typescript
import { Pool } from 'pg';

// Transaction-based isolation
class TestDB {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  // Each test runs in a transaction that gets rolled back
  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET CONSTRAINTS ALL DEFERRED');
      const result = await fn(client);
      await client.query('ROLLBACK'); // Always rollback — test data never persists
      return result;
    } finally {
      client.release();
    }
  }

  // Seed helper for fixtures
  async seed(client: PoolClient, table: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const values = rows.map(
      (row, i) =>
        `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
    );
    const params = rows.flatMap((row) => columns.map((col) => row[col]));

    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')}`,
      params
    );
  }
}

// Usage in tests
const testDB = new TestDB(process.env.TEST_DATABASE_URL!);

describe('UserRepository', () => {
  it('should find user by email', async () => {
    await testDB.withTransaction(async (client) => {
      const user = createUser({ email: 'test@example.com' });
      await testDB.seed(client, 'users', [user]);

      const repo = new UserRepository(client);
      const found = await repo.findByEmail('test@example.com');
      expect(found?.id).toBe(user.id);
    });
  });
});
```

### Snapshot Testing

**Vitest snapshot testing:**

```typescript
import { describe, it, expect } from 'vitest';

describe('API response formatting', () => {
  it('should format user response correctly', () => {
    const user = createUser({
      id: 'usr_fixed_id',
      name: 'Jane Doe',
      email: 'jane@example.com',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const response = formatUserResponse(user);

    // First run creates snapshot; subsequent runs compare
    expect(response).toMatchSnapshot();
  });

  it('should format error response', () => {
    const error = formatErrorResponse(404, 'User not found');

    // Inline snapshot — stored in the test file
    expect(error).toMatchInlineSnapshot(`
      {
        "error": {
          "code": 404,
          "message": "User not found",
        },
        "success": false,
      }
    `);
  });
});

// Custom serializer for deterministic snapshots
expect.addSnapshotSerializer({
  test: (val) => val instanceof Date,
  serialize: (val) => `Date("${(val as Date).toISOString()}")`,
});
```

**Property-based snapshot strategies:**

```typescript
// Deterministic faker for reproducible snapshots
import { faker } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(42); // Same seed = same data every run
});

// Snapshot with custom matcher for volatile fields
function stableSnapshot(obj: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (key === 'id') return '[ID]';
      if (key === 'createdAt' || key === 'updatedAt') return '[TIMESTAMP]';
      return value;
    })
  );
}

it('should create order with correct structure', () => {
  const order = createOrder();
  expect(stableSnapshot(order)).toMatchSnapshot();
});
```

### Fixture Files

```typescript
// fixtures/users.ts — Shared across test suites
import { createUser } from '../factories/user';

export const fixtures = {
  admin: createUser({
    id: 'usr_admin',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
  }),
  regularUser: createUser({
    id: 'usr_regular',
    name: 'Regular User',
    email: 'user@example.com',
    role: 'user',
  }),
  viewer: createUser({
    id: 'usr_viewer',
    name: 'Viewer User',
    email: 'viewer@example.com',
    role: 'viewer',
  }),
} as const;

// Usage
import { fixtures } from '../fixtures/users';

it('should restrict admin actions for viewers', () => {
  expect(canPerformAdminAction(fixtures.viewer)).toBe(false);
  expect(canPerformAdminAction(fixtures.admin)).toBe(true);
});
```

### Related Entity Graphs

```typescript
// Build connected test data
function createOrderWithUser(overrides?: {
  user?: Partial<User>;
  order?: Partial<Order>;
}) {
  const user = createUser(overrides?.user);
  const order = createOrder({ userId: user.id, ...overrides?.order });
  return { user, order };
}

function createTeam(memberCount = 3) {
  const admin = createUser({ role: 'admin' });
  const members = Array.from({ length: memberCount }, () =>
    createUser({ role: 'user' })
  );
  const allUsers = [admin, ...members];
  const orders = allUsers.flatMap((u) => [
    createOrder({ userId: u.id }),
    createOrder({ userId: u.id }),
  ]);

  return { admin, members, allUsers, orders };
}

// Usage
it('should calculate team analytics', () => {
  const team = createTeam(5);
  const analytics = computeTeamAnalytics(team.allUsers, team.orders);
  expect(analytics.totalOrders).toBe(12);
});
```

## Best Practices

1. **Use factories, not raw object literals** — Factories provide defaults, reduce boilerplate, and make refactoring safer.
2. **Override only what the test cares about** — The factory provides sensible defaults; the test only sets the fields it is testing.
3. **Seed faker for reproducibility** — Call `faker.seed(42)` in `beforeEach` to get deterministic data across runs.
4. **Isolate database tests with transactions** — Wrap each test in a transaction and rollback; faster than truncating tables.
5. **Avoid shared mutable state** — Each test should create its own fixtures; never share mutable test data between tests.
6. **Stabilize snapshots** — Replace volatile fields (IDs, timestamps) with placeholders before snapshotting.
7. **Keep fixtures close to tests** — Co-locate fixtures with the test files that use them; extract to shared files only when reused across suites.
8. **Type your factories** — Use TypeScript generics to ensure factories return the correct types and overrides are valid.
9. **Build entity graphs for integration tests** — Create helper functions that build related entities together (user + orders + items).
10. **Review snapshot changes carefully** — Treat snapshot updates as code changes; do not blindly accept `--update`.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Random data without seed | Flaky tests that pass/fail unpredictably | Use `faker.seed()` for deterministic output |
| Shared fixtures mutated between tests | Test ordering dependencies | Create fresh fixtures in each test |
| Overly specific snapshots | Every minor change breaks many tests | Snapshot only the fields that matter; use inline snapshots |
| No factory for new models | Tests use raw object literals, drift from schema | Create a factory whenever you add a new model |
| Database cleanup in afterEach | Slow and error-prone | Use transaction rollback instead of truncation |
| Fixtures with hardcoded IDs | Collision when tests run in parallel | Use UUID factories; only hardcode IDs in named fixtures |
