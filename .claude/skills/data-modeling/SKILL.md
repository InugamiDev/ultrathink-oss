---
name: data-modeling
description: Database schema design, normalization to BCNF, entity-relationship modeling, indexing strategies, and migration planning
layer: utility
category: development
triggers:
  - "database schema"
  - "data model"
  - "ER diagram"
  - "normalize"
  - "database design"
  - "migration"
  - "indexing strategy"
  - "schema design"
inputs:
  - requirements: Business requirements and entities to model
  - existing_schema: Current schema (if modifying existing database)
  - orm: Prisma | Drizzle | TypeORM | Sequelize | raw SQL (optional)
  - database: PostgreSQL | MySQL | SQLite | MongoDB (optional)
outputs:
  - schema: Database schema definition (SQL or ORM format)
  - er_diagram: Mermaid ER diagram of the schema
  - normalization_analysis: Normal form assessment with justification
  - indexes: Recommended indexes with query justification
  - migration_plan: Steps to migrate from current to target schema
linksTo:
  - api-designer
  - mermaid
  - error-handling
linkedFrom:
  - orchestrator
  - planner
  - code-architect
preferredNextSkills:
  - api-designer
  - mermaid
fallbackSkills:
  - sequential-thinking
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# Data Modeling

## Purpose

This skill designs database schemas that are normalized, performant, and maintainable. It covers entity-relationship modeling, normalization analysis (targeting BCNF as the standard), indexing strategies, and migration planning. Schemas are produced in both SQL and ORM-specific formats.

## Key Concepts

### Normalization Levels

```
1NF — First Normal Form:
  ✓ All columns contain atomic (indivisible) values
  ✓ Each row is unique (has a primary key)
  ✗ No repeating groups or arrays in columns

2NF — Second Normal Form:
  ✓ Meets 1NF
  ✓ No partial dependencies (all non-key columns depend on the ENTIRE primary key)
  ✗ Only relevant for composite primary keys

3NF — Third Normal Form:
  ✓ Meets 2NF
  ✓ No transitive dependencies (non-key columns don't depend on other non-key columns)
  Example violation: orders table with customer_name derived from customer_id

BCNF — Boyce-Codd Normal Form (TARGET STANDARD):
  ✓ Meets 3NF
  ✓ Every determinant is a candidate key
  ✓ No anomalies possible from functional dependencies
```

### When to Denormalize

Denormalization is acceptable ONLY when:

```
1. READ PERFORMANCE: A join-heavy query is a proven bottleneck (measured, not assumed)
2. MATERIALIZED DATA: Computed values that are expensive to derive (store alongside source)
3. EVENT SOURCING: Immutable event records that capture state at a point in time
4. CACHING LAYER: The denormalized data is a cache, not the source of truth

RULE: Start normalized. Denormalize only when you have benchmarks proving the need.
DOCUMENT: Every denormalization must have a comment explaining WHY.
```

### Data Type Selection

```
IDENTIFIERS:
  Primary keys → UUID (uuid/gen_random_uuid()) — no info leakage, merge-friendly
  Alternative  → ULID/CUID2 — sortable, no coordination needed
  Avoid        → Auto-increment integers for public-facing IDs

TEXT:
  Short fixed  → VARCHAR(N) with explicit limit (name VARCHAR(100))
  Variable     → TEXT (no practical limit, same performance as VARCHAR in PostgreSQL)
  Enum-like    → Create an ENUM type or use a lookup table

NUMBERS:
  Money        → INTEGER (store as cents/smallest unit) or DECIMAL(19,4)
  Counters     → INTEGER or BIGINT
  Percentages  → DECIMAL(5,2) for precision, or INTEGER (store as basis points)
  Float math   → NUMERIC/DECIMAL (never use FLOAT for financial data)

DATES:
  Timestamps   → TIMESTAMPTZ (always with timezone in PostgreSQL)
  Dates only   → DATE
  Durations    → INTERVAL or INTEGER (store as seconds)

BOOLEAN:
  Binary state → BOOLEAN
  Multi-state  → ENUM or lookup table (future-proofs against "maybe" states)

JSON:
  Semi-struct  → JSONB (PostgreSQL) — when schema varies per row
  Metadata     → JSONB — for extensible key-value data
  Avoid        → Don't store relational data as JSON
```

