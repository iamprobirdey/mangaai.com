import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/** Service-role client. Bypasses row level security — only call after checking who the caller is. */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv.supabaseSecret(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
