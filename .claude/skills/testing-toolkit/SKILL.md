---
name: testing-toolkit
description: "Unified testing methodology toolkit — Testing Library (accessible queries, user-event, component testing), unit/integration/e2e/property-based testing patterns, test strategy design (pyramid/trophy/diamond, coverage goals), test fixtures (factories, builders, seeders, snapshots), API testing (Supertest, contract testing, endpoint validation). Keeps runtime-specific runners (vitest/playwright/cypress/promptfoo) separate."
layer: utility
category: testing
triggers: ["@testing-library", "api mock", "api test", "api testing", "contract testing", "e2e test", "endpoint testing", "factory pattern", "faker", "getByRole", "getByText", "integration test", "property-based test", "react testing library", "request spec", "screen queries", "snapshot test", "supertest", "test builder", "test coverage", "test coverage strategy", "test data", "test fixture", "test patterns", "test planning", "test pyramid", "test strategy", "test this", "testing library", "testing strategy", "testing trophy", "unit test", "user-event", "what to test", "write tests"]
---

# testing-toolkit

Unified testing methodology toolkit — Testing Library (accessible queries, user-event, component testing), unit/integration/e2e/property-based testing patterns, test strategy design (pyramid/trophy/diamond, coverage goals), test fixtures (factories, builders, seeders, snapshots), API testing (Supertest, contract testing, endpoint validation). Keeps runtime-specific runners (vitest/playwright/cypress/promptfoo) separate.


## Absorbs

- `testing-library`
- `testing-patterns`
- `testing-strategy`
- `testing-fixtures`
- `api-testing`


---

## From `testing-library`

> React Testing Library — accessibility-driven queries, user-event interactions, async testing, jest-dom matchers

# Testing Library Skill

## Purpose

React Testing Library enforces testing from the user's perspective. Query by role, text, and label — not implementation details. If you can't find an element with RTL queries, your users and screen readers can't either.

## Query Priority

| Priority | Query | When |
|----------|-------|------|
| 1 | `getByRole` | Buttons, links, headings, inputs — always first |
| 2 | `getByLabelText` | Form fields with labels |
| 3 | `getByText` | Non-interactive elements |
| 4 | `getByAltText` | Images |
| 5 | `getByTestId` | Last resort only |

## Setup

```typescript
// test/utils.tsx
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider></ThemeProvider>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return { ...render(ui, { wrapper: AllProviders, ...options }), user: userEvent.setup() };
}

export { customRender as render };
export { screen, within, waitFor } from '@testing-library/react';
```

## Component Testing

```typescript
import { render, screen } from '@/test/utils';
import { ProfileCard } from './profile-card';

describe('ProfileCard', () => {
  it('renders user information', () => {
    render(<ProfileCard name="Jane" email="jane@example.com" role="Engineer" />);
    expect(screen.getByRole('heading', { name: /jane/i })).toBeInTheDocument();
    expect(screen.getByText(/engineer/i)).toBeInTheDocument();
  });

  it('hides edit button for other profiles', () => {
    render(<ProfileCard name="Jane" isOwnProfile={false} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });
});
```

## User Interactions

```typescript
describe('LoginForm', () => {
  it('submits with valid credentials', async () => {
    const onSubmit = vi.fn();
    const { user } = render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'secret123' });
  });

  it('shows validation error for empty email', async () => {
    const { user } = render(<LoginForm onSubmit={vi.fn()} />);
    await user.click(screen.getByLabelText(/email/i));
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i);
  });
});
```

## Async Testing

```typescript
import { fetchUsers } from '@/lib/api';
vi.mock('@/lib/api', () => ({ fetchUsers: vi.fn() }));

it('shows loading then renders users', async () => {
  (fetchUsers as Mock).mockResolvedValue([{ id: '1', name: 'Alice' }]);
  render(<UserList />);

  expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  await waitForElementToBeRemoved(() => screen.queryByRole('status'));
  expect(screen.getByText('Alice')).toBeInTheDocument();
});

it('shows error on fetch failure', async () => {
  (fetchUsers as Mock).mockRejectedValue(new Error('Network error'));
  render(<UserList />);
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
  });
});
```

## Key jest-dom Matchers

