import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obdnpizktbutnphbakog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZG5waXprdGJ1dG5waGJha29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzM1MTYsImV4cCI6MjA5NDEwOTUxNn0.I5_R3I-Nh23sJ4OtGLCpPol6y-no2g54sQs9-quivfc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
