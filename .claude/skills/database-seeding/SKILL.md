---
name: database-seeding
description: Database seeding — seed scripts, faker data generation, deterministic seeds, test data patterns, and environment-specific seeding strategies
layer: utility
category: database
triggers:
  - "seed database"
  - "seed data"
  - "faker data"
  - "test data"
  - "mock data"
  - "database seeding"
  - "seed script"
  - "generate test data"
inputs:
  - Database schema (Prisma, Drizzle, raw SQL)
  - Data requirements (how many records, relationships)
  - Environment (development, staging, testing)
  - Determinism requirements (reproducible seeds)
outputs:
  - Seed script with realistic fake data
  - Deterministic seed configuration
  - Environment-specific seed strategies
  - Test fixture generators
  - Cleanup and reset utilities
linksTo:
  - postgresql
  - prisma
  - drizzle
  - testing-patterns
linkedFrom:
  - onboard
  - bootstrap
preferredNextSkills:
  - testing-patterns
  - database-indexing
fallbackSkills:
  - postgresql
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Writes data to database
  - May truncate existing data
  - Creates test users and content
---

# Database Seeding Skill

## Purpose

Seed scripts populate databases with realistic data for development, testing, and staging environments. Good seeds are deterministic (reproducible), fast, respect foreign key constraints, and generate data that looks real. This skill covers seed architecture, faker patterns, and environment-specific strategies.

## Key Concepts

### Seeding Environments

| Environment | Data Volume | Realism | Determinism | Speed Priority |
|-------------|-------------|---------|-------------|----------------|
| **Development** | Small (100s) | High (realistic) | Optional | Fast |
| **Testing** | Minimal | Relevant to tests | Required | Fastest |
| **Staging** | Production-like (1000s+) | Very high | Optional | Less important |
| **Demo** | Curated | Perfect | Required | N/A |

### Seed Architecture

```
seeds/
  index.ts            # Main entry point
  config.ts           # Seed counts, deterministic seed value
  factories/          # Data generators per entity
    user.factory.ts
    post.factory.ts
    order.factory.ts
  scenarios/          # Pre-built data scenarios
    demo.ts           # Demo account with curated data
    load-test.ts      # Large volume for perf testing
    empty.ts          # Schema only, no data
  utils/
    reset.ts          # Truncate/clean database
    helpers.ts        # Shared utilities
```

## Workflow

### Step 1: Install Dependencies

```bash
npm install --save-dev @faker-js/faker
# or for Prisma:
# npx prisma db seed is built-in
```

### Step 2: Factory Pattern with Faker

```typescript
// seeds/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export interface UserSeed {
  email: string;
  name: string;
  avatarUrl: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
}

export function createUser(overrides: Partial<UserSeed> = {}): UserSeed {
  return {
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    role: faker.helpers.weightedArrayElement([
      { value: 'viewer', weight: 7 },
      { value: 'editor', weight: 2 },
      { value: 'admin', weight: 1 },
    ]),
    createdAt: faker.date.between({
      from: '2023-01-01',
      to: new Date(),
    }),
    ...overrides,
  };
}

export function createUsers(count: number, overrides: Partial<UserSeed> = {}): UserSeed[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

// seeds/factories/post.factory.ts
import { faker } from '@faker-js/faker';

export interface PostSeed {
  title: string;
  slug: string;
  body: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: Date | null;
  authorId: string; // Set after user creation
}

export function createPost(overrides: Partial<PostSeed> = {}): Omit<PostSeed, 'authorId'> & { authorId?: string } {
  const title = faker.lorem.sentence({ min: 4, max: 10 });
  const status = faker.helpers.arrayElement(['draft', 'published', 'published', 'published', 'archived']);

  return {
    title,
    slug: faker.helpers.slugify(title).toLowerCase(),
    body: faker.lorem.paragraphs({ min: 3, max: 8 }, '\n\n'),
    status,
    publishedAt: status === 'published'
      ? faker.date.between({ from: '2023-06-01', to: new Date() })
      : null,
    ...overrides,
  };
}
```

### Step 3: Deterministic Seeds (Reproducible Data)

