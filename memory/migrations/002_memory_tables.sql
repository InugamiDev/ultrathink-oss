-- Migration 002: Memory entities

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  importance SMALLINT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  confidence DECIMAL(3,2) DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  scope VARCHAR(100),
  source VARCHAR(200),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  plan_id UUID,
  file_path TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  is_compacted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_memories_category_importance ON memories(category, importance DESC, created_at DESC);
CREATE INDEX idx_memories_scope ON memories(scope, created_at DESC);
CREATE INDEX idx_memories_archived ON memories(is_archived, created_at DESC);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Memory tags
CREATE TABLE IF NOT EXISTS memory_tags (
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (memory_id, tag)
);

CREATE INDEX idx_memory_tags_tag ON memory_tags(tag);

-- Relations between memories
CREATE TABLE IF NOT EXISTS memory_relations (
  source_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL,
  PRIMARY KEY (source_id, target_id)
);

-- Memory summaries (compaction output)
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(100),
  summary TEXT NOT NULL,
  memory_count INT,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
