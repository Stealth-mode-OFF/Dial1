import { useState, useCallback, useRef } from 'react';
import type { Brief, CallScript, BriefRequest, CallScriptRequest } from '../types/contracts';
import { echoApi } from '../utils/echoApi';
import { isSupabaseConfigured } from '../utils/supabase/info';

// Simple in-memory cache keyed by domain+person
const briefCache = new Map<string, { brief: Brief; script: CallScript | null; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function cacheKey(req: BriefRequest) {
  return `${req.domain}::${req.personName}::${req.role}`.toLowerCase();
}

export function useBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [script, setScript] = useState<CallScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (req: BriefRequest, forceRefresh = false) => {
    const key = cacheKey(req);

    // Check cache
    if (!forceRefresh) {
      const cached = briefCache.get(key);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setBrief({ ...cached.brief, cached: true });
        setScript(cached.script ? { ...cached.script, cached: true } : null);
        setError(null);
        return;
      }
    }

    if (!isSupabaseConfigured) {
      setError('Backend not configured');
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Fetch brief
      const briefResult = await echoApi.ai.brief(req);
      setBrief(briefResult);

      // Immediately fetch call script using brief
      const scriptReq: CallScriptRequest = {
        brief: briefResult,
        goal: 'Book a 20-minute Echo Pulse demo',
      };
      const scriptResult = await echoApi.ai.callScript(scriptReq);
      setScript(scriptResult);

      // Cache both
      briefCache.set(key, { brief: briefResult, script: scriptResult, ts: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate brief';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setBrief(null);
    setScript(null);
    setError(null);
  }, []);

  return { brief, script, loading, error, generate, clear };
}
