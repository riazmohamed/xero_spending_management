-- 002_receipts_ocr.sql
-- Receipt OCR processing pipeline tables

-- Enable extensions for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Receipt status enum
CREATE TYPE receipt_status AS ENUM (
  'pending',
  'processing',
  'extracted',
  'matched',
  'confirmed',
  'uploaded',
  'failed'
);

-- Receipt queue action enum
CREATE TYPE receipt_action AS ENUM (
  'extract',
  'match',
  'upload_xero'
);

-- Receipt queue status enum
CREATE TYPE queue_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Main receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES tokens(user_id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT DEFAULT 'image/jpeg',
  file_size_bytes INTEGER,

  -- Status tracking
  status receipt_status NOT NULL DEFAULT 'pending',
  error_message TEXT,

  -- OCR extracted fields
  merchant_name TEXT,
  total_amount NUMERIC(12, 2),
  subtotal_amount NUMERIC(12, 2),
  tax_amount NUMERIC(12, 2),
  transaction_date DATE,
  currency TEXT DEFAULT 'AUD',
  payment_method TEXT,
  abn TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  raw_ocr_response JSONB,

  -- Match fields
  matched_transaction_id TEXT,
  match_confidence NUMERIC(5, 4),
  match_candidates JSONB DEFAULT '[]'::jsonb,

  -- Xero tracking
  xero_attachment_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  extracted_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ
);

-- Merchant aliases for learning from confirmations
CREATE TABLE merchant_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES tokens(user_id) ON DELETE CASCADE,
  receipt_merchant TEXT NOT NULL,
  xero_contact_name TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, receipt_merchant)
);

-- Receipt processing queue for future batch processing
CREATE TABLE receipt_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  action receipt_action NOT NULL,
  status queue_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_receipts_user_status ON receipts(user_id, status);
CREATE INDEX idx_receipts_user_created ON receipts(user_id, created_at DESC);
CREATE INDEX idx_receipts_matched_tx ON receipts(matched_transaction_id) WHERE matched_transaction_id IS NOT NULL;
CREATE INDEX idx_receipts_merchant_trgm ON receipts USING gin (merchant_name gin_trgm_ops);
CREATE INDEX idx_merchant_aliases_user ON merchant_aliases(user_id);
CREATE INDEX idx_merchant_aliases_merchant_trgm ON merchant_aliases USING gin (receipt_merchant gin_trgm_ops);
CREATE INDEX idx_receipt_queue_status ON receipt_queue(status) WHERE status IN ('pending', 'processing');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER merchant_aliases_updated_at
  BEFORE UPDATE ON merchant_aliases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER receipt_queue_updated_at
  BEFORE UPDATE ON receipt_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Upsert merchant alias (increment use_count if exists)
CREATE OR REPLACE FUNCTION upsert_merchant_alias(
  p_user_id TEXT,
  p_receipt_merchant TEXT,
  p_xero_contact_name TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO merchant_aliases (user_id, receipt_merchant, xero_contact_name, use_count)
  VALUES (p_user_id, LOWER(TRIM(p_receipt_merchant)), p_xero_contact_name, 1)
  ON CONFLICT (user_id, receipt_merchant)
  DO UPDATE SET
    xero_contact_name = p_xero_contact_name,
    use_count = merchant_aliases.use_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS policies (service role has full access)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on receipts"
  ON receipts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on merchant_aliases"
  ON merchant_aliases FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on receipt_queue"
  ON receipt_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime on receipts table
ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
