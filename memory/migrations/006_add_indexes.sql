-- Migration 006: Add missing indexes for common query patterns

-- Fix: memory_relations queries filter by target_id but only PK covers (source_id, target_id)
CREATE INDEX IF NOT EXISTS idx_memory_relations_target ON memory_relations(target_id);

-- Fix: identity.ts queries filter by scope + category frequently
CREATE INDEX IF NOT EXISTS idx_memories_scope_category ON memories(scope, category) WHERE is_archived = false;

-- Fix: Scoped searches order by importance
CREATE INDEX IF NOT EXISTS idx_memories_scope_importance ON memories(scope, importance DESC, created_at DESC) WHERE is_archived = false;

-- Fix: decisions table queried by status
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- Fix: journals table queried by plan_id
CREATE INDEX IF NOT EXISTS idx_journals_plan_id ON journals(plan_id);

-- Fix: security_incidents queried by status
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
