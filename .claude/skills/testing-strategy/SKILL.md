---
name: testing-strategy
description: Test pyramid and trophy strategies, coverage goals, what to test at each layer, and testing ROI optimization
layer: hub
category: testing
triggers:
  - "test strategy"
  - "test pyramid"
  - "testing trophy"
  - "what to test"
  - "coverage goals"
  - "test layers"
  - "testing plan"
  - "test architecture"
inputs:
  - "Project architecture requiring a testing plan"
  - "Coverage gap analysis requests"
  - "Testing ROI optimization needs"
  - "Questions about what to test at which layer"
outputs:
  - "Testing strategy documents with layer breakdown"
  - "Coverage goals per test type"
  - "Test-layer decision matrices"
  - "Testing ROI recommendations"
linksTo:
  - test
  - test-ui
  - testing-patterns
  - cicd
linkedFrom:
  - plan
  - audit
  - code-review
preferredNextSkills:
  - test
  - testing-patterns
  - test-ui
fallbackSkills:
  - code-review
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
