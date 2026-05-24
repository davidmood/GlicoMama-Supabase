-- GlicoMama: Doctor/Familiar Sharing System
-- Execute in Supabase Dashboard → SQL Editor → Run

-- 1. Add role, cpf, crm columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'paciente'
  CHECK (role IN ('paciente', 'medico', 'familiar'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crm TEXT;

-- 2. Create share_codes table (temporary codes for linking)
CREATE TABLE IF NOT EXISTS share_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_share_codes_user ON share_codes(user_id);

-- 3. Create patient_links table (permanent viewer-patient relationship)
CREATE TABLE IF NOT EXISTS patient_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('medico', 'familiar')) DEFAULT 'medico',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_links_viewer ON patient_links(viewer_id);
CREATE INDEX IF NOT EXISTS idx_patient_links_patient ON patient_links(patient_id);

-- 4. Grant permissions
GRANT ALL ON share_codes TO authenticated;
GRANT ALL ON patient_links TO authenticated;
GRANT ALL ON share_codes TO service_role;
GRANT ALL ON patient_links TO service_role;

-- 5. Enable RLS
ALTER TABLE share_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_links ENABLE ROW LEVEL SECURITY;

-- 6. share_codes policies
DROP POLICY IF EXISTS "share_codes_insert_own" ON share_codes;
CREATE POLICY "share_codes_insert_own"
  ON share_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "share_codes_select_own" ON share_codes;
CREATE POLICY "share_codes_select_own"
  ON share_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "share_codes_select_by_code" ON share_codes;
CREATE POLICY "share_codes_select_by_code"
  ON share_codes FOR SELECT TO authenticated
  USING (used = false AND expires_at > NOW());

DROP POLICY IF EXISTS "share_codes_update_own" ON share_codes;
CREATE POLICY "share_codes_update_own"
  ON share_codes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "share_codes_update_any" ON share_codes;
CREATE POLICY "share_codes_update_any"
  ON share_codes FOR UPDATE TO authenticated
  USING (used = false AND expires_at > NOW());

DROP POLICY IF EXISTS "share_codes_delete_own" ON share_codes;
CREATE POLICY "share_codes_delete_own"
  ON share_codes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 7. patient_links policies
DROP POLICY IF EXISTS "patient_links_select_viewer" ON patient_links;
CREATE POLICY "patient_links_select_viewer"
  ON patient_links FOR SELECT TO authenticated
  USING (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "patient_links_select_patient" ON patient_links;
CREATE POLICY "patient_links_select_patient"
  ON patient_links FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "patient_links_insert" ON patient_links;
CREATE POLICY "patient_links_insert"
  ON patient_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "patient_links_delete_viewer" ON patient_links;
CREATE POLICY "patient_links_delete_viewer"
  ON patient_links FOR DELETE TO authenticated
  USING (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "patient_links_delete_patient" ON patient_links;
CREATE POLICY "patient_links_delete_patient"
  ON patient_links FOR DELETE TO authenticated
  USING (auth.uid() = patient_id);

-- 8. Allow viewers to read linked patient profiles (name + cpf)
DROP POLICY IF EXISTS "profiles_select_linked" ON profiles;
CREATE POLICY "profiles_select_linked"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_links
      WHERE patient_links.patient_id = profiles.id
        AND patient_links.viewer_id = auth.uid()
    )
  );

-- 9. Allow viewers to read linked patient glucose_records
DROP POLICY IF EXISTS "records_select_linked" ON glucose_records;
CREATE POLICY "records_select_linked"
  ON glucose_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_links
      WHERE patient_links.patient_id = glucose_records.user_id
        AND patient_links.viewer_id = auth.uid()
    )
  );
