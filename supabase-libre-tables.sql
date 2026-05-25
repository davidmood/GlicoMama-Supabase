-- LibreLinkUp Integration Tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/obdnpizktbutnphbakog/sql/new

-- 1. Libre connections (stores encrypted credentials)
CREATE TABLE IF NOT EXISTS libre_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  libre_email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  region TEXT DEFAULT 'eu',
  libre_patient_id TEXT DEFAULT '',
  patient_name TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Libre readings (continuous glucose data)
CREATE TABLE IF NOT EXISTS libre_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  glucose_value INTEGER NOT NULL,
  trend TEXT DEFAULT 'unknown',
  source TEXT DEFAULT 'history',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_libre_readings_user_ts ON libre_readings(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_libre_readings_user_date ON libre_readings(user_id, (timestamp::date));
CREATE UNIQUE INDEX IF NOT EXISTS idx_libre_readings_unique ON libre_readings(user_id, timestamp);

-- 3. RLS policies
ALTER TABLE libre_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE libre_readings ENABLE ROW LEVEL SECURITY;

-- Libre connections: users can only see their own
DROP POLICY IF EXISTS "libre_connections_select_own" ON libre_connections;
CREATE POLICY "libre_connections_select_own"
  ON libre_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "libre_connections_insert_own" ON libre_connections;
CREATE POLICY "libre_connections_insert_own"
  ON libre_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "libre_connections_update_own" ON libre_connections;
CREATE POLICY "libre_connections_update_own"
  ON libre_connections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "libre_connections_delete_own" ON libre_connections;
CREATE POLICY "libre_connections_delete_own"
  ON libre_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Libre readings: users can read their own, backend uses service key to write
DROP POLICY IF EXISTS "libre_readings_select_own" ON libre_readings;
CREATE POLICY "libre_readings_select_own"
  ON libre_readings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "libre_readings_insert_own" ON libre_readings;
CREATE POLICY "libre_readings_insert_own"
  ON libre_readings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow viewers (doctors/family) to see linked patient's libre readings
DROP POLICY IF EXISTS "libre_readings_select_linked" ON libre_readings;
CREATE POLICY "libre_readings_select_linked"
  ON libre_readings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_links
      WHERE patient_links.patient_id = libre_readings.user_id
        AND patient_links.viewer_id = auth.uid()
    )
  );

-- Service role bypass (backend uses service key so RLS is bypassed automatically)
-- No additional policy needed for backend writes
