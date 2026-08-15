import { createClient } from "@supabase/supabase-js";

// Service role key bypasses RLS — never expose this to the browser.
// Only import this file from files inside pages/api/.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
