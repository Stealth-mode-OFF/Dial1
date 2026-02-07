// Supabase config helper. Uses Vite env vars; returns empty when not configured.

const SUPABASE_URL_ENV = 'VITE_SUPABASE_URL';
const SUPABASE_PROJECT_ENV = 'VITE_SUPABASE_PROJECT_ID';
const SUPABASE_ANON_ENV = 'VITE_SUPABASE_ANON_KEY';

// Vercel CLI / some dotenv flows may inject literal "\n" sequences into env vars.
// Strip those to avoid producing invalid URLs/keys in the browser.
const cleanEnv = (value: unknown) => {
  let v = typeof value === 'string' ? value : '';
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  // Remove literal escape sequences.
  v = v.replace(/\\r\\n|\\n|\\r/g, '').trim();
  return v;
};

const projectId = cleanEnv(import.meta.env.VITE_SUPABASE_PROJECT_ID?.toString() || '');
const rawSupabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL?.toString() || '');
const publicAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY?.toString() || '');

const FUNCTIONS_SUFFIX = "/functions/v1/make-server-139017f8";

const normalizeUrl = (value: string) => value.replace(/\/+$/, "");
const resolveSupabaseUrl = () => {
  if (rawSupabaseUrl) return normalizeUrl(rawSupabaseUrl);
  if (projectId) return `https://${projectId}.supabase.co`;
  return '';
};

const isValidHttpUrl = (value: string) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = resolveSupabaseUrl();
const hasValidUrl = isValidHttpUrl(supabaseUrl);

const functionsBase = hasValidUrl ? `${supabaseUrl}${FUNCTIONS_SUFFIX}` : "";

export const isSupabaseConfigured = Boolean(hasValidUrl && publicAnonKey);

export const supabaseConfigError = (() => {
  if (!supabaseUrl) {
    return `Missing ${SUPABASE_URL_ENV} (or ${SUPABASE_PROJECT_ENV}).`;
  }
  if (!hasValidUrl) {
    return `Invalid ${SUPABASE_URL_ENV}. Must be a valid http/https URL.`;
  }
  if (!publicAnonKey) {
    return `Missing ${SUPABASE_ANON_ENV}.`;
  }
  return null;
})();

export function assertSupabaseConfigured() {
  if (isSupabaseConfigured) return;
  const hint = `Set ${SUPABASE_URL_ENV} and ${SUPABASE_ANON_ENV} in .env.local (local) or Vercel Project Settings > Environment Variables.`;
  const message = supabaseConfigError ? `${supabaseConfigError} ${hint}` : hint;
  throw new Error(message);
}

export function buildFunctionUrl(path: string) {
  if (!functionsBase) return null;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${functionsBase}/${cleanPath}`;
}

export { projectId, supabaseUrl, publicAnonKey, functionsBase };
