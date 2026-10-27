import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";

// Secret key を使うので、RLS を通さずに読み書きできる。サーバー側でだけ使う
export function supabaseAdmin() {
  const { supabaseUrl, supabaseSecretKey } = serverEnv();
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
