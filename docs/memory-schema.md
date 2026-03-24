# Memory Schema Reference

## Overview

The UltraThink database schema is defined across 5 migration files in `memory/migrations/` and consolidated in `memory/schema/schema.sql`. The database runs on Neon serverless Postgres with the `uuid-ossp` and `vector` extensions.

## Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector for semantic search
```

## Tables

### `sessions`

Tracks individual work sessions. Every memory, task, and hook event can link back to its originating session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Session identifier |
| `started_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Session start time |
| `ended_at` | TIMESTAMPTZ | Nullable | Session end time |
| `summary` | TEXT | Nullable | What was accomplished |
| `task_context` | TEXT | Nullable | What the session was working on |
| `memories_created` | INT | Default 0 | Count of memories created in this session |
| `memories_accessed` | INT | Default 0 | Count of memories read in this session |

**Indexes**: `idx_sessions_started_at` on `started_at DESC`

---

### `plans`

Stores plan metadata. The actual plan content lives in Markdown files; this table tracks status and linkage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Plan identifier |
| `title` | VARCHAR(500) | NOT NULL | Plan title |
| `status` | VARCHAR(20) | NOT NULL, default `draft` | One of: `draft`, `active`, `completed`, `archived`, `abandoned` |
| `file_path` | TEXT | Nullable | Path to the plan's Markdown file |
| `summary` | TEXT | Nullable | Brief description of the plan |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Last update time |
| `archived_at` | TIMESTAMPTZ | Nullable | When the plan was archived |
| `session_id` | UUID | FK -> sessions(id) ON DELETE SET NULL | Originating session |

**Indexes**: `idx_plans_status` on `(status, created_at DESC)`

---

### `memories`

The core table. Stores all persistent memories with metadata for retrieval, scoring, and semantic search.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Memory identifier |
| `content` | TEXT | NOT NULL | The memory content |
| `category` | VARCHAR(50) | NOT NULL | `decision`, `pattern`, `preference`, `solution`, `architecture`, `convention`, `insight` |
| `importance` | SMALLINT | Default 5, CHECK 1-10 | 10 = critical, 1 = minor |
| `confidence` | DECIMAL(3,2) | Default 0.80, CHECK 0-1 | 1.0 = verified, 0.5 = guess |
| `scope` | VARCHAR(100) | Nullable | Project/file scope |
| `source` | VARCHAR(200) | Nullable | Where this info came from |
| `session_id` | UUID | FK -> sessions(id) ON DELETE SET NULL | Originating session |
| `plan_id` | UUID | FK -> plans(id) ON DELETE SET NULL | Associated plan |
| `file_path` | TEXT | Nullable | Related file path |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Last update time |
| `accessed_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Last access time |
| `access_count` | INT | Default 0 | Number of times accessed |
| `is_archived` | BOOLEAN | Default FALSE | Archived status |
| `is_compacted` | BOOLEAN | Default FALSE | Compaction status |

**Indexes**:
- `idx_memories_category_importance` on `(category, importance DESC, created_at DESC)`
- `idx_memories_scope` on `(scope, created_at DESC)`
- `idx_memories_archived` on `(is_archived, created_at DESC)`
- `idx_memories_content_trgm` using GIN on `(content gin_trgm_ops)` for fuzzy search

---

### `memory_tags`

Join table for tagging memories. A memory can have multiple tags, and tags are used for filtered recall.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `memory_id` | UUID | PK (composite), FK -> memories(id) ON DELETE CASCADE | Memory reference |
| `tag` | VARCHAR(100) | PK (composite), NOT NULL | Tag string |

**Indexes**: `idx_memory_tags_tag` on `tag`

**Example tags**: `#architecture`, `#frontend`, `#verified`, `#bugfix`, `#nextjs`

---

### `memory_relations`

