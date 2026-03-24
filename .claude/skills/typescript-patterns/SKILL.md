---
name: typescript-patterns
description: Advanced TypeScript patterns including branded types, discriminated unions, builder pattern, and type-level programming
layer: domain
category: frontend
triggers:
  - "branded type"
  - "discriminated union"
  - "builder pattern typescript"
  - "type-level programming"
  - "template literal types"
  - "conditional types"
  - "mapped types"
  - "type narrowing"
  - "nominal typing"
  - "type brand"
inputs:
  - "Type safety requirements for domain primitives"
  - "Complex type composition problems"
  - "Builder or fluent API design"
  - "Type-level computation needs"
outputs:
  - "Branded type definitions with constructor functions"
  - "Discriminated union hierarchies"
  - "Type-safe builder implementations"
  - "Advanced generic type utilities"
linksTo:
  - typescript-frontend
  - zod
  - api-designer
linkedFrom:
  - code-review
  - refactor
preferredNextSkills:
  - typescript-frontend
  - data-validation
  - api-designer
fallbackSkills:
  - typescript-frontend
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# TypeScript Advanced Patterns

## Purpose

Provide expert guidance on advanced TypeScript type system patterns that enforce correctness at compile time. Covers branded/nominal types for domain primitives, discriminated unions for exhaustive state modeling, the builder pattern for type-safe fluent APIs, and type-level programming with conditional, mapped, and template literal types.

## Key Patterns

### Branded Types

Use branded types to create nominal distinctions between structurally identical types, preventing accidental misuse of primitive values.

```typescript
// Define a brand symbol for each domain primitive
declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Domain primitives
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
type Email = Brand<string, "Email">;
type PositiveInt = Brand<number, "PositiveInt">;

// Smart constructors with runtime validation
function UserId(value: string): UserId {
  if (!value.match(/^usr_[a-z0-9]{12}$/)) {
    throw new Error(`Invalid UserId: ${value}`);
  }
  return value as UserId;
}

function Email(value: string): Email {
  if (!value.includes("@")) {
    throw new Error(`Invalid Email: ${value}`);
  }
  return value as Email;
}

function PositiveInt(value: number): PositiveInt {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid PositiveInt: ${value}`);
  }
  return value as PositiveInt;
}

// Compile-time safety: cannot mix branded types
function getUser(id: UserId): Promise<User> { /* ... */ }
function getOrder(id: OrderId): Promise<Order> { /* ... */ }

const userId = UserId("usr_abc123def456");
const orderId = OrderId("ord_xyz789ghi012");

getUser(userId);   // OK
getUser(orderId);  // Compile error: OrderId is not assignable to UserId
```

### Discriminated Unions

Model exhaustive state machines where the compiler ensures every variant is handled.

```typescript
// State machine for async data fetching
type AsyncState<T, E = Error> =
  | { status: "idle" }
  | { status: "loading"; startedAt: number }
  | { status: "success"; data: T; fetchedAt: number }
  | { status: "error"; error: E; retriesLeft: number };

// Exhaustive pattern matching helper
function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

function renderState<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case "idle":
      return "Ready to load";
    case "loading":
      return `Loading since ${state.startedAt}`;
    case "success":
      return `Got ${JSON.stringify(state.data)}`;
    case "error":
      return `Error: ${state.error.message} (${state.retriesLeft} retries left)`;
    default:
      return assertNever(state); // Compile error if a variant is missed
  }
}

// Domain events as discriminated unions
type DomainEvent =
  | { type: "ORDER_PLACED"; orderId: string; items: Item[]; total: number }
  | { type: "ORDER_SHIPPED"; orderId: string; trackingNumber: string }
  | { type: "ORDER_CANCELLED"; orderId: string; reason: string }
  | { type: "REFUND_ISSUED"; orderId: string; amount: number };

// Extract a specific event type
type OrderPlacedEvent = Extract<DomainEvent, { type: "ORDER_PLACED" }>;
```

### Builder Pattern

Type-safe builder that tracks which fields have been set at the type level.

```typescript
// Track required fields at the type level
type BuilderState = {
  hasHost: boolean;
  hasPort: boolean;
  hasDatabase: boolean;
};

type ConnectionConfig = {
  host: string;
  port: number;
  database: string;
  ssl?: boolean;
  poolSize?: number;
};

class ConnectionBuilder<S extends BuilderState = {
  hasHost: false;
  hasPort: false;
  hasDatabase: false;
}> {
  private config: Partial<ConnectionConfig> = {};

  host(value: string): ConnectionBuilder<S & { hasHost: true }> {
    this.config.host = value;
    return this as any;
  }

  port(value: number): ConnectionBuilder<S & { hasPort: true }> {
    this.config.port = value;
    return this as any;
  }

  database(value: string): ConnectionBuilder<S & { hasDatabase: true }> {
    this.config.database = value;
    return this as any;
  }

  ssl(value: boolean): ConnectionBuilder<S> {
    this.config.ssl = value;
    return this;
  }

  poolSize(value: number): ConnectionBuilder<S> {
    this.config.poolSize = value;
    return this;
  }

  // build() is only available when all required fields are set
  build(
    this: ConnectionBuilder<{ hasHost: true; hasPort: true; hasDatabase: true }>
  ): ConnectionConfig {
    return this.config as ConnectionConfig;
  }
}

// Usage
const config = new ConnectionBuilder()
  .host("localhost")
  .port(5432)
  .database("myapp")
  .ssl(true)
  .build(); // OK: all required fields set

const bad = new ConnectionBuilder()
  .host("localhost")
  .build(); // Compile error: port and database missing
```

### Type-Level Programming

Conditional types, mapped types, and template literal types for compile-time computation.

```typescript
// Deep readonly that works on nested objects
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// Path type for deep object access: "user.address.city"
type PathKeys<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: K | `${K}.${PathKeys<T[K], `${Prefix}${K}.`>}`;
    }[keyof T & string]
  : never;

type User = {
  name: string;
  address: { city: string; zip: string };
  tags: string[];
};

type UserPaths = PathKeys<User>;
// "name" | "address" | "address.city" | "address.zip" | "tags"

// Template literal types for route parameters
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type RouteParams = ExtractParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"

// Mapped type for API response wrappers
type ApiResponse<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
} & {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
```

## Best Practices

- **Prefer branded types over plain primitives** for domain values (IDs, emails, currencies) to catch misuse at compile time rather than runtime.
- **Use discriminated unions over class hierarchies** for modeling finite state -- they compose better with pattern matching and type narrowing.
- **Always include an `assertNever` default case** in switch statements over discriminated unions to catch missing variants after refactoring.
- **Keep type-level computation shallow** -- deeply recursive conditional types slow down the compiler and produce unreadable error messages.
- **Pair branded types with Zod schemas** for runtime validation at system boundaries, keeping the brand as the internal representation.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Casting directly to branded type | Bypasses validation, defeats the purpose | Always use a smart constructor function that validates |
| Missing `assertNever` in switches | Adding new union variants compiles silently | Add `default: return assertNever(x)` to every discriminated union switch |
| Overly deep recursive types | `Type instantiation is excessively deep` errors, IDE slowdowns | Limit recursion depth with a counter type parameter or flatten the structure |
| Builder returning `this` without type narrowing | `build()` is always callable even when required fields are missing | Use generic state tracking with conditional `this` parameter on `build()` |
| Template literal union explosion | Combining large unions via template literals creates thousands of types | Keep input unions small or use branded string types instead |
| Forgetting `as const` on literal objects | TypeScript widens `"loading"` to `string`, breaking discrimination | Use `as const` or explicit type annotations on discriminant values |
