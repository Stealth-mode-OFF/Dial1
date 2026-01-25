const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const inferredProjectId = (() => {
  if (!supabaseUrl) return '';
  try {
    const url = new URL(supabaseUrl);
    const host = url.hostname; // <projectId>.supabase.co
    const [projectId] = host.split('.');
    return projectId ?? '';
  } catch {
    return '';
  }
})();

export const projectId = inferredProjectId;
export const publicAnonKey = supabaseAnonKey;
