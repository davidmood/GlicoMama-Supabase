-- GlicoMama Push Notifications Schema
-- Execute in Supabase Dashboard → SQL Editor → Run

-- 1. Add FCM token column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 2. Create scheduled notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fcm_token TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'GlicoMama',
  body TEXT NOT NULL,
  fire_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  reminder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index for efficient polling
CREATE INDEX IF NOT EXISTS idx_scheduled_not_sent
  ON scheduled_notifications(fire_at)
  WHERE sent = false;

-- 4. Grant permissions (service role has full access; authenticated can insert)
GRANT ALL ON scheduled_notifications TO authenticated;
GRANT ALL ON scheduled_notifications TO service_role;

-- 5. Enable RLS
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS policy — authenticated users can insert their own notifications
DROP POLICY IF EXISTS "sn_insert_any" ON scheduled_notifications;
CREATE POLICY "sn_insert_any"
  ON scheduled_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. Service role bypass (default in Supabase, but explicit)
DROP POLICY IF EXISTS "sn_service_all" ON scheduled_notifications;
CREATE POLICY "sn_service_all"
  ON scheduled_notifications FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Auto-cleanup: delete sent notifications older than 7 days (optional cron)
-- Run manually or set up pg_cron if available:
-- DELETE FROM scheduled_notifications WHERE sent = true AND created_at < NOW() - INTERVAL '7 days';
