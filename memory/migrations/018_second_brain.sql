-- intent: Second Brain — 4-wing restructure (agent/user/knowledge/experience)
-- status: done
-- confidence: high

-- Phase 1: Backfill wing=identity → wing=user
UPDATE memories SET
  wing = 'user',
  hall = CASE
    WHEN category = 'identity' THEN 'profile'
    WHEN category IN ('preference', 'style-preference', 'tool-preference', 'workflow-pattern') THEN 'preferences'
    ELSE hall
  END
WHERE wing = 'identity';

-- Phase 2: Backfill wing=project → wing=knowledge
UPDATE memories SET
  wing = 'knowledge',
  hall = CASE
    WHEN category = 'decision' THEN 'decisions'
    WHEN category IN ('pattern', 'workflow-pattern') THEN 'patterns'
    WHEN category = 'insight' THEN 'insights'
    WHEN category IN ('architecture', 'solution') THEN 'decisions'
    WHEN category = 'project-context' THEN 'reference'
    ELSE hall
  END
WHERE wing = 'project';

-- Phase 3: Backfill wing=system/learning → wing=experience
UPDATE memories SET
  wing = 'experience',
  hall = CASE
    WHEN category = 'session-summary' THEN 'sessions'
    WHEN category = 'correction-log' THEN 'outcomes'
    WHEN category = 'prediction' THEN 'outcomes'
    WHEN category = 'error' THEN 'errors'
    WHEN category = 'learning' THEN 'outcomes'
    ELSE hall
  END
WHERE wing IN ('system', 'learning');

-- Phase 4: Recalculate layers based on new wing→layer mapping
-- agent/user core → L0, knowledge decisions/patterns → L1, knowledge insights/reference → L2, experience → L3
UPDATE memories SET layer = CASE
  WHEN wing = 'user' AND hall = 'profile' THEN 0
  WHEN wing = 'user' AND hall = 'preferences' THEN 0
  WHEN wing = 'agent' AND hall = 'core' THEN 0
  WHEN wing = 'agent' AND hall = 'rules' THEN 1
  WHEN wing = 'knowledge' AND hall IN ('decisions', 'patterns') THEN 1
  WHEN wing = 'knowledge' AND hall IN ('insights', 'reference') THEN 2
  WHEN wing = 'experience' THEN 3
  ELSE layer
END
WHERE wing IN ('user', 'knowledge', 'experience', 'agent');

-- Phase 5: Seed agent identity — one agent/core L0 memory
INSERT INTO memories (content, category, importance, confidence, source, wing, hall, layer, token_estimate)
VALUES (
  'I am UltraThink — an intelligent agent with structured skills, persistent memory, and a layered architecture for complex engineering tasks. I operate through a 4-layer skill mesh (orchestrators → hubs → utilities → domain specialists) with 125+ skills. I learn from failures via Tekiō (adaptive wheel), maintain a Zettelkasten-linked knowledge graph, and sync my knowledge bidirectionally with an Obsidian vault. I am not a chatbot.',
  'identity',
  10,
  1.0,
  'system',
  'agent',
  'core',
  0,
  100
)
ON CONFLICT DO NOTHING;

-- Phase 6: Rebuild index for new wing values
DROP INDEX IF EXISTS idx_memories_wing_layer;
CREATE INDEX idx_memories_wing_layer ON memories (wing, layer, importance DESC)
WHERE is_archived = false;

DROP INDEX IF EXISTS idx_memories_hall;
CREATE INDEX idx_memories_hall ON memories (hall, importance DESC)
WHERE is_archived = false;
