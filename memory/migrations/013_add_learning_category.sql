-- Migration 013: Add 'learning' category to adaptations CHECK constraint
-- The original CHECK in 009 only allowed defensive/auxiliary/offensive,
-- but the TypeScript code uses 'learning' for successful pattern adaptations.

ALTER TABLE adaptations DROP CONSTRAINT IF EXISTS adaptations_category_check;
ALTER TABLE adaptations ADD CONSTRAINT adaptations_category_check
  CHECK (category IN ('defensive', 'auxiliary', 'offensive', 'learning'));
