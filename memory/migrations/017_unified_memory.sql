-- intent: Unified Memory Architecture — MemPalace-inspired structural columns
-- status: done
-- confidence: high
-- next: backfill from existing categories, migrate decisions/summaries

-- Phase 1: Add structural columns to memories table
ALTER TABLE memories ADD COLUMN IF NOT EXISTS wing VARCHAR(30);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS hall VARCHAR(50);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS room VARCHAR(100);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS layer SMALLINT DEFAULT 2;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS token_estimate SMALLINT;

-- Backfill wing from existing category
UPDATE memories SET wing = CASE
  WHEN category IN ('identity', 'preference', 'style-preference', 'tool-preference', 'workflow-pattern') THEN 'identity'
  WHEN category IN ('solution', 'architecture', 'pattern', 'insight', 'decision', 'project-context') THEN 'project'
  WHEN category IN ('session-summary', 'correction-log', 'prediction') THEN 'system'
  WHEN category IN ('learning', 'error') THEN 'learning'
  ELSE 'project'
END
WHERE wing IS NULL;

-- Backfill hall from existing category
UPDATE memories SET hall = CASE
  WHEN category = 'preference' THEN 'preference'
  WHEN category = 'style-preference' THEN 'preference'
  WHEN category = 'tool-preference' THEN 'preference'
  WHEN category = 'workflow-pattern' THEN 'pattern'
  WHEN category = 'identity' THEN 'identity'
  WHEN category = 'decision' THEN 'decision'
  WHEN category = 'solution' THEN 'solution'
  WHEN category = 'architecture' THEN 'architecture'
  WHEN category = 'pattern' THEN 'pattern'
  WHEN category = 'insight' THEN 'insight'
  WHEN category = 'project-context' THEN 'context'
  WHEN category = 'session-summary' THEN 'summary'
  WHEN category = 'correction-log' THEN 'correction'
  WHEN category = 'prediction' THEN 'prediction'
  WHEN category = 'learning' THEN 'learning'
  WHEN category = 'error' THEN 'error'
  ELSE category
END
WHERE hall IS NULL;

-- Backfill layer from wing
UPDATE memories SET layer = CASE
  WHEN wing = 'identity' THEN 0
  WHEN category IN ('decision', 'architecture', 'workflow-pattern') THEN 1
  WHEN wing = 'project' THEN 2
  WHEN wing IN ('system', 'learning') THEN 3
  ELSE 2
END
WHERE layer IS NULL OR layer = 2;

-- Backfill token_estimate
UPDATE memories SET token_estimate = LEAST(length(content) / 4, 32767)::smallint
WHERE token_estimate IS NULL;

-- Indexes for 4-layer recall
CREATE INDEX IF NOT EXISTS idx_memories_wing_layer ON memories (wing, layer, importance DESC)
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_memories_hall ON memories (hall, importance DESC)
WHERE is_archived = false;

-- Migrate decisions table → memories (wing=project, hall=decision, layer=1)
-- Only migrate decisions that don't already have a memory equivalent
INSERT INTO memories (content, category, importance, confidence, scope, source, wing, hall, layer, token_estimate)
SELECT
  d.rule,
  'decision',
  d.priority,
  0.9,
  d.scope,
  d.source,
  'project',
  'decision',
  1,
  LEAST(length(d.rule) / 4, 32767)::smallint
FROM decisions d
WHERE d.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM memories m
    WHERE m.category = 'decision'
      AND similarity(m.content, d.rule) > 0.8
  )
ON CONFLICT DO NOTHING;

-- Migrate summaries table → memories (wing=system, hall=summary, layer=3)
INSERT INTO memories (content, category, importance, confidence, scope, wing, hall, layer, token_estimate, created_at)
SELECT
  s.summary,
  'session-summary',
  4,
  0.7,
  s.scope,
  'system',
  'summary',
  3,
  LEAST(length(s.summary) / 4, 32767)::smallint,
  s.created_at
FROM summaries s
WHERE NOT EXISTS (
  SELECT 1 FROM memories m
  WHERE m.category = 'session-summary'
    AND m.created_at = s.created_at
    AND m.scope = s.scope
)
ON CONFLICT DO NOTHING;
