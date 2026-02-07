import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function getSupabaseEnv(): SupabaseEnv | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const env = getSupabaseEnv();
  if (!env) {
    cached = null;
    return cached;
  }

  cached = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseEnv());
}

