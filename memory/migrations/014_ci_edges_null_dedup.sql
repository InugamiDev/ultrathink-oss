-- Migration 014: Partial unique index for NULL-target edge deduplication
-- The existing UNIQUE (source_symbol_id, target_symbol_id, edge_type) constraint
-- does not prevent duplicates when target_symbol_id IS NULL because NULL != NULL in SQL.
-- This adds a partial unique index covering the NULL-target case.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ci_edges_null_target_dedup
  ON ci_edges (source_symbol_id, edge_type, target_name, target_module)
  WHERE target_symbol_id IS NULL;
