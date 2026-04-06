---
name: contract-testing
description: Consumer-driven contract testing with Pact, schema validation, and API compatibility verification.
layer: domain
category: testing
triggers:
  - "contract test"
  - "pact"
  - "consumer driven"
  - "api contract"
  - "schema validation"
inputs:
  - "API contract testing requirements"
  - "Consumer-driven testing setup"
  - "Schema validation strategies"
  - "API compatibility verification"
outputs:
  - "Pact consumer and provider tests"
  - "Schema validation configurations"
  - "Contract verification workflows"
  - "CI/CD integration for contract tests"
linksTo:
  - api-testing
  - testing-patterns
  - openapi
  - microservices
linkedFrom: []
preferredNextSkills:
  - api-testing
  - testing-patterns
  - microservices
fallbackSkills:
  - openapi
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Consumer-Driven Contract Testing

## Purpose

Provide expert guidance on consumer-driven contract testing (CDCT) with Pact, schema validation with Zod/JSON Schema, API compatibility verification, and CI integration. Ensures APIs evolve without breaking consumers in microservice architectures.

## Why Contract Testing

```
┌────────────────────────────────────────────────┐
│           Testing Pyramid for APIs             │
│                                                │
│              ┌──────────┐                      │
│              │  E2E     │  Slow, brittle       │
│            ┌─┴──────────┴─┐                    │
│            │  Integration  │  Needs live deps   │
│          ┌─┴──────────────┴─┐                  │
│          │  Contract Tests   │  Fast, isolated  │  ← This skill
│        ┌─┴──────────────────┴─┐                │
│        │     Unit Tests        │                │
│        └───────────────────────┘                │
└────────────────────────────────────────────────┘
```

Contract tests verify that a **provider** API meets the expectations of its **consumers** without requiring both services to be running simultaneously.

## Pact Consumer Test (TypeScript)

The consumer defines what it expects from the provider:

```typescript
// consumer/tests/user-service.pact.test.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { UserApiClient } from '../src/user-api-client';

const { like, eachLike, string, integer, datetime } = MatchersV3;

const provider = new PactV4({
  consumer: 'OrderService',
  provider: 'UserService',
  dir: './pacts', // output directory for contract files
});

describe('User Service API', () => {
  describe('GET /users/:id', () => {
    it('returns user details', async () => {
      await provider
        .addInteraction()
        .given('user 123 exists')
        .uponReceiving('a request for user 123')
        .withRequest('GET', '/users/123', (builder) => {
          builder.headers({ Accept: 'application/json' });
        })
        .willRespondWith(200, (builder) => {
          builder
            .headers({ 'Content-Type': 'application/json' })
            .jsonBody({
              id: integer(123),
              email: string('user@example.com'),
              name: string('Jane Doe'),
              createdAt: datetime("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2024-01-15T10:30:00.000Z'),
              orders: eachLike({
                id: string('ord-001'),
                total: like(49.99),
              }),
            });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);
          const user = await client.getUser('123');

          expect(user.id).toBe(123);
          expect(user.email).toBeDefined();
          expect(user.orders).toBeInstanceOf(Array);
        });
    });

    it('returns 404 for unknown user', async () => {
      await provider
        .addInteraction()
        .given('user 999 does not exist')
        .uponReceiving('a request for non-existent user 999')
        .withRequest('GET', '/users/999')
        .willRespondWith(404, (builder) => {
          builder.jsonBody({
            error: string('Not Found'),
            message: string('User 999 not found'),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);
          await expect(client.getUser('999')).rejects.toThrow('User 999 not found');
        });
    });
  });

  describe('POST /users', () => {
    it('creates a new user', async () => {
      await provider
        .addInteraction()
        .uponReceiving('a request to create a user')
        .withRequest('POST', '/users', (builder) => {
          builder
            .headers({ 'Content-Type': 'application/json' })
            .jsonBody({
              email: 'new@example.com',
              name: 'New User',
            });
        })
        .willRespondWith(201, (builder) => {
          builder.jsonBody({
            id: integer(),
            email: string('new@example.com'),
            name: string('New User'),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);
          const user = await client.createUser({
            email: 'new@example.com',
            name: 'New User',
          });
          expect(user.id).toBeDefined();
        });
    });
  });
});
```

## Pact Provider Verification

The provider verifies it meets consumer expectations:

