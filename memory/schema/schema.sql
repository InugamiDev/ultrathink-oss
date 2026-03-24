-- UltraThink Full Database Schema
-- Combined from all migrations for reference
-- Use migrations/ for actual deployment

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary TEXT,
  task_context TEXT,
  memories_created INT DEFAULT 0,
  memories_accessed INT DEFAULT 0
);

CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived', 'abandoned')),
  file_path TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_plans_status ON plans(status, created_at DESC);

-- ============================================================
-- MEMORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  importance SMALLINT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  confidence DECIMAL(3,2) DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  scope VARCHAR(100),
  source VARCHAR(200),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  file_path TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  is_compacted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_memories_category_importance ON memories(category, importance DESC, created_at DESC);
CREATE INDEX idx_memories_scope ON memories(scope, created_at DESC);
CREATE INDEX idx_memories_archived ON memories(is_archived, created_at DESC);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- MEMORY TAGS & RELATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_tags (
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (memory_id, tag)
);

CREATE INDEX idx_memory_tags_tag ON memory_tags(tag);

CREATE TABLE IF NOT EXISTS memory_relations (
  source_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL,
  PRIMARY KEY (source_id, target_id)
);

-- ============================================================
-- MEMORY SUMMARIES
-- ============================================================
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(100),
  summary TEXT NOT NULL,
  memory_count INT,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASKS (KANBAN)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'planned', 'in-progress', 'blocked', 'review', 'done', 'archived')),
  priority SMALLINT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  board VARCHAR(100) NOT NULL DEFAULT 'main',
  position INT DEFAULT 0,
  assignee VARCHAR(100),
  labels TEXT[],
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_board_status ON tasks(board, status, position);
CREATE INDEX idx_tasks_plan ON tasks(plan_id);

-- ============================================================
-- DECISIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  context TEXT,
  decision TEXT NOT NULL,
  consequences TEXT,
  alternatives TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('proposed', 'accepted', 'deprecated', 'superseded')),
  superseded_by UUID REFERENCES decisions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOURNALS
-- ============================================================
CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  planned TEXT,
  implemented TEXT,
  blockers TEXT,
  outcomes TEXT,
  lessons TEXT,
  followup_debt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECURITY
-- ============================================================
CREATE TABLE IF NOT EXISTS hook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  description TEXT,
  path_accessed TEXT,
  action_taken VARCHAR(50)
    CHECK (action_taken IN ('allowed', 'blocked', 'prompted', 'approved', 'denied')),
  hook_name VARCHAR(100),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hook_events_type ON hook_events(event_type, created_at DESC);
CREATE INDEX idx_hook_events_severity ON hook_events(severity, created_at DESC);
CREATE INDEX idx_hook_events_session ON hook_events(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_event_id UUID REFERENCES hook_events(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  resolution TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================
-- ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id VARCHAR(100) NOT NULL,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_skill_usage_skill ON skill_usage(skill_id, invoked_at DESC);
CREATE INDEX idx_skill_usage_session ON skill_usage(session_id);

CREATE TABLE IF NOT EXISTS command_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command VARCHAR(100) NOT NULL,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  total_memories_created INT DEFAULT 0,
  total_skills_invoked INT DEFAULT 0,
  total_hook_events INT DEFAULT 0,
  total_tasks_completed INT DEFAULT 0,
  top_skills JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date)
);
