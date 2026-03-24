# Database Schema

UltraThink's database runs on Neon serverless Postgres with `uuid-ossp`, `pgvector`, and `pg_trgm` extensions.

## Entity Relationship Diagram

```mermaid
erDiagram
    sessions {
        uuid id PK
        timestamptz started_at
        timestamptz ended_at
        text summary
        text task_context
        int memories_created
        int memories_accessed
        bigint input_tokens
        bigint output_tokens
        bigint cache_read_tokens
        bigint cache_write_tokens
        varchar model
        decimal cost_usd
    }

    memories {
        uuid id PK
        text content
        varchar category
        smallint importance
        decimal confidence
        varchar scope
        varchar source
        uuid session_id FK
        uuid plan_id FK
        text file_path
        vector embedding
        tsvector search_vector
        text search_enrichment
        boolean is_archived
        boolean is_compacted
        int access_count
        timestamptz created_at
        timestamptz updated_at
        timestamptz accessed_at
    }

    memory_tags {
        uuid memory_id PK,FK
        varchar tag PK
    }

    memory_relations {
        uuid source_id PK,FK
        uuid target_id PK,FK
        varchar relation_type
        decimal strength
    }

    summaries {
        uuid id PK
        varchar scope
        text summary
        int memory_count
        timestamptz date_range_start
        timestamptz date_range_end
    }

    plans {
        uuid id PK
        varchar title
        varchar status
        text file_path
        text summary
        uuid session_id FK
        timestamptz created_at
        timestamptz archived_at
    }

    tasks {
        uuid id PK
        varchar title
        text description
        varchar status
        smallint priority
        uuid plan_id FK
        varchar board
        int position
        varchar assignee
        text_arr labels
        timestamptz due_date
    }

    decisions {
        uuid id PK
        varchar title
        text context
        text decision
        text consequences
        text alternatives
        varchar status
        uuid superseded_by FK
    }

    journals {
        uuid id PK
        uuid plan_id FK
        text planned
        text implemented
        text blockers
        text outcomes
        text lessons
        text followup_debt
    }

    hook_events {
        uuid id PK
        varchar event_type
        varchar severity
        text description
        text path_accessed
        varchar action_taken
        varchar hook_name
        uuid session_id FK
    }

    security_incidents {
        uuid id PK
        uuid hook_event_id FK
        varchar title
        text description
        varchar status
        text resolution
        timestamptz resolved_at
    }

    skill_usage {
        uuid id PK
        varchar skill_id
        timestamptz invoked_at
        int duration_ms
        boolean success
        text error_message
        uuid session_id FK
    }

    daily_stats {
        date date PK
        int total_sessions
        int total_memories_created
        int total_skills_invoked
        int total_hook_events
        int total_tasks_completed
        jsonb top_skills
        bigint total_input_tokens
        bigint total_output_tokens
        decimal total_cost_usd
        jsonb cost_by_model
    }

    model_pricing {
        varchar model PK
        decimal input_per_mtok
        decimal output_per_mtok
        decimal cache_read_per_mtok
        decimal cache_write_per_mtok
        date effective_from
    }

    sessions ||--o{ memories : "creates"
    sessions ||--o{ plans : "creates"
    sessions ||--o{ hook_events : "logs"
    sessions ||--o{ skill_usage : "tracks"

    memories ||--o{ memory_tags : "tagged"
    memories ||--o{ memory_relations : "source"
    memories ||--o{ memory_relations : "target"

    plans ||--o{ tasks : "contains"
    plans ||--o{ journals : "records"
    plans ||--o{ memories : "references"

    decisions ||--o| decisions : "supersedes"

    hook_events ||--o| security_incidents : "escalates"
```

## Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram fuzzy search
```

## Key Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| memories | `search_vector` | GIN | Full-text search |
| memories | `content_trgm` | GIN (trigram) | Fuzzy matching |
| memories | `embedding` | IVFFlat | Vector similarity |
| memories | `scope_category` | B-tree | Scoped queries |
| hook_events | `event_type` | B-tree | Event filtering |
| hook_events | `severity` | B-tree | Severity filtering |
| skill_usage | `skill_id` | B-tree | Skill analytics |
| tasks | `board_status` | B-tree | Kanban queries |

## Tables Overview

### Core Tables

- **`sessions`** -- Tracks individual work sessions with start/end times, token usage, and cost
- **`memories`** -- Persistent memories with content, category, importance, confidence, and search vectors
- **`memory_tags`** -- Join table for tagging memories (composite PK: `memory_id` + `tag`)
- **`memory_relations`** -- Links memories with typed relationships (`supersedes`, `contradicts`, `extends`, `supports`, `related`)
- **`summaries`** -- Compacted memory summaries created during compaction

### Workflow Tables

- **`plans`** -- Plan metadata with status tracking (`draft` -> `active` -> `completed` -> `archived`)
- **`tasks`** -- Kanban board tasks with priority, assignee, labels, and due dates
- **`decisions`** -- Architecture Decision Records (ADRs) with self-referential `superseded_by`
- **`journals`** -- Journey journals created when plans are archived

### Observability Tables

- **`hook_events`** -- Audit trail for all hook executions (privacy, memory, quality)
- **`security_incidents`** -- Escalated security events from hook_events
- **`skill_usage`** -- Skill invocation analytics (timing, success/failure)
- **`daily_stats`** -- Aggregated daily statistics for the dashboard
- **`model_pricing`** -- Token pricing per model for cost tracking

## Migrations

Migrations are applied in order from `memory/migrations/`:

```bash
npm run migrate
```
