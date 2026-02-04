/**
 * Production-ready API utilities with retry logic, caching, and error handling.
 */

import { buildFunctionUrl, isSupabaseConfigured, publicAnonKey } from './supabase/info';

// ============ TYPES ============
export interface ApiConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  cache: boolean;
  cacheTTL: number;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  retryable?: boolean;
}

export type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError };

// ============ CONFIG ============
const DEFAULT_CONFIG: ApiConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
};

// ============ CACHE ============
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const apiCache = new ApiCache();

// ============ ERROR FACTORY ============
function createApiError(message: string, options: Partial<ApiError> = {}): ApiError {
  const error = new Error(message) as ApiError;
  Object.assign(error, options);
  return error;
}

// ============ RETRY LOGIC ============
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetry(error: ApiError, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false;
  if (error.isTimeout) return true;
  if (error.isNetworkError) return true;
  if (error.status && error.status >= 500) return true;
  if (error.status === 429) return true; // Rate limited
  return false;
}

function getRetryDelay(attempt: number, baseDelay: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, 30000); // Max 30s
}

// ============ FETCH WITH TIMEOUT ============
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ MAIN API FUNCTION ============
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  config: Partial<ApiConfig> = {}
): Promise<ApiResult<T>> {
  const { maxRetries, retryDelay, timeout, cache, cacheTTL } = { ...DEFAULT_CONFIG, ...config };
  
  // Check if API is configured
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: createApiError('API not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', {
        code: 'NOT_CONFIGURED',
        retryable: false,
      }),
    };
  }
  
  const url = buildFunctionUrl(path);
  if (!url) {
    return {
      success: false,
      error: createApiError('Failed to build API URL', { code: 'INVALID_URL', retryable: false }),
    };
  }
  
  // Check cache for GET requests
  const cacheKey = `${options.method || 'GET'}:${path}:${JSON.stringify(options.body || '')}`;
  if (cache && (!options.method || options.method === 'GET')) {
    const cached = apiCache.get<T>(cacheKey);
    if (cached !== null) {
      return { success: true, data: cached };
    }
  }
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(publicAnonKey ? { Authorization: `Bearer ${publicAnonKey}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  
  let lastError: ApiError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, { ...options, headers }, timeout);
      
      // Parse response
      const text = await response.text();
      let data: unknown = null;
      
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      
      // Handle errors
      if (!response.ok) {
        const errorMessage = 
          (data as any)?.error || 
          (data as any)?.message || 
          `Request failed (${response.status})`;
        
        lastError = createApiError(errorMessage, {
          status: response.status,
          retryable: response.status >= 500 || response.status === 429,
        });
        
        if (shouldRetry(lastError, attempt, maxRetries)) {
          await sleep(getRetryDelay(attempt, retryDelay));
          continue;
        }
        
        return { success: false, error: lastError };
      }
      
      // Cache successful GET responses
      if (cache && (!options.method || options.method === 'GET')) {
        apiCache.set(cacheKey, data, cacheTTL);
      }
      
      return { success: true, data: data as T };
      
    } catch (error) {
      const err = error as Error;
      
      if (err.name === 'AbortError') {
        lastError = createApiError('Request timed out', {
          isTimeout: true,
          retryable: true,
        });
      } else if (err.message.includes('fetch') || err.message.includes('network')) {
        lastError = createApiError('Network error', {
          isNetworkError: true,
          retryable: true,
        });
      } else {
        lastError = createApiError(err.message, { retryable: false });
      }
      
      if (shouldRetry(lastError, attempt, maxRetries)) {
        await sleep(getRetryDelay(attempt, retryDelay));
        continue;
      }
    }
  }
  
  return { 
    success: false, 
    error: lastError || createApiError('Unknown error', { retryable: false }),
  };
}

// ============ CONVENIENCE METHODS ============
export const api = {
  get: <T>(path: string, config?: Partial<ApiConfig>) => 
    apiRequest<T>(path, { method: 'GET' }, config),
    
  post: <T>(path: string, body: unknown, config?: Partial<ApiConfig>) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }, config),
    
  put: <T>(path: string, body: unknown, config?: Partial<ApiConfig>) =>
    apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }, config),
    
  delete: <T>(path: string, config?: Partial<ApiConfig>) =>
    apiRequest<T>(path, { method: 'DELETE' }, config),
    
  invalidateCache: (pattern?: string) => apiCache.invalidate(pattern),
};

// ============ HEALTH CHECK ============
export async function checkApiHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  latency?: number;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { configured: false, reachable: false, error: 'Not configured' };
  }
  
  const start = Date.now();
  const result = await apiRequest<{ status: string }>('health', {}, { 
    maxRetries: 0, 
    timeout: 5000,
    cache: false,
  });
  
  if (result.success) {
    return { 
      configured: true, 
      reachable: true, 
      latency: Date.now() - start,
    };
  }
  
  return { 
    configured: true, 
    reachable: false, 
    error: result.error.message,
  };
}

export default api;
