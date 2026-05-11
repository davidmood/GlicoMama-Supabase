-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  dark_mode BOOLEAN NOT NULL DEFAULT true,
  glucose_target_min INTEGER NOT NULL DEFAULT 70,
  glucose_target_max INTEGER NOT NULL DEFAULT 100,
  glucose_low_max INTEGER NOT NULL DEFAULT 69,
  glucose_attention_max INTEGER NOT NULL DEFAULT 140,
  phase TEXT CHECK (phase IN ('gestante', 'puerperio', 'amamentacao', 'tentando', 'parceiro', 'outro')),
  sensor TEXT,
  insulin_use TEXT CHECK (insulin_use IN ('nao', 'basal', 'rapida', 'ambas')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Glucose records table
CREATE TABLE IF NOT EXISTS glucose_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type TEXT NOT NULL,
  glucose_pre NUMERIC,
  glucose_pos_1h NUMERIC,
  glucose_pos_2h NUMERIC,
  insulin_applied NUMERIC,
  insulin_type TEXT DEFAULT '',
  insulin_local TEXT DEFAULT '',
  carbohydrates NUMERIC,
  breastfeeding_type TEXT DEFAULT 'Não realizou',
  breastfeeding_duration NUMERIC,
  breast_side TEXT,
  extracted_amount NUMERIC,
  symptoms TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  food_description TEXT DEFAULT '',
  baby_mood TEXT,
  baby_sleep TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- Sharing table (for médico/parceiro access)
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('medico', 'parceiro')) DEFAULT 'parceiro',
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_glucose_records_user_id ON glucose_records(user_id);
CREATE INDEX IF NOT EXISTS idx_glucose_records_timestamp ON glucose_records(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner ON shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with_email);

-- RLS Policies

-- Profiles: users can only see/edit their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Glucose records: users can CRUD their own records
ALTER TABLE glucose_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
  ON glucose_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON glucose_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON glucose_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON glucose_records FOR DELETE
  USING (auth.uid() = user_id);

-- Shared users can view records (read-only)
CREATE POLICY "Shared users can view records"
  ON glucose_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.owner_id = glucose_records.user_id
        AND shares.shared_with_id = auth.uid()
        AND shares.accepted = true
    )
  );

-- Reminders: users can CRUD their own
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders"
  ON reminders FOR ALL
  USING (auth.uid() = user_id);

-- Shares: owners can manage, shared users can view
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage shares"
  ON shares FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Shared users can view their shares"
  ON shares FOR SELECT
  USING (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Shared users can accept shares"
  ON shares FOR UPDATE
  USING (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Profiles: shared users can view profile of owner
CREATE POLICY "Shared users can view owner profile"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.owner_id = profiles.id
        AND shares.shared_with_id = auth.uid()
        AND shares.accepted = true
    )
  );

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-link shares when user signs up
CREATE OR REPLACE FUNCTION public.handle_share_link()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shares
  SET shared_with_id = NEW.id
  WHERE shared_with_email = NEW.email
    AND shared_with_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_share_link ON auth.users;
CREATE TRIGGER on_auth_user_created_share_link
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_share_link();
