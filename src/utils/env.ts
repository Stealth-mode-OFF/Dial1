/**
 * Environment configuration validation and access.
 * Validates all required environment variables at startup.
 */

// ============ TYPES ============
interface EnvConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseProjectId?: string;
  
  // App settings
  isDevelopment: boolean;
  isProduction: boolean;
  appVersion: string;
}

interface EnvValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============ RAW ENV ACCESS ============
const getEnv = (key: string): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

// ============ VALIDATORS ============
const isValidUrl = (value: string): boolean => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidSupabaseUrl = (value: string): boolean => {
  if (!isValidUrl(value)) return false;
  // Supabase URLs typically end with .supabase.co
  return value.includes('supabase');
};

const isValidAnonKey = (value: string): boolean => {
  // Supabase anon keys are JWT tokens
  if (!value) return false;
  const parts = value.split('.');
  return parts.length === 3 && value.length > 100;
};

// ============ VALIDATION ============
export function validateEnv(): EnvValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required: Supabase URL
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const projectId = getEnv('VITE_SUPABASE_PROJECT_ID');
  
  if (!supabaseUrl && !projectId) {
    errors.push('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID');
  } else if (supabaseUrl && !isValidSupabaseUrl(supabaseUrl)) {
    errors.push('Invalid VITE_SUPABASE_URL format');
  }
  
  // Required: Supabase Anon Key
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!anonKey) {
    errors.push('Missing VITE_SUPABASE_ANON_KEY');
  } else if (!isValidAnonKey(anonKey)) {
    warnings.push('VITE_SUPABASE_ANON_KEY format looks unusual');
  }
  
  // Server-only keys should never be set in the frontend bundle.
  const pipedriveToken = getEnv('VITE_PIPEDRIVE_API_TOKEN');
  if (pipedriveToken) {
    warnings.push('VITE_PIPEDRIVE_API_TOKEN exposed to client - remove it (server-side only)');
  }

  const openaiKey = getEnv('VITE_OPENAI_API_KEY');
  if (openaiKey) {
    warnings.push('VITE_OPENAI_API_KEY exposed to client - remove it (server-side only)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============ CONFIG OBJECT ============
function buildConfig(): EnvConfig {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const projectId = getEnv('VITE_SUPABASE_PROJECT_ID');
  
  return {
    supabaseUrl: supabaseUrl || (projectId ? `https://${projectId}.supabase.co` : ''),
    supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
    supabaseProjectId: projectId || undefined,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    appVersion: getEnv('VITE_APP_VERSION') || '1.0.0',
  };
}

// ============ SINGLETON ============
let _config: EnvConfig | null = null;
let _validation: EnvValidation | null = null;

export function getConfig(): EnvConfig {
  if (!_config) {
    _config = buildConfig();
  }
  return _config;
}

export function getValidation(): EnvValidation {
  if (!_validation) {
    _validation = validateEnv();
  }
  return _validation;
}

// ============ STARTUP CHECK ============
export function checkEnvironment(): void {
  const validation = getValidation();
  const config = getConfig();
  
  if (config.isDevelopment) {
    console.group('🔧 Environment Check');
    
    if (validation.errors.length > 0) {
      console.error('❌ Errors:');
      validation.errors.forEach(e => console.error(`   - ${e}`));
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Warnings:');
      validation.warnings.forEach(w => console.warn(`   - ${w}`));
    }
    
    if (validation.isValid) {
      console.log('✅ Environment configured correctly');
      console.log(`   Supabase: ${config.supabaseUrl.slice(0, 30)}...`);
    }
    
    console.groupEnd();
  }
}

// ============ FEATURE FLAGS ============
export const features = {
  get supabase() {
    return Boolean(getConfig().supabaseUrl && getConfig().supabaseAnonKey);
  },
  get analytics() {
    return getConfig().isProduction;
  },
  get devTools() {
    return getConfig().isDevelopment;
  },
};

export default getConfig;
