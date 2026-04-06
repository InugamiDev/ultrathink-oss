-- Migration 010: Audit fixes
-- 1. Add missing strength column to memory_relations
-- 2. Add stale adaptation cleanup support

-- memory_relations.strength was used in code but never added in migration 002
ALTER TABLE memory_relations ADD COLUMN IF NOT EXISTS strength DECIMAL(4,3) DEFAULT 0.5;

-- Index for adaptation staleness queries
CREATE INDEX IF NOT EXISTS idx_adaptations_staleness
  ON adaptations (is_active, last_applied_at, times_applied)
  WHERE is_active = true;
