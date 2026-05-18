-- GlicoMama: Add reminder_id for recurring reminder push notifications
-- Execute in Supabase Dashboard → SQL Editor → Run

-- 1. Add reminder_id column to scheduled_notifications (links to reminders table)
ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS reminder_id TEXT;

-- 2. Index for efficient lookup of recurring reminders
CREATE INDEX IF NOT EXISTS idx_scheduled_reminder_id
  ON scheduled_notifications(reminder_id)
  WHERE reminder_id IS NOT NULL AND sent = false;

-- 3. Cleanup: delete old sent notifications (optional, run periodically)
-- DELETE FROM scheduled_notifications WHERE sent = true AND created_at < NOW() - INTERVAL '7 days';
