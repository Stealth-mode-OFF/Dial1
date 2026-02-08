import { useState, useCallback, useRef } from 'react';
import type { Brief, LiveCoachResponse, SpinPhase } from '../types/contracts';
import { echoApi } from '../utils/echoApi';
import { isSupabaseConfigured } from '../utils/supabase/info';

const MIN_INTERVAL_MS = 8_000; // Don't call more often than every 8s

export function useLiveCoach() {
  const [response, setResponse] = useState<LiveCoachResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCallRef = useRef(0);
  const pendingRef = useRef(false);

  const fetchTips = useCallback(
    async (captionsChunk: string, brief: Brief, currentSpinStage: SpinPhase) => {
      if (!isSupabaseConfigured) return;
      if (!captionsChunk.trim()) return;

      // Debounce
      const now = Date.now();
      if (now - lastCallRef.current < MIN_INTERVAL_MS) return;
      if (pendingRef.current) return;

      pendingRef.current = true;
      lastCallRef.current = now;
      setLoading(true);
      setError(null);

      try {
        const result = await echoApi.ai.liveCoach({
          captionsChunk,
          brief,
          currentSpinStage,
        });
        setResponse(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Coach request failed');
      } finally {
        setLoading(false);
        pendingRef.current = false;
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return { response, loading, error, fetchTips, clear };
}
