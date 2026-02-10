/**
 * useMeetCaptions – Hook for receiving live captions from Google Meet extension
 * 
 * Listens for postMessage events from the meet-coach Chrome extension bridge.
 * Returns caption lines and connection status.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CaptionLine {
  id: string;
  ts: number;
  text: string;
  speaker: string | null;
}

interface MeetCaptionsState {
  lines: CaptionLine[];
  isConnected: boolean;
  lastCaptionAt: number | null;
}

function makeId(ts: number, text: string, speaker?: string | null): string {
  const base = `${ts}|${speaker || ''}|${text}`;
  let h = 2166136261;
  for (let i = 0; i < base.length; i++) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `cap_${(h >>> 0).toString(16)}`;
}

export function useMeetCaptions(): MeetCaptionsState {
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const [lastCaptionAt, setLastCaptionAt] = useState<number | null>(null);
  const [bridgeReadyAt, setBridgeReadyAt] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const recentIdsRef = useRef<Set<string>>(new Set());
  const lastCaptionAtRef = useRef<number | null>(null);
  
  // Periodically re-evaluate connection liveness (every 3s)
  useEffect(() => {
    const tick = setInterval(() => {
      const ts = lastCaptionAtRef.current;
      setIsConnected(ts !== null && (Date.now() - ts) <= 10_000);
    }, 3000);
    return () => clearInterval(tick);
  }, []);
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.source !== 'echo-meet-coach') return;
      
      if (data.type === 'BRIDGE_READY') {
        setBridgeReadyAt(Date.now());
        return;
      }
      
      if (data.type === 'MEET_CAPTION' && data.payload) {
        const payload = data.payload;
        const text = (payload.text || '').toString().trim();
        if (!text) return;
        
        const ts = typeof payload.ts === 'number' ? payload.ts : Date.now();
        const speaker = payload.speakerName || null;
        const id = makeId(ts, text, speaker);
        
        // Dedupe
        if (recentIdsRef.current.has(id)) return;
        recentIdsRef.current.add(id);
        
        // Cleanup old IDs
        if (recentIdsRef.current.size > 100) {
          const arr = Array.from(recentIdsRef.current);
          recentIdsRef.current = new Set(arr.slice(-50));
        }
        
        const captionTime = Date.now();
        lastCaptionAtRef.current = captionTime;
        setLastCaptionAt(captionTime);
        setIsConnected(true);
        setLines(prev => {
          const newLine: CaptionLine = { id, ts, text, speaker };
          const cutoff = Date.now() - 90_000; // Keep 90s of captions
          return [...prev, newLine]
            .filter(l => l.ts >= cutoff)
            .slice(-50); // Max 50 lines
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  return { lines, isConnected, lastCaptionAt };
}