Links memories to other memories with typed relationships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `source_id` | UUID | PK (composite), FK -> memories(id) ON DELETE CASCADE | Source memory |
| `target_id` | UUID | PK (composite), FK -> memories(id) ON DELETE CASCADE | Target memory |
| `relation_type` | VARCHAR(50) | NOT NULL | Relationship type |

**Relation types**: `supersedes`, `contradicts`, `extends`, `supports`, `related`

---

### `summaries`

Stores compacted memory summaries. Created by the compaction process when low-importance memories are consolidated.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Summary identifier |
| `scope` | VARCHAR(100) | Nullable | Scope of the summarized memories |
| `summary` | TEXT | NOT NULL | Consolidated summary text |
| `memory_count` | INT | Nullable | Number of memories summarized |
| `date_range_start` | TIMESTAMPTZ | Nullable | Earliest memory in the batch |
| `date_range_end` | TIMESTAMPTZ | Nullable | Latest memory in the batch |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | When the summary was created |

---

### `tasks`

Kanban board tasks. Tasks can be linked to plans and organized across boards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Task identifier |
| `title` | VARCHAR(500) | NOT NULL | Task title |
| `description` | TEXT | Nullable | Detailed description |
| `status` | VARCHAR(20) | NOT NULL, default `backlog` | One of: `backlog`, `planned`, `in-progress`, `blocked`, `review`, `done`, `archived` |
| `priority` | SMALLINT | Default 5, CHECK 1-10 | 10 = highest priority |
| `plan_id` | UUID | FK -> plans(id) ON DELETE SET NULL | Associated plan |
| `board` | VARCHAR(100) | NOT NULL, default `main` | Board name |
| `position` | INT | Default 0 | Position within the column |
| `assignee` | VARCHAR(100) | Nullable | Assigned person/agent |
| `labels` | TEXT[] | Nullable | Array of label strings |
| `due_date` | TIMESTAMPTZ | Nullable | Task deadline |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Last update time |

**Indexes**:
- `idx_tasks_board_status` on `(board, status, position)`
- `idx_tasks_plan` on `plan_id`

---

### `decisions`

Architectural Decision Records (ADRs) stored as structured data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Decision identifier |
| `title` | VARCHAR(500) | NOT NULL | Decision title |
| `context` | TEXT | Nullable | Why this decision was needed |
| `decision` | TEXT | NOT NULL | What was decided |
| `consequences` | TEXT | Nullable | What this means going forward |
| `alternatives` | TEXT | Nullable | Options that were considered |
| `status` | VARCHAR(20) | NOT NULL, default `accepted` | One of: `proposed`, `accepted`, `deprecated`, `superseded` |
| `superseded_by` | UUID | FK -> decisions(id), self-referential | Replacement decision |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Last update time |

---

### `journals`

Journey journals created when plans are archived. Captures the full lifecycle of a plan.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Journal identifier |
| `plan_id` | UUID | FK -> plans(id) ON DELETE CASCADE | Associated plan |
| `planned` | TEXT | Nullable | What was planned |
| `implemented` | TEXT | Nullable | What was actually implemented |
| `blockers` | TEXT | Nullable | Blockers encountered |
| `outcomes` | TEXT | Nullable | Results and outcomes |
| `lessons` | TEXT | Nullable | Lessons learned |
| `followup_debt` | TEXT | Nullable | Technical debt or follow-up items |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Creation time |

---

### `hook_events`

Audit trail for all hook executions. The privacy hook, memory save hook, and other hooks log events here.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Event identifier |
| `event_type` | VARCHAR(50) | NOT NULL | `file_read`, `file_write`, `file_blocked`, `file_approved` |
| `severity` | VARCHAR(20) | NOT NULL, default `info` | One of: `info`, `warning`, `critical` |
| `description` | TEXT | Nullable | Human-readable description |
| `path_accessed` | TEXT | Nullable | File path involved |
| `action_taken` | VARCHAR(50) | Nullable | `allowed`, `blocked`, `prompted`, `approved`, `denied` |
| `hook_name` | VARCHAR(100) | Nullable | Which hook generated this event |
| `session_id` | UUID | FK -> sessions(id) ON DELETE SET NULL | Associated session |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Event timestamp |