```typescript
// seeds/config.ts
import { faker } from '@faker-js/faker';

// CRITICAL: Set a fixed seed for reproducible data
// Same seed = same data every time = deterministic tests
export function initSeed(seed: number = 42) {
  faker.seed(seed);
}

// Usage
initSeed(42);
const user1 = createUser(); // Always produces the same user
const user2 = createUser(); // Always produces the same second user

// For tests that need isolation:
export function withSeed<T>(seed: number, fn: () => T): T {
  faker.seed(seed);
  const result = fn();
  faker.seed(); // Reset to random
  return result;
}
```

### Step 4: Main Seed Script (Prisma)

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { createUser, createUsers } from '../seeds/factories/user.factory';
import { createPost } from '../seeds/factories/post.factory';

const prisma = new PrismaClient();

async function main() {
  const startTime = Date.now();

  // Set deterministic seed
  faker.seed(42);

  console.log('Cleaning database...');
  await cleanDatabase();

  console.log('Seeding users...');
  const users = await seedUsers();

  console.log('Seeding posts...');
  await seedPosts(users.map(u => u.id));

  console.log('Seeding demo account...');
  await seedDemoAccount();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Seeding complete in ${elapsed}s`);
}

async function cleanDatabase() {
  // Truncate in reverse dependency order
  // Using raw SQL for speed (Prisma deleteMany is slow for bulk)
  await prisma.$executeRaw`TRUNCATE TABLE comments, posts, user_roles, users CASCADE`;
}

async function seedUsers() {
  // Create admin user (always same credentials for dev login)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@localhost.dev',
      name: 'Admin User',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      passwordHash: await hashPassword('admin123'), // Dev only!
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.create({
    data: { userId: admin.id, roleId: await getRoleId('admin') },
  });

  // Create regular users
  const userData = createUsers(50);
  const users = await prisma.user.createManyAndReturn({
    data: userData.map(u => ({
      ...u,
      passwordHash: '$2b$10$fixedhashfordevseeding', // Placeholder — dev only
      emailVerifiedAt: faker.datatype.boolean(0.8) ? faker.date.past() : null,
    })),
  });

  // Assign roles
  for (const user of users) {
    const role = faker.helpers.weightedArrayElement([
      { value: 'viewer', weight: 6 },
      { value: 'editor', weight: 3 },
      { value: 'admin', weight: 1 },
    ]);
    await prisma.userRole.create({
      data: { userId: user.id, roleId: await getRoleId(role) },
    });
  }

  return [admin, ...users];
}

async function seedPosts(userIds: string[]) {
  const posts: any[] = [];

  for (let i = 0; i < 200; i++) {
    const post = createPost();
    posts.push({
      ...post,
      authorId: faker.helpers.arrayElement(userIds),
    });
  }

  await prisma.post.createMany({ data: posts });

  // Seed comments on published posts
  const publishedPosts = await prisma.post.findMany({
    where: { status: 'published' },
    select: { id: true },
  });

  const comments: any[] = [];
  for (const post of publishedPosts) {
    const commentCount = faker.number.int({ min: 0, max: 10 });
    for (let i = 0; i < commentCount; i++) {
      comments.push({
        postId: post.id,
        authorId: faker.helpers.arrayElement(userIds),
        body: faker.lorem.paragraph(),
        createdAt: faker.date.recent({ days: 30 }),
      });
    }
  }

  await prisma.comment.createMany({ data: comments });
}

async function seedDemoAccount() {
  // Create a curated demo account with specific, good-looking data
  const demo = await prisma.user.create({
    data: {
      email: 'demo@localhost.dev',
      name: 'Jane Cooper',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      passwordHash: await hashPassword('demo123'),
      emailVerifiedAt: new Date(),
    },
  });

  // Create specific demo posts with real-looking content
  await prisma.post.createMany({
    data: [
      {
        title: 'Getting Started with Our Platform',
        slug: 'getting-started',
        body: 'Welcome to the platform! This guide walks you through...',
        status: 'published',
        publishedAt: new Date('2024-01-15'),
        authorId: demo.id,
      },
      {
        title: 'Advanced Tips and Tricks',
        slug: 'advanced-tips',
        body: 'Once you have mastered the basics, try these advanced features...',
        status: 'published',
        publishedAt: new Date('2024-02-20'),
        authorId: demo.id,
      },
      {
        title: 'Draft: Upcoming Feature Preview',
        slug: 'upcoming-features-preview',
        body: 'We are working on exciting new features...',
        status: 'draft',
        publishedAt: null,
        authorId: demo.id,
      },
    ],
  });
}

// Prisma seed entry point
main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### Step 5: Configure Prisma to Run Seeds

```json
// package.json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "npx prisma db seed",
    "db:reset": "npx prisma migrate reset",
    "db:fresh": "npx prisma migrate reset --force && npx prisma db seed"
  }
}
```

### Step 6: Drizzle Seed Script

```typescript
// seeds/index.ts (Drizzle)
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { faker } from '@faker-js/faker';
import { users, posts, comments } from '../src/db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  faker.seed(42);

  // Clean
  await db.delete(comments);
  await db.delete(posts);
  await db.delete(users);

  // Insert users
  const insertedUsers = await db.insert(users).values(
    createUsers(50).map(u => ({
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    }))
  ).returning({ id: users.id });

  // Insert posts with random authors
  const userIds = insertedUsers.map(u => u.id);
  await db.insert(posts).values(
    Array.from({ length: 200 }, () => ({
      ...createPost(),
      authorId: faker.helpers.arrayElement(userIds),
    }))
  );

  console.log('Seeded successfully');
}

