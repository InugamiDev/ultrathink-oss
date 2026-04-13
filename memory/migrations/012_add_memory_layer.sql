-- intent: Add MemPalace columns (layer, wing, hall, room) required by recall + memory code
-- status: done
-- confidence: high
-- context: Upstream migrations don't create these columns but src/recall.ts + memory.ts
--   reference them. This migration adds the missing schema.

ALTER TABLE memories ADD COLUMN IF NOT EXISTS layer SMALLINT DEFAULT 2;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS wing TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS hall TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS room TEXT;

-- Seed L0/L1 priority for high-importance memories
UPDATE memories SET layer = 0 WHERE layer IS NULL AND importance >= 9;
UPDATE memories SET layer = 1 WHERE layer IS NULL AND importance BETWEEN 7 AND 8;
UPDATE memories SET layer = 2 WHERE layer IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_layer ON memories (layer);
CREATE INDEX IF NOT EXISTS idx_memories_wing ON memories (wing);
CREATE INDEX IF NOT EXISTS idx_memories_hall ON memories (hall);