```typescript
expect(el).toBeVisible();                          // Visibility
expect(input).toBeDisabled();                      // Form state
expect(input).toHaveValue('hello');                // Input value
expect(input).toBeChecked();                       // Checkbox/radio
expect(el).toHaveTextContent(/expected/i);         // Content
expect(el).toHaveAttribute('href', '/about');      // Attributes
expect(el).toHaveAccessibleName('Submit form');    // Accessibility
```

## Best Practices

1. **Query by role first** — if you can't, your component has accessibility issues
2. **Use `user-event` over `fireEvent`** — simulates real behavior (focus, keystrokes)
3. **Use `screen`** instead of destructuring from render
4. **Use `findBy*`** for async elements instead of waitFor + getBy
5. **Match text with regex** (`/submit/i`) for resilience to case changes
6. **Test behavior, not implementation** — don't test state or internal methods
7. **Mock at the boundary** — mock API calls, not internal functions
8. **One behavior per test** with clear arrange-act-assert structure


---

## From `testing-patterns`

> Design and implement test suites using unit, integration, e2e, and property-based testing patterns with framework-appropriate tooling

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


---

## From `testing-strategy`

> Test pyramid and trophy strategies, coverage goals, what to test at each layer, and testing ROI optimization

# Testing Strategy

## Purpose

Define what to test, at which layer, and with what coverage goals. Provides decision frameworks for choosing between unit, integration, and end-to-end tests based on risk, cost, and confidence. Covers both the traditional Test Pyramid and Kent C. Dodds' Testing Trophy model.

## Key Patterns

### The Testing Trophy (Recommended)

```text
        /  E2E  \           Few, critical user journeys
       /----------\
      / Integration \       MOST tests live here
     /----------------\
    /   Unit (logic)    \   Pure functions, algorithms
   /----------------------\
  /    Static Analysis     \  TypeScript, ESLint, Prettier
 /--------------------------\
```

**Distribution guideline:**
- Static: 100% (TypeScript strict, ESLint) -- free confidence
- Unit: ~20% of test effort -- pure logic, algorithms, utilities
- Integration: ~60% of test effort -- components + API routes + DB queries
- E2E: ~20% of test effort -- critical user flows only

### What to Test at Each Layer

**Static Analysis (TypeScript + ESLint):**

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Tests: type correctness, import errors, unused variables, formatting. Zero runtime cost.

**Unit Tests -- Pure Logic Only:**

```typescript
// utils/pricing.ts
export function calculateDiscount(
  price: number,
  tier: 'free' | 'pro' | 'enterprise'
): number {
  const rates = { free: 0, pro: 0.15, enterprise: 0.30 };
  return Math.round(price * (1 - rates[tier]) * 100) / 100;
}

// utils/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './pricing';

describe('calculateDiscount', () => {
  it('applies no discount for free tier', () => {
    expect(calculateDiscount(100, 'free')).toBe(100);
  });

  it('applies 15% discount for pro tier', () => {
    expect(calculateDiscount(100, 'pro')).toBe(85);
  });

  it('handles floating point correctly', () => {
    expect(calculateDiscount(99.99, 'pro')).toBe(84.99);
  });

  it('handles zero price', () => {
    expect(calculateDiscount(0, 'enterprise')).toBe(0);
  });
});
```

**Integration Tests -- Components with Dependencies:**

```typescript
// components/user-profile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './user-profile';
import { server } from '@/test/mocks/server'; // MSW
import { http, HttpResponse } from 'msw';

describe('UserProfile', () => {
  it('displays user data after loading', async () => {
    render(<UserProfile userId="123" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');

    await waitFor(() => {
      expect(screen.getByRole('heading')).toHaveTextContent('Jane Doe');
    });
  });

  it('shows error state on API failure', async () => {
    server.use(
      http.get('/api/users/123', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('User not found');
    });
  });

  it('allows editing display name', async () => {
    const user = userEvent.setup();
    render(<UserProfile userId="123" />);

    await waitFor(() => screen.getByRole('heading'));

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.clear(screen.getByRole('textbox', { name: /name/i }));
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'New Name');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading')).toHaveTextContent('New Name');
    });
  });
});
```

**API Route Integration Tests:**

```typescript
// app/api/users/route.test.ts
import { POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/db';

describe('POST /api/users', () => {
  it('creates a user with valid data', async () => {
    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe('Test');

    // Verify DB state
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, 'test@example.com'),
    });
    expect(user).toBeTruthy();
  });

  it('rejects invalid email', async () => {
    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'not-an-email' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

**E2E Tests -- Critical Journeys Only:**

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('complete checkout flow', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.getByRole('link', { name: 'Cart' }).click();

  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();

  await expect(page.getByRole('heading')).toHaveText('Order confirmed');
});
```

