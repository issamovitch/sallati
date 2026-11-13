import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseCredentials = { url: string; key: string };

export function supabaseCredentials(): SupabaseCredentials | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

// Server-only client. The browser never talks to the database anymore.
export function createSupabaseServerClient(): SupabaseClient | null {
  const creds = supabaseCredentials();
  if (!creds) return null;
  return createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
