-- Migration 011: Cost tracking
-- Adds token usage and cost tracking per session and per model.

-- Session-level token tracking
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS input_tokens BIGINT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS output_tokens BIGINT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_read_tokens BIGINT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_write_tokens BIGINT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,4) DEFAULT 0;

-- Model pricing reference (updated manually as pricing changes)
CREATE TABLE IF NOT EXISTS model_pricing (
  model VARCHAR(100) PRIMARY KEY,
  input_per_mtok DECIMAL(10,4) NOT NULL,
  output_per_mtok DECIMAL(10,4) NOT NULL,
  cache_read_per_mtok DECIMAL(10,4) DEFAULT 0,
  cache_write_per_mtok DECIMAL(10,4) DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT
);

-- Seed current Anthropic pricing (as of 2025-03)
INSERT INTO model_pricing (model, input_per_mtok, output_per_mtok, cache_read_per_mtok, cache_write_per_mtok, notes)
VALUES
  ('claude-opus-4-6',   15.00, 75.00, 1.50, 18.75, 'Opus 4.6 — thinking/planning'),
  ('claude-sonnet-4-6', 3.00, 15.00, 0.30, 3.75, 'Sonnet 4.6 — coding/implementing'),
  ('claude-haiku-4-5',  0.80, 4.00, 0.08, 1.00, 'Haiku 4.5 — fast/cheap tasks')
ON CONFLICT (model) DO NOTHING;

-- Daily cost aggregates
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS total_input_tokens BIGINT DEFAULT 0;
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT DEFAULT 0;
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS total_cost_usd DECIMAL(10,4) DEFAULT 0;
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS cost_by_model JSONB DEFAULT '{}'::jsonb;

-- Index for cost queries
CREATE INDEX IF NOT EXISTS idx_sessions_cost ON sessions(cost_usd DESC) WHERE cost_usd > 0;
CREATE INDEX IF NOT EXISTS idx_sessions_model ON sessions(model, started_at DESC);
