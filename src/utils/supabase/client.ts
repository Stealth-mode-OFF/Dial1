import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && publicAnonKey) {
  supabaseClient = createClient(supabaseUrl, publicAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export { supabaseClient };
