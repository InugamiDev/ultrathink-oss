---
name: testing-patterns
description: Design and implement test suites using unit, integration, e2e, and property-based testing patterns with framework-appropriate tooling
layer: utility
category: quality-assurance
triggers:
  - "test this"
  - "write tests"
  - "testing strategy"
  - "unit test"
  - "integration test"
  - "e2e test"
  - "property-based test"
  - "test coverage"
  - "test patterns"
inputs:
  - Code or module to test
  - Testing framework in use (Vitest, Jest, Playwright, Cypress, pytest)
  - Coverage requirements
  - Type of test needed (unit, integration, e2e, property)
outputs:
  - Test files with well-structured test suites
  - Test configuration if missing
  - Mocking strategy recommendations
  - Coverage analysis and gap identification
linksTo:
  - code-explainer
  - debug
  - performance-profiler
linkedFrom:
  - code-review
  - ship
  - fix
preferredNextSkills:
  - code-review
  - ship
fallbackSkills:
  - debug
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates test files
  - May add test dependencies to package.json
  - May create or modify test configuration files
---

# Testing Patterns Skill

## Purpose

Write tests that catch real bugs, not tests that pass for the sake of coverage. This skill produces meaningful test suites using the right testing pattern for each scenario — from fast unit tests for pure logic to end-to-end tests for critical user flows.

## Key Concepts

### The Testing Pyramid

```
        /  E2E  \          ← Few, slow, high confidence
       / Integration \      ← Moderate count, test boundaries
      /    Unit Tests   \   ← Many, fast, isolated
     /  Static Analysis  \  ← Types, linting (free)
    ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
```

### Test Type Decision Matrix

| Question | Yes → | No → |
|----------|-------|------|
| Does it involve a single function/class with no I/O? | Unit test | ↓ |
| Does it cross a boundary (DB, API, file system)? | Integration test | ↓ |
| Does it involve multiple services/systems? | E2e test | ↓ |
| Can the behavior be described as a mathematical property? | Property-based test | Unit test |

### Testing Principles

1. **Test behavior, not implementation** — Tests should survive refactors
2. **Arrange-Act-Assert (AAA)** — Every test has exactly three phases
3. **One assertion per concept** — Multiple asserts are fine if they test one logical thing
4. **Test names describe the scenario** — `it('returns 404 when user does not exist')` not `it('test getUserById')`
5. **No test interdependence** — Each test runs in isolation
6. **Deterministic** — No flaky tests. Mock time, randomness, and external services.

## Patterns

### Pattern 1: Unit Tests

For pure functions, state machines, validators, transformers.

```typescript
// src/utils/price.ts
export function calculateDiscount(price: number, discountPercent: number): number {
  if (price < 0) throw new Error('Price cannot be negative');
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount must be between 0 and 100');
  }
  return Math.round((price * (1 - discountPercent / 100)) * 100) / 100;
}

// src/utils/__tests__/price.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from '../price';

describe('calculateDiscount', () => {
  it('applies percentage discount correctly', () => {
    expect(calculateDiscount(100, 20)).toBe(80);
  });

  it('handles zero discount', () => {
    expect(calculateDiscount(50, 0)).toBe(50);
  });

  it('handles 100% discount', () => {
    expect(calculateDiscount(50, 100)).toBe(0);
  });

  it('rounds to two decimal places', () => {
    expect(calculateDiscount(10, 33)).toBe(6.7);
  });

  it('throws for negative price', () => {
    expect(() => calculateDiscount(-10, 20)).toThrow('Price cannot be negative');
  });

  it('throws for discount outside 0-100 range', () => {
    expect(() => calculateDiscount(10, 150)).toThrow('Discount must be between 0 and 100');
    expect(() => calculateDiscount(10, -5)).toThrow('Discount must be between 0 and 100');
  });
});
```

### Pattern 2: Integration Tests

Test boundaries between modules, database queries, API routes.

```typescript
// __tests__/api/users.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp } from '../helpers/test-app';
import { seedDatabase, clearDatabase } from '../helpers/test-db';

describe('POST /api/users', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('creates a user with valid data', async () => {
    const response = await app.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  it('returns 409 when email already exists', async () => {
    await seedDatabase({ users: [{ email: 'taken@example.com', name: 'Existing' }] });

    const response = await app.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'taken@example.com',
        name: 'New User',
      }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('already exists');
  });

  it('returns 400 for invalid email format', async () => {
    const response = await app.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'not-an-email',
        name: 'Test User',
      }),
    });

    expect(response.status).toBe(400);
  });
});
```

### Pattern 3: End-to-End Tests

Test critical user flows through the real UI.

