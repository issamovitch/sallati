import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseCredentials = { url: string; key: string };

export function supabaseCredentials(): SupabaseCredentials | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured(): boolean {
  return supabaseCredentials() !== null;
}

// Browser client (singleton, no auth session persistence).
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const creds = supabaseCredentials();
  if (!creds) return null;
  if (!browserClient) {
    browserClient = createClient(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return browserClient;
}

// Stateless client for server code (route handlers, webhooks).
export function createSupabaseServerClient(): SupabaseClient | null {
  const creds = supabaseCredentials();
  if (!creds) return null;
  return createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}