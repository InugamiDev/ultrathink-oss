---
name: api-testing
description: API testing patterns — Supertest, Hoppscotch, REST client, contract testing, integration test strategies
layer: domain
category: testing
triggers:
  - "api testing"
  - "supertest"
  - "hoppscotch"
  - "rest client"
  - "contract testing"
  - "api test"
  - "endpoint testing"
inputs:
  - "API endpoints to test"
  - "Request/response schemas"
  - "Authentication requirements for tests"
outputs:
  - "API test suites with Supertest or fetch"
  - "Contract test definitions"
  - "Test fixtures and factories"
  - "CI-integrated API test workflows"
linksTo:
  - test
  - testing-patterns
  - api-designer
  - nodejs
linkedFrom: []
preferredNextSkills:
  - testing-patterns
  - test
  - api-designer
fallbackSkills:
  - test
  - nodejs
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
