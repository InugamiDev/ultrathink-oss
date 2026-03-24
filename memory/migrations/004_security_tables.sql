-- Migration 004: Security and hook events

CREATE TABLE IF NOT EXISTS hook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  description TEXT,
  path_accessed TEXT,
  action_taken VARCHAR(50)
    CHECK (action_taken IN ('allowed', 'blocked', 'prompted', 'approved', 'denied')),
  hook_name VARCHAR(100),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hook_events_type ON hook_events(event_type, created_at DESC);
CREATE INDEX idx_hook_events_severity ON hook_events(severity, created_at DESC);
CREATE INDEX idx_hook_events_session ON hook_events(session_id, created_at DESC);

-- Security incidents (escalated hook events)
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_event_id UUID REFERENCES hook_events(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  resolution TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
