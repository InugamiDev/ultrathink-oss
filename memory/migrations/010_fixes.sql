-- Migration 010: Audit fixes
-- 1. Add missing strength column to memory_relations

-- memory_relations.strength was used in code but never added in migration 002
ALTER TABLE memory_relations ADD COLUMN IF NOT EXISTS strength DECIMAL(4,3) DEFAULT 0.5;
