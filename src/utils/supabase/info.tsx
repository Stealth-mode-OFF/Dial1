// Supabase config helper. Uses Vite env vars; returns empty when not configured.

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.toString().trim() || '';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.toString().trim() || '';
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.toString().trim() || '';

const FUNCTIONS_SUFFIX = "/functions/v1/make-server-139017f8";
const normalizedUrl = supabaseUrl.replace(/\/$/, "");
const baseFromUrl = normalizedUrl ? `${normalizedUrl}${FUNCTIONS_SUFFIX}` : "";
const baseFromProject = projectId ? `https://${projectId}.supabase.co${FUNCTIONS_SUFFIX}` : "";
const functionsBase = baseFromUrl || baseFromProject;

export const isSupabaseConfigured = Boolean((supabaseUrl || projectId) && publicAnonKey);

export function buildFunctionUrl(path: string) {
  if (!functionsBase) return null;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${functionsBase}/${cleanPath}`;
}

export { projectId, supabaseUrl, publicAnonKey, functionsBase };
