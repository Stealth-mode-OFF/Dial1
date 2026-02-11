import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, publicAnonKey, supabaseUrl } from './info';

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, publicAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'dial1-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
}

export const supabaseClient = createSupabaseClient();
export const supabase = supabaseClient;
