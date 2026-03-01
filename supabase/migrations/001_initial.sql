-- Token storage (encrypted Xero tokens)
CREATE TABLE tokens (
  user_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  organisation_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API response cache
CREATE TABLE cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- Service role can access everything (Edge Functions use service role key)
CREATE POLICY "Service role full access on tokens"
  ON tokens FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on cache"
  ON cache FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for temporary receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);
