-- Migration 016: Temporal validity on identity graph edges (MemPalace)
--
-- Adds valid_from / valid_to columns to memory_relations so identity edges
-- can be time-bounded. When a conflicting preference is added (e.g., user
-- switches from "Tailwind v3" to "Tailwind v4"), the old edge gets
-- valid_to = NOW() instead of being deleted — preserving history.
--
-- Queries default to WHERE valid_to IS NULL (current facts only).
-- Set includeHistory = true to also return expired edges.

ALTER TABLE memory_relations
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE memory_relations
  ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ DEFAULT NULL;

-- Index for fast "current edges only" queries (most common path)
CREATE INDEX IF NOT EXISTS idx_memory_relations_valid_to
  ON memory_relations (source_id, target_id)
  WHERE valid_to IS NULL;

-- Index for history queries (range scans on valid_from)
CREATE INDEX IF NOT EXISTS idx_memory_relations_temporal
  ON memory_relations (source_id, valid_from DESC)
  WHERE valid_to IS NOT NULL;