### Coverage Goals

```text
| Layer       | Target   | Measure                        |
|-------------|----------|--------------------------------|
| Static      | 100%     | Zero TS errors, lint clean     |
| Unit        | 90%+     | Branch coverage on pure fns    |
| Integration | 80%+     | Statement coverage on features |
| E2E         | N/A      | Journey completion rate        |
| Overall     | 80%+     | Combined statement coverage    |
```

### Decision Matrix: Where to Test What

```text
| What                      | Unit | Integration | E2E |
|---------------------------|------|-------------|-----|
| Pure utility functions    |  X   |             |     |
| React component rendering |      |      X      |     |
| Form validation logic     |  X   |      X      |     |
| API request/response      |      |      X      |     |
| Database queries          |      |      X      |     |
| Auth flows                |      |      X      |  X  |
| Payment flows             |      |             |  X  |
| Cross-page navigation     |      |             |  X  |
| CSS/visual regression     |      |             |  X  |
| Error boundaries          |      |      X      |     |
| Webhook handlers          |      |      X      |     |
```

## Best Practices

1. **Test behavior, not implementation** -- Assert what the user sees, not internal state. Use `getByRole`, not component internals.
2. **Integration tests give the best ROI** -- They catch real bugs at reasonable cost. Prioritize them.
3. **Unit test pure logic only** -- If it has no dependencies (no DB, no API, no DOM), unit test it. Otherwise, integrate.
4. **Keep E2E tests minimal** -- Cover only critical revenue paths (auth, checkout, onboarding). They are slow and flaky.
5. **Use MSW for API mocking** -- Mock at the network layer, not the module layer. Tests stay realistic.
6. **Test error states explicitly** -- Every component and API route should have tests for failure modes.
7. **Run tests in CI on every PR** -- Unit and integration on every push. E2E on merge to main.
8. **Treat flaky tests as bugs** -- A flaky test is worse than no test. Fix or delete immediately.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Testing implementation details | Tests break on every refactor | Test user-visible behavior and API contracts |
| 100% coverage as a goal | Wastes effort on trivial code, gives false confidence | Target 80% overall; focus coverage on business logic |
| Too many E2E tests | Slow CI, flaky failures, maintenance burden | Limit E2E to 5-10 critical journeys; push rest to integration |
| Mocking too much | Tests pass but bugs ship | Mock only external boundaries (network, DB); test real interactions |
| No test for error paths | App crashes gracefully in tests but not production | Write explicit tests for network failures, invalid input, timeouts |
| Snapshot tests everywhere | Tests always pass (just update snapshot), catch nothing real | Use snapshots only for serialized output (CLI, email templates) |
| Testing library internals | Coupled to framework version | Test through public API; never import internal modules |
| No test data factories | Tests have duplicated setup, hard to maintain | Use factories (fishery, @mswjs/data) for consistent test data |


---

## From `testing-fixtures`

> Test fixture patterns — factories, builders, seeders, snapshot testing, and test data management.

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


---

## From `api-testing`

> API testing patterns — Supertest, Hoppscotch, REST client, contract testing, integration test strategies

# API Testing Patterns

## Purpose

Provide expert guidance on API testing strategies including integration testing with Supertest, contract testing, REST client workflows, authentication in tests, database seeding, and CI pipeline integration for reliable API test suites.

## Core Patterns

### 1. Supertest Setup with Vitest

```bash
npm install -D supertest @types/supertest vitest
```

```typescript
// test/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

beforeAll(async () => {
  // Ensure test database is migrated
  // Run: DATABASE_URL=test_url npx prisma migrate deploy
});

afterEach(async () => {
  // Clean up test data between tests
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename NOT IN ('_prisma_migrations')
  `;

  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 2. Supertest Integration Tests

