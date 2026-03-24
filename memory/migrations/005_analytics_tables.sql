-- Migration 005: Usage analytics

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

-- Command usage (legacy compat)
CREATE TABLE IF NOT EXISTS command_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command VARCHAR(100) NOT NULL,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL
);

-- Daily aggregates (materialized by compaction job)
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
