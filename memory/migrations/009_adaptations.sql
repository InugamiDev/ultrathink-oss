-- Migration 009: Tekiō — Cycle of Nova (適応)
-- Adaptive learning inspired by Mahoraga's wheel. Every failure turns the wheel,
-- triggers a nova, and forges a permanent counter-strategy. ∞ wheel spins.
--
-- Three adaptation types (like Mahoraga):
--   defensive  — become immune to a known failure (wheel turns → immunity)
--   auxiliary   — improve perception (wheel turns → awareness)
--   offensive   — modify approach to bypass obstacles (wheel turns → new strategy)

CREATE TABLE IF NOT EXISTS adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What triggers this adaptation (normalized failure pattern)
  trigger_pattern TEXT NOT NULL,

  -- The counter-strategy: what to do instead
  adaptation_rule TEXT NOT NULL,

  -- Original failure that caused this adaptation
  source_failure TEXT,

  -- Classification
  category VARCHAR(20) NOT NULL DEFAULT 'defensive'
    CHECK (category IN ('defensive', 'auxiliary', 'offensive')),

  -- Severity: how bad was the original failure (1-10)
  severity SMALLINT NOT NULL DEFAULT 5,

  -- Scope: project-specific or global
  scope VARCHAR(100) DEFAULT NULL,

  -- Tracking
  times_applied INT NOT NULL DEFAULT 0,
  times_prevented INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_applied_at TIMESTAMPTZ,

  -- Active flag — adaptations can be disabled if they become stale
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Link to the memory that recorded the original failure
  source_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,

  -- Tags for categorization
  tags TEXT[] DEFAULT '{}'
);

-- Fast lookup by trigger pattern (for matching incoming failures)
CREATE INDEX IF NOT EXISTS idx_adaptations_trigger
  ON adaptations USING GIN (to_tsvector('english', trigger_pattern));

-- Active adaptations by scope
CREATE INDEX IF NOT EXISTS idx_adaptations_active_scope
  ON adaptations (is_active, scope) WHERE is_active = true;

-- Most applied adaptations
CREATE INDEX IF NOT EXISTS idx_adaptations_applied
  ON adaptations (times_applied DESC) WHERE is_active = true;

-- Trigram index for fuzzy matching on trigger patterns
CREATE INDEX IF NOT EXISTS idx_adaptations_trigger_trgm
  ON adaptations USING GIN (trigger_pattern gin_trgm_ops);
