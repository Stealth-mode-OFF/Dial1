import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, publicAnonKey, supabaseUrl } from './info';

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, publicAnonKey);
}

export const supabaseClient = createSupabaseClient();
export const supabase = supabaseClient;
