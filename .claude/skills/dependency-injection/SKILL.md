---
name: dependency-injection
description: Dependency injection patterns — IoC containers, service registration, lifetime scoping, and testing.
layer: utility
category: architecture
triggers:
  - "dependency injection"
  - "IoC"
  - "inversion of control"
  - "DI container"
  - "service provider"
inputs:
  - "DI architecture decisions"
  - "Service registration and lifetime scoping"
  - "IoC container selection and configuration"
  - "Testing with dependency injection"
outputs:
  - "DI container setup and configuration"
  - "Service registration patterns"
  - "Lifetime management strategies"
  - "Testable architectures with DI"
linksTo:
  - nestjs
  - typescript-patterns
  - testing-patterns
linkedFrom: []
preferredNextSkills:
  - nestjs
  - typescript-patterns
  - testing-patterns
fallbackSkills: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Dependency Injection Patterns

## Purpose

Provide expert guidance on dependency injection (DI) and inversion of control (IoC) patterns including container configuration, service lifetimes, composition roots, and how DI enables testability. Covers both framework-based DI (NestJS, Angular) and standalone containers (tsyringe, inversify, awilix).

## Core Concepts

**Dependency Injection** inverts the control of dependency creation. Instead of a class creating its own dependencies, they are provided (injected) from the outside.

```typescript
// WITHOUT DI — tightly coupled, hard to test
class OrderService {
  private db = new PostgresDatabase(); // hardcoded dependency
  private mailer = new SmtpMailer();   // hardcoded dependency

  async createOrder(data: CreateOrderDto) {
    const order = await this.db.insert('orders', data);
    await this.mailer.send(data.email, 'Order confirmed');
    return order;
  }
}

// WITH DI — loosely coupled, easy to test
class OrderService {
  constructor(
    private readonly db: Database,     // interface, not implementation
    private readonly mailer: Mailer,   // interface, not implementation
  ) {}

  async createOrder(data: CreateOrderDto) {
    const order = await this.db.insert('orders', data);
    await this.mailer.send(data.email, 'Order confirmed');
    return order;
  }
}
```

## DI Patterns

### Constructor Injection (Preferred)

Dependencies provided via the constructor. Most explicit and testable:

```typescript
interface Logger {
  info(message: string): void;
  error(message: string, error?: Error): void;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly logger: Logger,
  ) {}

  async getUser(id: string): Promise<User> {
    this.logger.info(`Fetching user ${id}`);
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}
```

### Factory Pattern

When the dependency needs runtime parameters:

```typescript
interface ConnectionFactory {
  create(config: ConnectionConfig): Connection;
}

class DatabaseService {
  constructor(private readonly connectionFactory: ConnectionFactory) {}

  connect(config: ConnectionConfig) {
    return this.connectionFactory.create(config);
  }
}
```

### Strategy Pattern with DI

Inject different implementations based on context:

```typescript
interface PaymentProcessor {
  charge(amount: number, currency: string): Promise<PaymentResult>;
}

class StripeProcessor implements PaymentProcessor {
  async charge(amount: number, currency: string) { /* Stripe logic */ }
}

class PayPalProcessor implements PaymentProcessor {
  async charge(amount: number, currency: string) { /* PayPal logic */ }
}

// Register both, inject the one needed
class PaymentService {
  constructor(
    private readonly processors: Map<string, PaymentProcessor>,
  ) {}

  async processPayment(method: string, amount: number, currency: string) {
    const processor = this.processors.get(method);
    if (!processor) throw new Error(`Unknown payment method: ${method}`);
    return processor.charge(amount, currency);
  }
}
```

## Service Lifetimes

| Lifetime | Description | Use Case |
|----------|-------------|----------|
| **Singleton** | One instance for the entire app | Stateless services, config, loggers |
| **Transient** | New instance on every injection | Stateful services, request-specific logic |
| **Scoped** | One instance per scope (e.g., HTTP request) | Database connections, user context |

```typescript
// With tsyringe
import { container, singleton, injectable } from 'tsyringe';

@singleton() // one instance forever
class ConfigService {
  get(key: string): string { /* ... */ }
}

@injectable() // new instance each time (transient by default)
class RequestHandler {
  constructor(private config: ConfigService) {}
}

// Scoped — manually create child containers
const requestContainer = container.createChildContainer();
requestContainer.register('RequestContext', { useValue: { userId: '123' } });
```

## IoC Containers

### tsyringe (Lightweight, TypeScript-native)

```typescript
// container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';

// Register interfaces to implementations
container.register<Database>('Database', { useClass: PostgresDatabase });
container.register<Mailer>('Mailer', { useClass: SmtpMailer });
container.register<Logger>('Logger', { useClass: PinoLogger });

// Resolve
const orderService = container.resolve(OrderService);

// In the class — use @inject for interface tokens
import { injectable, inject } from 'tsyringe';

@injectable()
class OrderService {
  constructor(
    @inject('Database') private readonly db: Database,
    @inject('Mailer') private readonly mailer: Mailer,
  ) {}
}
```

