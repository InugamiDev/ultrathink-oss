# Memory Schema

Full database schema reference for the UltraThink memory system.

## Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram fuzzy search
```

## Tables

### `sessions`

Tracks individual work sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Session identifier |
| `started_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Start time |
| `ended_at` | TIMESTAMPTZ | Nullable | End time |
| `summary` | TEXT | Nullable | What was accomplished |
| `task_context` | TEXT | Nullable | What the session was working on |
| `memories_created` | INT | Default 0 | Memories created count |
| `memories_accessed` | INT | Default 0 | Memories read count |

### `memories`

Core table for persistent memories.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Memory identifier |
| `content` | TEXT | NOT NULL | Memory content |
| `category` | VARCHAR(50) | NOT NULL | `decision`, `pattern`, `preference`, `solution`, `architecture`, `convention`, `insight` |
| `importance` | SMALLINT | Default 5, CHECK 1-10 | 10 = critical, 1 = minor |
| `confidence` | DECIMAL(3,2) | Default 0.80, CHECK 0-1 | 1.0 = verified, 0.5 = guess |
| `scope` | VARCHAR(100) | Nullable | Project/file scope |
| `source` | VARCHAR(200) | Nullable | Information source |
| `session_id` | UUID | FK -> sessions | Originating session |
| `plan_id` | UUID | FK -> plans | Associated plan |
| `file_path` | TEXT | Nullable | Related file path |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Last update |
| `accessed_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Last access |
| `access_count` | INT | Default 0 | Access count |
| `is_archived` | BOOLEAN | Default FALSE | Archived status |
| `is_compacted` | BOOLEAN | Default FALSE | Compaction status |

**Indexes**: `category_importance`, `scope`, `archived`, `content_trgm` (GIN trigram)

### `memory_tags`

Join table for memory tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `memory_id` | UUID | PK (composite), FK -> memories ON DELETE CASCADE | Memory reference |
| `tag` | VARCHAR(100) | PK (composite), NOT NULL | Tag string |

### `memory_relations`

Typed relationships between memories.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `source_id` | UUID | PK (composite), FK -> memories ON DELETE CASCADE | Source |
| `target_id` | UUID | PK (composite), FK -> memories ON DELETE CASCADE | Target |
| `relation_type` | VARCHAR(50) | NOT NULL | `supersedes`, `contradicts`, `extends`, `supports`, `related` |

### `summaries`

Compacted memory summaries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Summary identifier |
| `scope` | VARCHAR(100) | Nullable | Scope of summarized memories |
| `summary` | TEXT | NOT NULL | Consolidated text |
| `memory_count` | INT | Nullable | Memories summarized |
| `date_range_start` | TIMESTAMPTZ | Nullable | Earliest memory |
| `date_range_end` | TIMESTAMPTZ | Nullable | Latest memory |

### `plans`

Plan metadata and status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Plan identifier |
| `title` | VARCHAR(500) | NOT NULL | Plan title |
| `status` | VARCHAR(20) | NOT NULL, default `draft` | `draft`, `active`, `completed`, `archived`, `abandoned` |
| `file_path` | TEXT | Nullable | Plan Markdown file |
| `summary` | TEXT | Nullable | Brief description |
| `session_id` | UUID | FK -> sessions | Originating session |

### `tasks`

Kanban board tasks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Task identifier |
| `title` | VARCHAR(500) | NOT NULL | Task title |
| `description` | TEXT | Nullable | Detailed description |
| `status` | VARCHAR(20) | NOT NULL, default `backlog` | `backlog`, `planned`, `in-progress`, `blocked`, `review`, `done`, `archived` |
| `priority` | SMALLINT | Default 5, CHECK 1-10 | 10 = highest |
| `plan_id` | UUID | FK -> plans | Associated plan |
| `board` | VARCHAR(100) | NOT NULL, default `main` | Board name |
| `position` | INT | Default 0 | Column position |
| `assignee` | VARCHAR(100) | Nullable | Assigned person/agent |
| `labels` | TEXT[] | Nullable | Label array |
| `due_date` | TIMESTAMPTZ | Nullable | Deadline |

### `decisions`

Architecture Decision Records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Decision identifier |
| `title` | VARCHAR(500) | NOT NULL | Decision title |
| `context` | TEXT | Nullable | Why this was needed |
| `decision` | TEXT | NOT NULL | What was decided |
| `consequences` | TEXT | Nullable | Impact |
| `alternatives` | TEXT | Nullable | Options considered |
| `status` | VARCHAR(20) | NOT NULL, default `accepted` | `proposed`, `accepted`, `deprecated`, `superseded` |
| `superseded_by` | UUID | FK -> decisions (self) | Replacement decision |

### `journals`

Journey journals for archived plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Journal identifier |
| `plan_id` | UUID | FK -> plans ON DELETE CASCADE | Associated plan |
| `planned` | TEXT | Nullable | What was planned |
| `implemented` | TEXT | Nullable | What was built |
| `blockers` | TEXT | Nullable | Blockers encountered |
| `outcomes` | TEXT | Nullable | Results |
| `lessons` | TEXT | Nullable | Lessons learned |
| `followup_debt` | TEXT | Nullable | Technical debt |

### `hook_events`

Audit trail for hook executions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Event identifier |
| `event_type` | VARCHAR(50) | NOT NULL | `file_read`, `file_write`, `file_blocked`, `file_approved` |
| `severity` | VARCHAR(20) | NOT NULL, default `info` | `info`, `warning`, `critical` |
| `description` | TEXT | Nullable | Human-readable description |
| `path_accessed` | TEXT | Nullable | File path |
| `action_taken` | VARCHAR(50) | Nullable | `allowed`, `blocked`, `prompted`, `approved`, `denied` |
| `hook_name` | VARCHAR(100) | Nullable | Hook that generated this |
| `session_id` | UUID | FK -> sessions | Session reference |

### `security_incidents`

Escalated security events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Incident identifier |
| `hook_event_id` | UUID | FK -> hook_events | Originating event |
| `title` | VARCHAR(500) | NOT NULL | Incident title |
| `description` | TEXT | Nullable | Details |
| `status` | VARCHAR(20) | NOT NULL, default `open` | `open`, `investigating`, `resolved`, `false_positive` |
| `resolution` | TEXT | Nullable | How resolved |

### `skill_usage`

Skill invocation analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Record identifier |
| `skill_id` | VARCHAR(100) | NOT NULL | Skill name |
| `invoked_at` | TIMESTAMPTZ | NOT NULL, default NOW() | Timestamp |
| `duration_ms` | INT | Nullable | Execution time |
| `success` | BOOLEAN | Default TRUE | Success status |
| `error_message` | TEXT | Nullable | Error details |
| `session_id` | UUID | FK -> sessions | Session reference |

### `daily_stats`

Aggregated daily statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `date` | DATE | PK | Statistics date |
| `total_sessions` | INT | Default 0 | Sessions started |
| `total_memories_created` | INT | Default 0 | Memories created |
| `total_skills_invoked` | INT | Default 0 | Skills invoked |
| `total_hook_events` | INT | Default 0 | Hook events |
| `total_tasks_completed` | INT | Default 0 | Tasks completed |
| `top_skills` | JSONB | Default `[]` | Most-used skills |

### `model_pricing`

Token pricing per model.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `model` | VARCHAR | PK | Model name |
| `input_per_mtok` | DECIMAL | | Input cost per million tokens |
| `output_per_mtok` | DECIMAL | | Output cost per million tokens |
| `cache_read_per_mtok` | DECIMAL | | Cache read cost |
| `cache_write_per_mtok` | DECIMAL | | Cache write cost |
| `effective_from` | DATE | | When this pricing starts |

## Migrations

Applied in order from `memory/migrations/`:

| Migration | Description |
|-----------|-------------|
| `001_initial.sql` | Extensions, sessions, plans |
| `002_memory_tables.sql` | Memories, tags, relations, summaries |
| `003_workflow_tables.sql` | Tasks, decisions, journals |
| `004_security_tables.sql` | Hook events, security incidents |
| `005_analytics_tables.sql` | Skill usage, command usage, daily stats |

```bash
npm run migrate
```
