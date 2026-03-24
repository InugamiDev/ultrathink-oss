-- Migration 007: Add tsvector full-text search + ensure pg_trgm indexes
-- Provides 3-tier search: tsvector (best) → pg_trgm (fuzzy) → ILIKE (fallback)

-- 1. Add tsvector column for full-text search
ALTER TABLE memories ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- 2. Auto-update trigger: keeps search_vector in sync with content
CREATE OR REPLACE FUNCTION memories_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memories_search_vector ON memories;
CREATE TRIGGER trg_memories_search_vector
  BEFORE INSERT OR UPDATE OF content ON memories
  FOR EACH ROW EXECUTE FUNCTION memories_search_vector_update();

-- 3. GIN index for fast tsvector lookups
CREATE INDEX IF NOT EXISTS idx_memories_search_vector ON memories USING GIN(search_vector);

-- 4. Ensure pg_trgm extension and trigram index exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_memories_content_trgm ON memories USING GIN(content gin_trgm_ops);

-- 5. Backfill existing rows
UPDATE memories SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;