## Design Workflow

### Phase 1: Entity Discovery

```
STEP 1: Identify nouns in the requirements
  "Users can create organizations, invite members, and manage projects with tasks"
  ENTITIES: User, Organization, Member(ship), Project, Task

STEP 2: Identify attributes for each entity
  User: id, email, name, password_hash, created_at
  Organization: id, name, slug, created_at
  Project: id, name, description, status, org_id
  Task: id, title, description, status, priority, project_id, assignee_id

STEP 3: Identify relationships
  User ←→ Organization: many-to-many (through Membership)
  Organization → Project: one-to-many
  Project → Task: one-to-many
  User → Task: one-to-many (assignee)
```

### Phase 2: Relationship Modeling

```
ONE-TO-MANY:
  Parent table (one) has no FK
  Child table (many) has FK referencing parent
  Example: project_id in tasks table → projects.id

MANY-TO-MANY:
  Join table with FKs to both sides
  May include relationship attributes (role, joined_at)
  Example: memberships(user_id, org_id, role, joined_at)

ONE-TO-ONE:
  FK on either side (put it on the dependent entity)
  Or merge into one table if always loaded together
  Example: user_profiles(user_id FK, bio, avatar_url)

SELF-REFERENTIAL:
  FK on the same table
  Example: comments(id, parent_comment_id FK, content)

POLYMORPHIC (AVOID IF POSSIBLE):
  Instead of: commentable_type + commentable_id
  Prefer: separate FKs (post_id, product_id) with CHECK constraint
  Or: separate join tables (post_comments, product_comments)
```

### Phase 3: Schema Definition

#### PostgreSQL Example

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$')
);

-- Organizations table
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT organizations_slug_unique UNIQUE (slug),
  CONSTRAINT organizations_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
);

-- Memberships (join table with attributes)
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role        membership_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT memberships_user_org_unique UNIQUE (user_id, org_id)
);

-- Projects
CREATE TYPE project_status AS ENUM ('active', 'archived', 'deleted');

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  status      project_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  status      task_status NOT NULL DEFAULT 'todo',
  priority    task_priority NOT NULL DEFAULT 'medium',
  due_date    DATE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Prisma Example

```prisma
model User {
  id           String       @id @default(uuid()) @db.Uuid
  email        String       @unique @db.VarChar(255)
  name         String       @db.VarChar(100)
  passwordHash String       @map("password_hash") @db.VarChar(255)
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  memberships  Membership[]
  assignedTasks Task[]      @relation("TaskAssignee")

  @@map("users")
}

model Organization {
  id        String       @id @default(uuid()) @db.Uuid
  name      String       @db.VarChar(100)
  slug      String       @unique @db.VarChar(100)
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  memberships Membership[]
  projects    Project[]

  @@map("organizations")
}

model Membership {
  id       String         @id @default(uuid()) @db.Uuid
  userId   String         @map("user_id") @db.Uuid
  orgId    String         @map("org_id") @db.Uuid
  role     MembershipRole @default(member)
  joinedAt DateTime       @default(now()) @map("joined_at") @db.Timestamptz

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
  @@map("memberships")
}

enum MembershipRole {
  owner
  admin
  member
  viewer
}
```

### Phase 4: Index Design

```
PRINCIPLE: Every index costs write performance. Add only for proven query patterns.

STEP 1: Identify query patterns
  Q1: Get user by email (login)           → users.email (already unique)
  Q2: List org members                    → memberships.org_id
  Q3: List project tasks by status        → tasks(project_id, status)
  Q4: List user's tasks across projects   → tasks.assignee_id
  Q5: Sort tasks by position within project → tasks(project_id, position)

STEP 2: Create indexes
  -- Already covered by unique constraints:
  -- users.email, organizations.slug, memberships(user_id, org_id)

  -- Additional indexes for query patterns:
  CREATE INDEX idx_memberships_org ON memberships(org_id);
  CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
  CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
  CREATE INDEX idx_tasks_project_position ON tasks(project_id, position);

STEP 3: Consider partial indexes
  -- Only index active projects (archived/deleted rarely queried)
  CREATE INDEX idx_projects_org_active
    ON projects(org_id)
    WHERE status = 'active';

STEP 4: Consider covering indexes (for read-heavy queries)
  -- Include frequently selected columns to avoid table lookup
  CREATE INDEX idx_tasks_list
    ON tasks(project_id, status)
    INCLUDE (title, priority, assignee_id, position);
```

