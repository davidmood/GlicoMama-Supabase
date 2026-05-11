-- Fix RLS policies for GlicoMama Supabase
-- Run this in Supabase Dashboard → SQL Editor
-- This script is idempotent (safe to run multiple times)

-- 1. Grant table permissions to authenticated role
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON glucose_records TO authenticated;
GRANT ALL ON reminders TO authenticated;
GRANT ALL ON shares TO authenticated;
GRANT SELECT ON profiles TO anon;

-- 2. Drop ALL existing policies on all tables (clean slate)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Shared users can view owner profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_shared" ON profiles;

DROP POLICY IF EXISTS "Users can view own records" ON glucose_records;
DROP POLICY IF EXISTS "Users can insert own records" ON glucose_records;
DROP POLICY IF EXISTS "Users can update own records" ON glucose_records;
DROP POLICY IF EXISTS "Users can delete own records" ON glucose_records;
DROP POLICY IF EXISTS "Shared users can view records" ON glucose_records;
DROP POLICY IF EXISTS "Enable read access for all users" ON glucose_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON glucose_records;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON glucose_records;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON glucose_records;
DROP POLICY IF EXISTS "records_select_own" ON glucose_records;
DROP POLICY IF EXISTS "records_insert_own" ON glucose_records;
DROP POLICY IF EXISTS "records_update_own" ON glucose_records;
DROP POLICY IF EXISTS "records_delete_own" ON glucose_records;
DROP POLICY IF EXISTS "records_select_shared" ON glucose_records;

DROP POLICY IF EXISTS "Users can manage own reminders" ON reminders;
DROP POLICY IF EXISTS "Enable read access for all users" ON reminders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON reminders;
DROP POLICY IF EXISTS "reminders_all_own" ON reminders;

DROP POLICY IF EXISTS "Owners can manage shares" ON shares;
DROP POLICY IF EXISTS "Shared users can view their shares" ON shares;
DROP POLICY IF EXISTS "Shared users can accept shares" ON shares;
DROP POLICY IF EXISTS "Enable read access for all users" ON shares;
DROP POLICY IF EXISTS "shares_all_owner" ON shares;
DROP POLICY IF EXISTS "shares_select_shared" ON shares;
DROP POLICY IF EXISTS "shares_update_shared" ON shares;

-- 3. Recreate ALL policies from scratch

-- Profiles
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_shared"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.owner_id = profiles.id
        AND shares.shared_with_id = auth.uid()
        AND shares.accepted = true
    )
  );

-- Glucose records
CREATE POLICY "records_select_own"
  ON glucose_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "records_insert_own"
  ON glucose_records FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "records_update_own"
  ON glucose_records FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "records_delete_own"
  ON glucose_records FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "records_select_shared"
  ON glucose_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.owner_id = glucose_records.user_id
        AND shares.shared_with_id = auth.uid()
        AND shares.accepted = true
    )
  );

-- Reminders
CREATE POLICY "reminders_all_own"
  ON reminders FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Shares
CREATE POLICY "shares_all_owner"
  ON shares FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- IMPORTANT: Use auth.jwt()->>'email' instead of querying auth.users
-- The authenticated role does NOT have SELECT on auth.users
CREATE POLICY "shares_select_shared"
  ON shares FOR SELECT TO authenticated
  USING (shared_with_email = (auth.jwt()->>'email'));

CREATE POLICY "shares_update_shared"
  ON shares FOR UPDATE TO authenticated
  USING (shared_with_email = (auth.jwt()->>'email'))
  WITH CHECK (shared_with_email = (auth.jwt()->>'email'));

-- 4. Backfill: create profile for any existing users missing one
INSERT INTO profiles (id, name)
SELECT id, COALESCE(raw_user_meta_data->>'name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
