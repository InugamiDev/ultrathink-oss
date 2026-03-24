-- Migration 008: Search enrichment for semantic-quality tsvector search
-- Adds enrichment text column and updates tsvector trigger to include it

-- 1. Add enrichment column (stores Claude-generated semantic keywords, synonyms, context)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS search_enrichment TEXT DEFAULT '';

-- 2. Update tsvector trigger to combine content + enrichment + category + tags
CREATE OR REPLACE FUNCTION memories_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := (
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.search_enrichment, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Rebuild trigger
DROP TRIGGER IF EXISTS trg_memories_search_vector ON memories;
CREATE TRIGGER trg_memories_search_vector
  BEFORE INSERT OR UPDATE OF content, search_enrichment, category ON memories
  FOR EACH ROW EXECUTE FUNCTION memories_search_vector_update();

-- 4. Backfill: regenerate search_vector with weighted components
UPDATE memories SET search_vector = (
  setweight(to_tsvector('english', COALESCE(content, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(search_enrichment, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C')
);