seed().catch(console.error);
```

### Step 7: Test Fixtures (Lightweight Seeds for Tests)

```typescript
// tests/fixtures.ts
import { faker } from '@faker-js/faker';
import { createUser } from '../seeds/factories/user.factory';

/**
 * Create a minimal test fixture — only what the test needs.
 * Unlike full seeds, fixtures are scoped to individual tests.
 */
export async function createTestUser(db: PrismaClient, overrides: Partial<UserSeed> = {}) {
  const data = createUser(overrides);
  return db.user.create({ data });
}

export async function createTestPostWithAuthor(db: PrismaClient) {
  const author = await createTestUser(db);
  const post = await db.post.create({
    data: {
      ...createPost(),
      authorId: author.id,
    },
  });
  return { author, post };
}

// Usage in test
describe('Post API', () => {
  beforeEach(async () => {
    faker.seed(123); // Deterministic per test
    await cleanDatabase();
  });

  it('returns published posts', async () => {
    const { post } = await createTestPostWithAuthor(prisma);
    const response = await app.get('/api/posts');
    expect(response.body.data).toHaveLength(1);
  });
});
```

## Common Pitfalls

1. **Non-deterministic seeds breaking tests** — If tests depend on seeded data, they must be deterministic. Always call `faker.seed(N)` before generating data.
2. **Foreign key order** — Seed parent tables before children. Users before posts, posts before comments. Truncate in reverse order.
3. **Using production seed scripts in tests** — Full seeds are slow. Tests should use minimal fixtures scoped to what they need.
4. **Hardcoded IDs** — Never hardcode UUIDs unless necessary for demo accounts. Let the database generate IDs and reference them via variables.
5. **Seeding passwords in plain text** — Even in dev, use hashed passwords. Store a known dev password hash as a constant to avoid hashing per-user (which is slow).
6. **Not cleaning before seeding** — Always truncate before seeding. Running seed twice should produce the same result (idempotent).
7. **Forgetting `CASCADE` on truncate** — `TRUNCATE users` fails if posts reference users. Use `TRUNCATE users CASCADE` or truncate in correct order.

## Best Practices

- **Factory + Scenario pattern**: Factories generate individual entities, scenarios compose them into meaningful datasets
- **Deterministic for tests**: Always `faker.seed(N)` in test fixtures
- **Dev login credentials**: Always create a known admin account (`admin@localhost.dev` / `admin123`) for easy dev login
- **Batch inserts**: Use `createMany` or raw `INSERT` for performance, not individual `create` calls
- **Realistic volumes**: Dev seeds should be small (fast), staging seeds should match production scale
- **Weighted distributions**: Use `faker.helpers.weightedArrayElement` for realistic role/status distributions
- **Separate demo data**: Curated, handcrafted data for demos — not random faker output
