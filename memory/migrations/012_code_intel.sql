-- Migration 012: Code Intelligence Layer
-- Cross-file dependency graphs, call graphs, impact analysis, semantic clustering.
-- Deterministic code knowledge — no decay, no confidence scores.

CREATE TABLE IF NOT EXISTS ci_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  last_indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ci_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ci_projects(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  language VARCHAR(30),
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, relative_path)
);

CREATE INDEX IF NOT EXISTS idx_ci_files_project
  ON ci_files (project_id);

CREATE TABLE IF NOT EXISTS ci_symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES ci_files(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  kind VARCHAR(30) NOT NULL
    CHECK (kind IN ('function', 'class', 'interface', 'type', 'enum', 'variable', 'method', 'property', 'module', 'namespace')),
  signature TEXT,
  line_number INT NOT NULL,
  is_exported BOOLEAN NOT NULL DEFAULT false,
  parent_symbol_id UUID REFERENCES ci_symbols(id) ON DELETE SET NULL,

  -- Full-text search on name + signature
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', name), 'A') ||
    setweight(to_tsvector('simple', COALESCE(signature, '')), 'B')
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_ci_symbols_file
  ON ci_symbols (file_id);

CREATE INDEX IF NOT EXISTS idx_ci_symbols_name
  ON ci_symbols (name);

CREATE INDEX IF NOT EXISTS idx_ci_symbols_kind
  ON ci_symbols (kind);

CREATE INDEX IF NOT EXISTS idx_ci_symbols_search
  ON ci_symbols USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_ci_symbols_name_trgm
  ON ci_symbols USING GIN (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS ci_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_symbol_id UUID NOT NULL REFERENCES ci_symbols(id) ON DELETE CASCADE,
  target_symbol_id UUID REFERENCES ci_symbols(id) ON DELETE CASCADE,
  edge_type VARCHAR(20) NOT NULL
    CHECK (edge_type IN ('imports', 'calls', 'extends', 'implements', 'type_ref', 're_exports')),

  -- For unresolved references (target not yet indexed)
  target_name VARCHAR(500),
  target_module TEXT,

  UNIQUE (source_symbol_id, target_symbol_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_ci_edges_source
  ON ci_edges (source_symbol_id);

CREATE INDEX IF NOT EXISTS idx_ci_edges_target
  ON ci_edges (target_symbol_id) WHERE target_symbol_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ci_edges_type
  ON ci_edges (edge_type);

CREATE INDEX IF NOT EXISTS idx_ci_edges_unresolved
  ON ci_edges (target_name, target_module) WHERE target_symbol_id IS NULL;

CREATE TABLE IF NOT EXISTS ci_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ci_projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  directory_pattern TEXT,
  file_count INT NOT NULL DEFAULT 0,
  symbol_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS ci_module_files (
  module_id UUID NOT NULL REFERENCES ci_modules(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES ci_files(id) ON DELETE CASCADE,
  PRIMARY KEY (module_id, file_id)
);