```typescript
// e2e/checkout.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('completes purchase for authenticated user', async ({ page }) => {
    // Arrange: Log in
    await page.goto('/login');
    await page.getByLabel('Email').fill('buyer@test.com');
    await page.getByLabel('Password').fill('testpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Act: Add item to cart and checkout
    await page.goto('/products/widget-pro');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');

    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();

    // Fill shipping
    await page.getByLabel('Address').fill('123 Test St');
    await page.getByLabel('City').fill('Testville');
    await page.getByRole('button', { name: 'Continue to Payment' }).click();

    // Complete payment (test mode)
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Assert: Order confirmation
    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
    await expect(page.getByTestId('order-number')).toBeVisible();
  });

  test('shows error for expired card', async ({ page }) => {
    // ... arrange ...
    await page.getByTestId('card-expiry').fill('01/20');
    await page.getByRole('button', { name: 'Place Order' }).click();
    await expect(page.getByText('Card is expired')).toBeVisible();
  });
});
```

### Pattern 4: Property-Based Tests

Test invariants that should hold for ALL inputs, not just examples.

```typescript
// Using fast-check with Vitest
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sortBy } from '../sort';
import { encode, decode } from '../codec';

describe('sortBy (property-based)', () => {
  it('output length equals input length', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        expect(sortBy(arr, (x) => x)).toHaveLength(arr.length);
      })
    );
  });

  it('output is sorted', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sortBy(arr, (x) => x);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
        }
      })
    );
  });

  it('is idempotent (sorting twice gives same result)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const once = sortBy(arr, (x) => x);
        const twice = sortBy(once, (x) => x);
        expect(twice).toEqual(once);
      })
    );
  });
});

describe('encode/decode roundtrip', () => {
  it('decode(encode(x)) === x for any string', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(decode(encode(input))).toBe(input);
      })
    );
  });
});
```

### Pattern 5: Snapshot Tests (Use Sparingly)

Good for: serialized output, component rendering, error messages.
Bad for: frequently changing UI, large objects.

```typescript
import { render } from '@testing-library/react';

it('renders error state correctly', () => {
  const { container } = render(<ErrorBanner message="Something failed" code={500} />);
  expect(container).toMatchSnapshot();
});

// Prefer inline snapshots for small outputs
it('formats error message correctly', () => {
  expect(formatError({ code: 404, path: '/users/1' })).toMatchInlineSnapshot(
    `"Not Found: /users/1"`
  );
});
```

## Mocking Strategy

### What to Mock

| Mock | Do Not Mock |
|------|-------------|
| External APIs | The code under test |
| Database (in unit tests) | Simple utility functions |
| Time (`Date.now`, timers) | Data structures |
| Randomness (`Math.random`) | Internal implementation details |
| File system (in unit tests) | Return values you control |

### Mocking Examples

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock a module
vi.mock('../services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'msg-123' }),
}));

// Mock time
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// Spy on a method
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... test ...
expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('failed'));
```

## Test Organization

```
src/
  utils/
    price.ts
    __tests__/
      price.test.ts          ← Unit tests co-located
  services/
    user-service.ts
    __tests__/
      user-service.test.ts   ← Unit tests
tests/
  integration/
    api-users.test.ts         ← Integration tests
  e2e/
    checkout.spec.ts          ← E2E tests (Playwright)
  helpers/
    test-app.ts               ← Shared test utilities
    test-db.ts
    fixtures/
      users.json              ← Test data
```

## Coverage Guidance

- **Target 80% line coverage** as a floor, not a ceiling
- **100% coverage on critical paths**: payments, auth, data mutations
- **Do not chase 100% overall** — diminishing returns after ~85%
- **Branch coverage matters more** than line coverage
- **Untested code is not "working code you haven't tested"** — it is code with unknown behavior

```json
// vitest.config.ts coverage settings
{
  "coverage": {
    "provider": "v8",
    "thresholds": {
      "lines": 80,
      "branches": 75,
      "functions": 80,
      "statements": 80
    },
    "exclude": [
      "**/*.d.ts",
      "**/*.config.*",
      "**/test/**",
      "**/types/**"
    ]
  }
}
```

## Anti-Patterns to Avoid

1. **Testing implementation details** — Don't assert that a private method was called; assert the output.
2. **Brittle selectors in e2e** — Use `data-testid`, `getByRole`, `getByLabel` — never CSS classes.
3. **Test interdependence** — If test B fails when test A is skipped, tests are coupled.
4. **Excessive mocking** — If you mock everything, you are testing your mocks.
5. **No negative tests** — Always test error paths, edge cases, and invalid inputs.
6. **Copy-paste tests** — Extract shared setup into `beforeEach` or helper functions.
