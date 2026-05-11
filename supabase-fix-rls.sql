-- Fix RLS policies for GlicoMama Supabase
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Grant table permissions to authenticated role
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON glucose_records TO authenticated;
GRANT ALL ON reminders TO authenticated;
GRANT ALL ON shares TO authenticated;

-- Also grant to anon for signup flow
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON glucose_records TO anon;

-- 2. Drop and recreate profiles policies (fix conflicts with auto-RLS)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Shared users can view owner profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- Recreate profiles policies
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

-- 3. Drop and recreate glucose_records policies
DROP POLICY IF EXISTS "Users can view own records" ON glucose_records;
DROP POLICY IF EXISTS "Users can insert own records" ON glucose_records;
DROP POLICY IF EXISTS "Users can update own records" ON glucose_records;
DROP POLICY IF EXISTS "Users can delete own records" ON glucose_records;
DROP POLICY IF EXISTS "Shared users can view records" ON glucose_records;
DROP POLICY IF EXISTS "Enable read access for all users" ON glucose_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON glucose_records;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON glucose_records;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON glucose_records;

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

-- 4. Drop and recreate reminders policies
DROP POLICY IF EXISTS "Users can manage own reminders" ON reminders;
DROP POLICY IF EXISTS "Enable read access for all users" ON reminders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON reminders;

CREATE POLICY "reminders_all_own"
  ON reminders FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Drop and recreate shares policies
DROP POLICY IF EXISTS "Owners can manage shares" ON shares;
DROP POLICY IF EXISTS "Shared users can view their shares" ON shares;
DROP POLICY IF EXISTS "Shared users can accept shares" ON shares;
DROP POLICY IF EXISTS "Enable read access for all users" ON shares;

CREATE POLICY "shares_all_owner"
  ON shares FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "shares_select_shared"
  ON shares FOR SELECT TO authenticated
  USING (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "shares_update_shared"
  ON shares FOR UPDATE TO authenticated
  USING (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 6. Fix: create profile for existing user if trigger didn't fire
-- (user may have signed up before SQL was executed)
INSERT INTO profiles (id, name)
SELECT id, COALESCE(raw_user_meta_data->>'name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