## Migration Planning

### Safe Migration Checklist

```
BEFORE MIGRATION:
  [ ] Backup the database
  [ ] Test migration on staging with production-sized data
  [ ] Estimate migration duration
  [ ] Plan rollback procedure
  [ ] Identify if downtime is required

SAFE OPERATIONS (no downtime):
  ✓ Add a new table
  ✓ Add a new nullable column
  ✓ Add a new index (CONCURRENTLY in PostgreSQL)
  ✓ Add a new enum value
  ✓ Rename a table (if using views for backward compatibility)

UNSAFE OPERATIONS (require planning):
  ✗ Drop a column → First deploy code that doesn't read it, then drop
  ✗ Rename a column → Add new column, migrate data, update code, drop old
  ✗ Change column type → Add new column, migrate, swap
  ✗ Add NOT NULL to existing column → Add default first, backfill NULLs, then add constraint
  ✗ Add UNIQUE constraint → First verify no duplicates exist
```

### Multi-Step Migration Pattern

```
For renaming column 'name' to 'full_name' on users table:

MIGRATION 1 (deploy):
  ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
  UPDATE users SET full_name = name;
  -- Application reads from both, writes to both

MIGRATION 2 (deploy):
  -- Application reads from full_name, writes to both
  ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

MIGRATION 3 (deploy):
  -- Application only uses full_name
  ALTER TABLE users DROP COLUMN name;
```

## Normalization Analysis Template

```
TABLE: orders
COLUMNS: id, user_id, user_email, product_id, product_name, product_price, quantity, total

ANALYSIS:
  1NF: ✓ All values are atomic
  2NF: ✗ VIOLATION — user_email depends on user_id (partial dependency if composite key)
  3NF: ✗ VIOLATION — user_email transitively depends on id through user_id
       ✗ VIOLATION — product_name, product_price depend on product_id
  BCNF: ✗ (fails 3NF, so fails BCNF)

RESOLUTION:
  Remove user_email → look up via users table join
  Remove product_name, product_price → look up via products table join
  OR: Keep product_price as "price_at_purchase" (intentional denormalization for historical accuracy)

NORMALIZED:
  orders: id, user_id, quantity, total, created_at
  order_items: id, order_id, product_id, quantity, unit_price_cents (snapshot at purchase time)
  users: id, email, name
  products: id, name, price_cents
```

## Anti-Patterns

1. **Entity-Attribute-Value (EAV)**: Using a generic `key-value` table instead of proper columns. Destroys type safety, query performance, and referential integrity. Use JSONB for truly dynamic data.
2. **Polymorphic associations**: `commentable_type + commentable_id` cannot have foreign key constraints. Use separate tables or separate FK columns.
3. **Storing money as FLOAT**: Floating-point arithmetic causes rounding errors. Use INTEGER (cents) or DECIMAL.
4. **Missing timestamps**: Tables without `created_at` and `updated_at` make debugging and auditing impossible.
5. **No soft delete strategy**: Hard deleting records breaks referential integrity and audit trails. Use `deleted_at` timestamp or a status enum.
6. **Over-indexing**: Indexes on every column slow down writes and waste storage. Index only for proven query patterns.
7. **Timestamps without timezone**: Using TIMESTAMP instead of TIMESTAMPTZ leads to timezone ambiguity bugs.

## Integration Notes

- Generate ER diagrams via **mermaid** for visual documentation of the schema.
- Align schema design with **api-designer** to ensure API resources map cleanly to database entities.
- Use **error-handling** to implement proper database error handling (unique violations, FK violations, etc.).
- Validate normalization decisions with **sequential-thinking** for complex schemas.