### awilix (No decorators, function-oriented)

```typescript
// container.ts
import { createContainer, asClass, asFunction, Lifetime } from 'awilix';

const container = createContainer();

container.register({
  // Auto-resolve constructor params by name
  userRepository: asClass(PostgresUserRepository).singleton(),
  orderRepository: asClass(PostgresOrderRepository).singleton(),
  logger: asClass(PinoLogger).singleton(),
  userService: asClass(UserService).scoped(),
  orderService: asClass(OrderService).scoped(),

  // Factory registration
  dbConnection: asFunction(({ config }) =>
    createPool(config.databaseUrl)
  ).singleton(),
});

// Create scoped container per request
app.use((req, _res, next) => {
  req.scope = container.createScope();
  req.scope.register({ requestId: asValue(crypto.randomUUID()) });
  next();
});
```

### NestJS Built-in DI

```typescript
// NestJS handles DI via decorators and module metadata
@Module({
  providers: [
    UserService,
    // Custom provider with token
    { provide: 'MAILER', useClass: SmtpMailer },
    // Factory provider
    {
      provide: 'DB_POOL',
      useFactory: (config: ConfigService) => createPool(config.get('DATABASE_URL')),
      inject: [ConfigService],
    },
    // Value provider
    { provide: 'APP_VERSION', useValue: '1.0.0' },
  ],
})
export class UsersModule {}
```

## Composition Root

The composition root is the single place where the entire dependency graph is wired. Keep it at the app entry point:

```typescript
// src/main.ts — the composition root
import { container } from './container';

async function bootstrap() {
  // Register all implementations
  container.register<Database>('Database', { useClass: PostgresDatabase });
  container.register<Cache>('Cache', { useClass: RedisCache });
  container.register<Mailer>('Mailer', { useClass: ResendMailer });
  container.register<Logger>('Logger', { useClass: PinoLogger });

  // Resolve the root — all dependencies cascade
  const app = container.resolve(App);
  await app.start();
}

bootstrap();
```

**Rules for the composition root:**
- It is the ONLY place that references concrete implementations
- All other code depends on abstractions (interfaces/types)
- Easy to swap implementations for testing or different environments

## Testing with DI

**Unit tests — inject mocks directly:**

```typescript
describe('OrderService', () => {
  let service: OrderService;
  let mockDb: jest.Mocked<Database>;
  let mockMailer: jest.Mocked<Mailer>;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockMailer = {
      send: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Inject mocks via constructor — no container needed
    service = new OrderService(mockDb, mockMailer);
  });

  it('creates order and sends confirmation email', async () => {
    mockDb.insert.mockResolvedValue({ id: '1', status: 'created' });

    await service.createOrder({
      email: 'user@test.com',
      items: [{ productId: 'p1', qty: 2 }],
    });

    expect(mockDb.insert).toHaveBeenCalledWith('orders', expect.any(Object));
    expect(mockMailer.send).toHaveBeenCalledWith('user@test.com', 'Order confirmed');
  });
});
```

**Integration tests — override specific registrations:**

```typescript
describe('OrderService (integration)', () => {
  let testContainer: typeof container;

  beforeEach(() => {
    testContainer = container.createChildContainer();
    // Real DB, mock mailer
    testContainer.register<Mailer>('Mailer', { useClass: NoopMailer });
  });

  it('persists order to database', async () => {
    const service = testContainer.resolve(OrderService);
    const order = await service.createOrder({ /* ... */ });
    expect(order.id).toBeDefined();
  });
});
```

## Best Practices

1. **Depend on abstractions** — Inject interfaces, not concrete classes.
2. **Constructor injection only** — Avoid property injection and service locator pattern.
3. **Single composition root** — Wire everything in one place at app startup.
4. **Prefer singleton for stateless services** — Transient/scoped only when state is per-request.
5. **No `new` in business logic** — If a class creates its own dependencies, it cannot be tested in isolation.
6. **Avoid circular dependencies** — Restructure into a shared module or use events.
7. **Keep containers out of business logic** — Only the composition root touches the container.
8. **Use factory providers for runtime config** — When a dependency needs config values.
9. **Scope database connections per request** — Prevent connection leaks and enable per-request transactions.
10. **Test without the container** — Unit tests should inject mocks via constructor, no container needed.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Service locator anti-pattern | `container.resolve()` called inside business logic | Inject via constructor; only resolve at the composition root |
| Missing `reflect-metadata` | Decorator-based DI fails silently | Import `reflect-metadata` at app entry point |
| Circular dependency | Container throws at resolution time | Break the cycle with events, mediator, or `forwardRef()` |
| Overusing transient scope | High memory usage, GC pressure | Default to singleton; use transient only when stateful |
| Injecting concrete classes | Tight coupling, hard to mock | Define interfaces and inject those |
| Container in unit tests | Tests become slow integration tests | Inject mocks directly via constructor |