```typescript
// provider/tests/pact-verification.test.ts
import { Verifier } from '@pact-foundation/pact';
import { app } from '../src/app';

describe('Pact Provider Verification', () => {
  let server: any;

  beforeAll(async () => {
    // Start the real provider service
    server = app.listen(0);
  });

  afterAll(() => server.close());

  it('validates the expectations of OrderService', async () => {
    const port = server.address().port;

    await new Verifier({
      providerBaseUrl: `http://localhost:${port}`,
      provider: 'UserService',

      // Load pact files (local or from broker)
      pactUrls: ['../consumer/pacts/OrderService-UserService.json'],
      // OR from Pact Broker:
      // pactBrokerUrl: process.env.PACT_BROKER_URL,
      // pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      // publishVerificationResult: true,
      // providerVersion: process.env.GIT_SHA,

      // Setup provider states
      stateHandlers: {
        'user 123 exists': async () => {
          await seedDatabase({
            id: 123,
            email: 'user@example.com',
            name: 'Jane Doe',
          });
        },
        'user 999 does not exist': async () => {
          await clearDatabase();
        },
      },
    }).verifyProvider();
  });
});
```

## Schema Validation with Zod

For simpler contract validation without Pact:

```typescript
// shared/contracts/user-contract.ts
import { z } from 'zod';

// Shared schema — defines the contract
export const UserResponseSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  orders: z.array(
    z.object({
      id: z.string(),
      total: z.number().nonnegative(),
    }),
  ).optional(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

// Consumer test — validate against schema
describe('User API Client', () => {
  it('response matches contract schema', async () => {
    const response = await fetch('/users/123');
    const data = await response.json();

    // This throws if the response doesn't match
    const user = UserResponseSchema.parse(data);
    expect(user.id).toBe(123);
  });
});

// Provider test — validate output against schema
describe('GET /users/:id', () => {
  it('response conforms to contract', async () => {
    const response = await request(app).get('/users/123');

    expect(() => UserResponseSchema.parse(response.body)).not.toThrow();
  });
});
```

## OpenAPI-Based Contract Testing

```typescript
// tests/openapi-contract.test.ts
import { createDocument } from 'openapi-backend';
import SwaggerParser from '@apidevtools/swagger-parser';

describe('API Contract Compliance', () => {
  let api: any;

  beforeAll(async () => {
    api = await SwaggerParser.validate('./openapi.yaml');
  });

  it('GET /users/:id response matches OpenAPI spec', async () => {
    const response = await request(app).get('/users/123');

    // Validate response against the OpenAPI schema
    const schema = api.paths['/users/{id}'].get.responses['200'].content['application/json'].schema;
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(response.body);

    expect(valid).toBe(true);
    if (!valid) console.error(validate.errors);
  });
});
```

## Pact Broker & CI Integration

**Publish contracts from consumer CI:**

```yaml
# consumer/.github/workflows/contract.yml
name: Consumer Contract Tests
on: [push]

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run test:pact
      - name: Publish Pact to Broker
        run: |
          npx pact-broker publish ./pacts \
            --consumer-app-version=${{ github.sha }} \
            --branch=${{ github.ref_name }} \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
```

**Verify contracts in provider CI:**

```yaml
# provider/.github/workflows/contract.yml
name: Provider Contract Verification
on:
  push:
  # Webhook from Pact Broker when new contracts are published
  repository_dispatch:
    types: [pact-changed]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run test:pact:verify
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          GIT_SHA: ${{ github.sha }}
```

**Can-I-Deploy check before deploying:**

```yaml
- name: Can I Deploy?
  run: |
    npx pact-broker can-i-deploy \
      --pacticipant=UserService \
      --version=${{ github.sha }} \
      --to-environment=production \
      --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
      --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
```

## Backward Compatibility Rules

**Safe changes (non-breaking):**
- Adding new optional fields to responses
- Adding new endpoints
- Adding new optional query parameters
- Widening accepted input types

**Breaking changes (require consumer updates):**
- Removing or renaming response fields
- Changing field types
- Adding required request fields
- Removing endpoints
- Changing URL paths

## Best Practices

1. **Consumer writes the contract** — The consumer defines what it needs, not what the provider offers.
2. **Use matchers, not exact values** — Pact matchers (`like`, `eachLike`, `integer`) validate shape, not data.
3. **Provider states setup test data** — Use `stateHandlers` to seed specific scenarios.
4. **Publish to a Pact Broker** — Central contract repository for all services.
5. **Run `can-i-deploy` before releases** — Verify compatibility before deploying to production.
6. **Version contracts by git SHA** — Track which commit generated each contract.
7. **Test error scenarios** — Contract should cover 404, 400, 401 responses.
8. **Keep contracts minimal** — Only test fields the consumer actually uses.
9. **Automate with webhooks** — Pact Broker triggers provider verification on new contracts.
10. **Use schema validation as a lightweight alternative** — Zod schemas for simpler setups without Pact.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Testing exact response values | Brittle tests that break on data changes | Use Pact matchers for shape, not exact values |
| Consumer tests too much | Contract covers fields consumer does not use | Only include fields the consumer actually consumes |
| No provider states | Provider verification fails due to missing test data | Implement `stateHandlers` for each `given()` clause |
| Skipping error contracts | Only happy path tested, 4xx/5xx breaks consumer | Add contract tests for error responses |
| Manual contract sharing | Pact JSON files emailed or committed | Use Pact Broker for automated contract exchange |
| Treating contracts as E2E tests | Slow, flaky, overloaded | Contracts verify schema and shape only; E2E tests verify behavior |
