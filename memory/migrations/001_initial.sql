-- Migration 001: Initial setup
-- Enable required extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Sessions table (foundation for all activity tracking)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary TEXT,
  task_context TEXT,
  memories_created INT DEFAULT 0,
  memories_accessed INT DEFAULT 0
);

CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
