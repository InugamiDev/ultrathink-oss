-- Migration 003: Workflow entities (plans, tasks, decisions, journals)

-- Plans
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

-- Kanban tasks
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
  labels TEXT[], -- array of label strings
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_board_status ON tasks(board, status, position);
CREATE INDEX idx_tasks_plan ON tasks(plan_id);

-- Architectural decisions record
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

-- Plan journey journals
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

-- Link memories to plans
ALTER TABLE memories ADD CONSTRAINT fk_memories_plan
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL;