```typescript
// test/api/posts.test.ts
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '@/app'; // Express/Fastify app factory
import { prisma } from '@/lib/prisma';
import { createTestUser, createTestPost } from '@/test/factories';

describe('POST /api/posts', () => {
  let app: Express.Application;
  let authToken: string;

  beforeEach(async () => {
    app = createApp();
    const user = await createTestUser({ role: 'MEMBER' });
    authToken = generateTestToken(user);
  });

  it('creates a post with valid data', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Post',
        content: 'This is test content.',
        categoryId: 'cat-1',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      title: 'Test Post',
      content: 'This is test content.',
      published: false,
    });

    // Verify in database
    const post = await prisma.post.findUnique({ where: { id: res.body.id } });
    expect(post).not.toBeNull();
    expect(post!.title).toBe('Test Post');
  });

  it('returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'No title provided' })
      .expect(400);

    expect(res.body.error).toContain('title');
  });

  it('returns 401 without authentication', async () => {
    await request(app)
      .post('/api/posts')
      .send({ title: 'Test', content: 'Content' })
      .expect(401);
  });

  it('returns 403 for viewer role', async () => {
    const viewer = await createTestUser({ role: 'VIEWER' });
    const viewerToken = generateTestToken(viewer);

    await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'Test', content: 'Content' })
      .expect(403);
  });
});

describe('GET /api/posts', () => {
  let app: Express.Application;

  beforeEach(async () => {
    app = createApp();
    const user = await createTestUser();
    await createTestPost({ authorId: user.id, title: 'First Post', published: true });
    await createTestPost({ authorId: user.id, title: 'Second Post', published: true });
    await createTestPost({ authorId: user.id, title: 'Draft Post', published: false });
  });

  it('returns published posts with pagination', async () => {
    const res = await request(app)
      .get('/api/posts')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.posts).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.posts[0]).toHaveProperty('title');
    expect(res.body.posts[0]).not.toHaveProperty('content'); // Should be excluded from list
  });

  it('filters posts by search query', async () => {
    const res = await request(app)
      .get('/api/posts')
      .query({ search: 'First' })
      .expect(200);

    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].title).toBe('First Post');
  });

  it('returns correct pagination metadata', async () => {
    const res = await request(app)
      .get('/api/posts')
      .query({ page: 1, limit: 1 })
      .expect(200);

    expect(res.body).toMatchObject({
      posts: expect.any(Array),
      total: 2,
      page: 1,
      limit: 1,
      hasMore: true,
    });
  });
});
```

### 3. Next.js App Router API Testing

```typescript
// test/api/next-posts.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/posts/route';
import { NextRequest } from 'next/server';
import { createTestUser, createTestPost } from '@/test/factories';

// Mock auth for Next.js route handlers
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

describe('GET /api/posts', () => {
  beforeEach(async () => {
    const user = await createTestUser();
    await createTestPost({ authorId: user.id, published: true });
  });

  it('returns published posts', async () => {
    const req = createRequest('/api/posts');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.posts).toHaveLength(1);
  });
});

describe('POST /api/posts', () => {
  it('creates a post when authenticated', async () => {
    const user = await createTestUser();
    vi.mocked(auth).mockResolvedValue({
      user: { id: user.id, role: 'MEMBER' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as any);

    const req = createRequest('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Post', content: 'Content' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.title).toBe('New Post');
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = createRequest('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', content: 'Content' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

### 4. Test Factories

```typescript
// test/factories.ts
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

let counter = 0;
function uniqueId() { return `test-${++counter}-${Date.now()}`; }

