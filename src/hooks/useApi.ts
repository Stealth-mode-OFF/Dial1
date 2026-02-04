/**
 * React hooks for async data fetching with loading and error states.
 * Production-ready with caching, retry, and proper cleanup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiResult, checkApiHealth } from '../utils/api';

// ============ TYPES ============
export interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
}

export interface UseApiOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
  invalidate: () => void;
}

// ============ useApi HOOK ============
export function useApi<T>(
  path: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { 
    enabled = true, 
    refetchInterval, 
    staleTime = 5000,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: enabled,
    error: null,
    isStale: false,
  });

  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await api.get<T>(path);

    if (result.success) {
      lastFetchRef.current = Date.now();
      setState({
        data: result.data,
        isLoading: false,
        error: null,
        isStale: false,
      });
      onSuccess?.(result.data);
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error,
        isStale: prev.data !== null,
      }));
      onError?.(result.error);
    }
  }, [path, onSuccess, onError]);

  const invalidate = useCallback(() => {
    api.invalidateCache(path);
    setState(prev => ({ ...prev, isStale: true }));
  }, [path]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    fetchData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [enabled, fetchData]);

  // Refetch interval
  useEffect(() => {
    if (!enabled || !refetchInterval) return;

    const intervalId = setInterval(fetchData, refetchInterval);
    return () => clearInterval(intervalId);
  }, [enabled, refetchInterval, fetchData]);

  // Mark as stale after staleTime
  useEffect(() => {
    if (!state.data || state.isLoading) return;

    const timeoutId = setTimeout(() => {
      setState(prev => ({ ...prev, isStale: true }));
    }, staleTime);

    return () => clearTimeout(timeoutId);
  }, [state.data, state.isLoading, staleTime]);

  return {
    ...state,
    refetch: fetchData,
    invalidate,
  };
}

// ============ useMutation HOOK ============
export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
  invalidateQueries?: string[];
}

export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<ApiResult<TData>>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: Error | null;
  data: TData | null;
  reset: () => void;
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResult<TData>>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled, invalidateQueries } = options;

  const [state, setState] = useState<{
    isLoading: boolean;
    error: Error | null;
    data: TData | null;
  }>({
    isLoading: false,
    error: null,
    data: null,
  });

  const mutate = useCallback(async (variables: TVariables): Promise<ApiResult<TData>> => {
    setState({ isLoading: true, error: null, data: null });

    const result = await mutationFn(variables);

    if (result.success) {
      setState({ isLoading: false, error: null, data: result.data });
      onSuccess?.(result.data, variables);
      
      // Invalidate related queries
      if (invalidateQueries) {
        invalidateQueries.forEach(query => api.invalidateCache(query));
      }
    } else {
      setState({ isLoading: false, error: result.error, data: null });
      onError?.(result.error, variables);
    }

    onSettled?.(result.success ? result.data : null, result.success ? null : result.error, variables);
    return result;
  }, [mutationFn, onSuccess, onError, onSettled, invalidateQueries]);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    const result = await mutate(variables);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  }, [mutate]);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    mutate,
    mutateAsync,
    reset,
  };
}

// ============ useApiHealth HOOK ============
export function useApiHealth(checkInterval = 30000) {
  const [health, setHealth] = useState<{
    configured: boolean;
    reachable: boolean;
    latency?: number;
    lastCheck?: Date;
    error?: string;
  }>({
    configured: false,
    reachable: false,
  });

  const checkHealth = useCallback(async () => {
    const result = await checkApiHealth();
    setHealth({
      ...result,
      lastCheck: new Date(),
    });
  }, []);

  useEffect(() => {
    checkHealth();
    const intervalId = setInterval(checkHealth, checkInterval);
    return () => clearInterval(intervalId);
  }, [checkHealth, checkInterval]);

  return health;
}

// ============ useDebounce HOOK ============
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============ useLocalStorage HOOK ============
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Failed to save to localStorage:`, error);
      }
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}

export default useApi;
