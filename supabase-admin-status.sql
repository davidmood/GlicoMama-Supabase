-- Admin / System Status setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/obdnpizktbutnphbakog/sql/new

-- 1. Admin flag on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Mark your account as admin
UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'davidmood@gmail.com');

-- 3. Function used by the Status screen to read the database size
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$ SELECT pg_database_size(current_database()); $$;