**Indexes**:
- `idx_hook_events_type` on `(event_type, created_at DESC)`
- `idx_hook_events_severity` on `(severity, created_at DESC)`
- `idx_hook_events_session` on `(session_id, created_at DESC)`

---

### `security_incidents`

Tracks security incidents escalated from hook events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Incident identifier |
| `hook_event_id` | UUID | FK -> hook_events(id) | Originating hook event |
| `title` | VARCHAR(500) | NOT NULL | Incident title |
| `description` | TEXT | Nullable | Detailed description |
| `resolution` | TEXT | Nullable | How the incident was resolved |
| `status` | VARCHAR(20) | NOT NULL, default `open` | One of: `open`, `investigating`, `resolved`, `false_positive` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Creation time |
| `resolved_at` | TIMESTAMPTZ | Nullable | Resolution time |

---

### `skill_usage`

Analytics table tracking skill invocations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Record identifier |
| `skill_id` | VARCHAR(100) | NOT NULL | Skill name |
| `invoked_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Invocation timestamp |
| `duration_ms` | INT | Nullable | Execution duration in milliseconds |
| `success` | BOOLEAN | Default TRUE | Whether the invocation succeeded |
| `error_message` | TEXT | Nullable | Error details if failed |
| `session_id` | UUID | FK -> sessions(id) ON DELETE SET NULL | Associated session |

**Indexes**:
- `idx_skill_usage_skill` on `(skill_id, invoked_at DESC)`
- `idx_skill_usage_session` on `session_id`

---

### `command_usage`

Analytics table tracking command invocations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Record identifier |
| `command` | VARCHAR(100) | NOT NULL | Command name |
| `invoked_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Invocation timestamp |
| `session_id` | UUID | FK -> sessions(id) ON DELETE SET NULL | Associated session |

---

### `daily_stats`

Aggregated daily statistics for dashboard display.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `date` | DATE | PK | Statistics date |
| `total_sessions` | INT | Default 0 | Sessions started on this date |
| `total_memories_created` | INT | Default 0 | Memories created |
| `total_skills_invoked` | INT | Default 0 | Skills invoked |
| `total_hook_events` | INT | Default 0 | Hook events logged |
| `total_tasks_completed` | INT | Default 0 | Tasks moved to done |
| `top_skills` | JSONB | Default `[]` | Most-used skills |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Record creation time |

## Entity Relationship Summary

```
sessions 1--N memories
sessions 1--N hook_events
sessions 1--N skill_usage
sessions 1--N command_usage
sessions 1--N plans

plans 1--N tasks
plans 1--N journals
plans 1--N memories

memories N--N memory_tags
memories N--N memory_relations (self-referential)

hook_events 1--1 security_incidents
decisions ---> decisions (superseded_by, self-referential)
```

## Migrations

Migrations are applied in order:

| Migration | Description |
|-----------|-------------|
| `001_initial.sql` | Extensions, sessions, plans tables |
| `002_memory_tables.sql` | Memories, memory_tags, memory_relations, summaries |
| `003_workflow_tables.sql` | Tasks, decisions, journals |
| `004_security_tables.sql` | Hook_events, security_incidents |
| `005_analytics_tables.sql` | Skill_usage, command_usage, daily_stats |

Run migrations:
```bash
npm run migrate
```

## Related Documentation

- [Memory System](./memory-system.md) -- Memory architecture and policies
- [How to Extend Memory](./how-to-extend-memory.md) -- Adding custom tables and queries
- [Kanban Workflow](./kanban-workflow.md) -- Tasks table usage
- [Hooks and Privacy](./hooks-and-privacy.md) -- Hook events table usage
