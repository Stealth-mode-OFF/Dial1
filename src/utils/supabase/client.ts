import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const createNoopClient = () =>
  ({
    auth: {
      signOut: async () => ({ error: null }),
    },
  }) as unknown as SupabaseClient;

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createNoopClient();