export async function createTestUser(overrides: Partial<{
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  password: string;
}> = {}) {
  const id = uniqueId();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${id}@test.com`,
      name: overrides.name ?? `Test User ${id}`,
      role: overrides.role ?? 'MEMBER',
      password: await hash(overrides.password ?? 'password123', 10),
    },
  });
}

export async function createTestPost(overrides: {
  authorId: string;
  title?: string;
  content?: string;
  published?: boolean;
}) {
  const id = uniqueId();
  return prisma.post.create({
    data: {
      title: overrides.title ?? `Test Post ${id}`,
      slug: `test-post-${id}`,
      content: overrides.content ?? `Content for ${id}`,
      published: overrides.published ?? false,
      authorId: overrides.authorId,
    },
  });
}

export function generateTestToken(user: { id: string; role: string }) {
  return sign(
    { id: user.id, role: user.role },
    process.env.AUTH_SECRET ?? 'test-secret',
    { expiresIn: '1h' }
  );
}
```

### 5. Contract Testing with Zod

```typescript
// test/contracts/post-contract.ts
import { z } from 'zod';

// Define the API contract schema
export const PostResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string().optional(),
  published: z.boolean(),
  author: z.object({
    id: z.string(),
    name: z.string(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PostListResponseSchema = z.object({
  posts: z.array(PostResponseSchema.omit({ content: true })),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  hasMore: z.boolean(),
});

export const CreatePostRequestSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});
```

```typescript
// test/api/posts-contract.test.ts
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { PostListResponseSchema, PostResponseSchema, ErrorResponseSchema } from '@/test/contracts/post-contract';

describe('Posts API Contract', () => {
  it('GET /api/posts matches list contract', async () => {
    const res = await request(app).get('/api/posts').expect(200);
    const parsed = PostListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });

  it('GET /api/posts/:id matches detail contract', async () => {
    const post = await createTestPost({ authorId: userId, published: true });
    const res = await request(app).get(`/api/posts/${post.id}`).expect(200);
    const parsed = PostResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });

  it('POST /api/posts 400 matches error contract', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({}) // Missing required fields
      .expect(400);

    const parsed = ErrorResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });
});
```

### 6. VS Code REST Client (.http files)

```http
### Variables
@baseUrl = http://localhost:3000/api
@authToken = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

### List posts
GET {{baseUrl}}/posts?page=1&limit=10
Accept: application/json

### Get single post
GET {{baseUrl}}/posts/clx123abc
Accept: application/json

### Create post (authenticated)
POST {{baseUrl}}/posts
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "title": "New Post Title",
  "content": "Post content goes here.",
  "categoryId": "cat-1"
}

### Update post
PATCH {{baseUrl}}/posts/clx123abc
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "title": "Updated Title"
}

### Delete post
DELETE {{baseUrl}}/posts/clx123abc
Authorization: Bearer {{authToken}}

### Login (get token)
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 7. Response Time and Performance Assertions

```typescript
// test/api/performance.test.ts
describe('API Performance', () => {
  it('GET /api/posts responds within 200ms', async () => {
    const start = performance.now();

    await request(app).get('/api/posts').expect(200);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('handles concurrent requests without errors', async () => {
    const requests = Array.from({ length: 50 }, () =>
      request(app).get('/api/posts').expect(200)
    );

    const results = await Promise.all(requests);
    results.forEach((res) => {
      expect(res.status).toBe(200);
    });
  });
});
```

## Best Practices

1. **Isolate test databases** -- use a separate database URL for tests, never test against production or development data.
2. **Clean up between tests** -- truncate tables in `afterEach` to prevent test pollution.
3. **Use factories, not raw inserts** -- centralize test data creation for consistency and maintainability.
4. **Test the full HTTP layer** -- use Supertest/fetch to test middleware, auth, validation, and serialization together.
5. **Assert response schemas** -- use Zod contract schemas to catch unexpected response shape changes.
6. **Test error responses** -- verify 400, 401, 403, 404, and 500 responses have correct shape and status codes.
7. **Test idempotency** -- POST/PUT endpoints should be tested for duplicate submission behavior.
8. **Use meaningful test names** -- describe the condition and expected outcome: "returns 403 for viewer role".
9. **Test pagination boundaries** -- test page 1, last page, empty results, and beyond-last-page requests.
10. **Run API tests in CI** -- include in the test pipeline with a test database provisioned per run.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Testing against live APIs | Flaky, slow, side effects | Use test database + Supertest |
| No data cleanup between tests | Tests depend on run order | Truncate in `afterEach` |
| Hardcoded IDs in tests | Breaks when data changes | Use factories that return created entities |
| Only testing happy path | Misses auth, validation, error cases | Test 400/401/403/404/500 responses |
| Mocking the database in integration tests | Does not test actual query behavior | Use real test database |
| Giant setup blocks | Slow tests, hard to understand | Create minimal data per test |
| No response schema validation | API shape changes go undetected | Use Zod contract schemas |
| Skipping auth in tests | Auth bugs reach production | Test authenticated and unauthenticated paths |

## Decision Guide

| Scenario | Approach |
|----------|----------|
| Express/Fastify API tests | Supertest + Vitest + test database |
| Next.js App Router API tests | Direct route handler import + NextRequest mock |
| Manual API exploration | VS Code REST Client (.http files) or Hoppscotch |
| Response shape validation | Zod contract schemas parsed in assertions |
| Auth testing | Factory-generated JWT tokens with different roles |
| Performance regression | Response time assertions in dedicated test suite |
| CI pipeline | Test database per run, seed + truncate pattern |
| E2E API flow | Chain requests: create -> read -> update -> delete |

