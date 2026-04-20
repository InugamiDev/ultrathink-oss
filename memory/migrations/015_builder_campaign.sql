-- Builder Campaign: key validation + application tracking
CREATE TABLE IF NOT EXISTS builder_keys (
  id TEXT PRIMARY KEY,              -- 'UT-BLD-' + 8 random chars
  user_handle TEXT NOT NULL,         -- discord/github handle
  email TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,           -- null = never expires
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'       -- extra info (campaign batch, notes)
);

CREATE TABLE IF NOT EXISTS builder_applications (
  id TEXT PRIMARY KEY,              -- 'app_' + 8 random chars
  user_handle TEXT NOT NULL,
  email TEXT,
  proof_type TEXT NOT NULL,          -- 'project' | 'skill' | 'contribution'
  proof_url TEXT NOT NULL,           -- link to repo/PR/demo
  proof_description TEXT,
  status TEXT DEFAULT 'pending',     -- 'pending' | 'approved' | 'rejected'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  key_id TEXT REFERENCES builder_keys(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_builder_apps_status ON builder_applications(status);
CREATE INDEX IF NOT EXISTS idx_builder_keys_active ON builder_keys(is_active) WHERE is_active = true;
