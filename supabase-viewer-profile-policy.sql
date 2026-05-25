-- Allow patients to read profiles of users who have viewer access to their data
-- This enables showing the viewer's name in the "Quem tem acesso" list
DROP POLICY IF EXISTS "profiles_select_my_viewers" ON profiles;
CREATE POLICY "profiles_select_my_viewers"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_links
      WHERE patient_links.viewer_id = profiles.id
        AND patient_links.patient_id = auth.uid()
    )
  );
