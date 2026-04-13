-- intent: Decisions table for constraint engine
-- status: done
-- confidence: high

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY DEFAULT 'dec_' || substr(gen_random_uuid()::text, 1, 8),
  rule TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scope TEXT NOT NULL DEFAULT 'global',
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'claude', 'dashboard')),
  context TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  times_applied INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_active ON decisions (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_decisions_scope ON decisions (scope);
CREATE INDEX IF NOT EXISTS idx_decisions_source ON decisions (source);
CREATE INDEX IF NOT EXISTS idx_decisions_rule_search ON decisions USING gin (to_tsvector('english', rule));
