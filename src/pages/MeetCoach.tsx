import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, PlayCircle, RefreshCw, Sparkles, StopCircle } from 'lucide-react';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured, functionsBase } from '../utils/supabase/info';

type TranscriptEvent = {
  id: string;
  ts: number;
  text: string;
  speaker?: string;
  speakerName?: string;
};

export default function MeetCoach() {
  const [callId, setCallId] = useState('');
  const [activeCallId, setActiveCallId] = useState('');
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [lastTs, setLastTs] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTip, setCoachTip] = useState<string>('');
  const [coachError, setCoachError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const instructions = useMemo(
    () => [
      'Open Google Meet and enable captions (CC).',
      'Paste the Call ID into the Meet Coach extension.',
      'Press Connect to stream the transcript here.',
    ],
    [],
  );

  useEffect(() => {
    if (!isRunning || !activeCallId || !isSupabaseConfigured) return;

    const fetchTranscript = async () => {
      const url = buildFunctionUrl(`meet/transcript/${activeCallId}${lastTs ? `?since=${lastTs}` : ''}`);
      if (!url) return;
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'x-echo-user': activeCallId,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: TranscriptEvent[] = data.events || [];
        if (incoming.length) {
          setEvents((prev) => [...prev, ...incoming]);
          setLastTs(incoming[incoming.length - 1].ts);
        }
      } catch (error) {
        console.error('Transcript fetch failed', error);
      }
    };

    const interval = window.setInterval(fetchTranscript, 2000);
    void fetchTranscript();
    return () => window.clearInterval(interval);
  }, [isRunning, activeCallId, lastTs]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events]);

  const handleConnect = () => {
    if (!callId.trim()) return;
    setActiveCallId(callId.trim().toUpperCase());
    setEvents([]);
    setLastTs(null);
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleCopyEndpoint = async () => {
    if (!functionsBase) return;
    try {
      await navigator.clipboard.writeText(functionsBase);
    } catch (error) {
      console.warn('Copy failed', error);
    }
  };

  const generateCoachTip = async () => {
    setCoachError(null);
    if (!events.length) {
      setCoachTip('Capture more transcript before generating tips.');
      return;
    }

    const fallback = () => {
      const latest = events[events.length - 1]?.text?.toLowerCase() || '';
      if (latest.includes('price') || latest.includes('budget')) {
        return 'Ask for budget context before negotiating pricing.';
      }
      if (latest.includes('timeline')) {
        return 'Clarify the decision timeline and next internal steps.';
      }
      return 'Summarize the main pain point and propose the next step.';
    };

    if (!isSupabaseConfigured) {
      setCoachTip(fallback());
      return;
    }

    const url = buildFunctionUrl('ai/spin/next');
    if (!url) {
      setCoachTip(fallback());
      return;
    }

    setIsLoading(true);
    try {
      const transcriptWindow = events.slice(-10).map((event) => `${event.speaker || 'peer'}: ${event.text}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'x-echo-user': activeCallId,
        },
        body: JSON.stringify({
          mode: 'live',
          stage: 'situation',
          stageTimers: { total: 0, stage: 0 },
          transcriptWindow,
          recap: '',
          dealState: '',
        }),
      });

      if (!res.ok) {
        throw new Error(`Coach request failed (${res.status})`);
      }
      const data = await res.json();
      const sayNext = data?.output?.say_next || data?.say_next;
      setCoachTip(sayNext || fallback());
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : 'Coach request failed');
      setCoachTip(fallback());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-section app-grid">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-title text-3xl">Meet Coach</h1>
          <p className="app-subtitle">Live transcript and coaching prompts.</p>
        </div>
        <button className="app-button secondary" onClick={generateCoachTip} disabled={isLoading}>
          <Sparkles size={16} /> {isLoading ? 'Thinking...' : 'Generate tip'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="app-card app-section lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="app-card soft px-4 py-2 flex-1"
              placeholder="Call ID"
              value={callId}
              onChange={(event) => setCallId(event.target.value)}
            />
            <button className="app-button" onClick={handleConnect}>
              <PlayCircle size={16} /> Connect
            </button>
            <button className="app-button secondary" onClick={handleStop}>
              <StopCircle size={16} /> Stop
            </button>
          </div>

          <div className="mt-4 app-card soft p-4">
            <div className="flex items-center justify-between">
              <h2 className="app-title text-lg">Live transcript</h2>
              <span className="app-pill">{events.length} lines</span>
            </div>
            <div ref={listRef} className="mt-4 max-h-[360px] overflow-y-auto grid gap-3">
              {events.length === 0 && (
                <div className="app-subtitle">Waiting for captions...</div>
              )}
              {events.map((event) => (
                <div key={event.id} className="app-card soft p-3">
                  <div className="text-xs app-muted">
                    {event.speakerName || event.speaker || 'Speaker'} ·{' '}
                    {new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm mt-2">{event.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="app-card app-section">
          <h2 className="app-title text-lg">Coach guidance</h2>
          <p className="app-subtitle mt-2">Actionable next words based on the transcript.</p>
          <div className="mt-4 app-card soft p-4">
            <div className="text-sm">{coachTip || 'Generate a tip to get started.'}</div>
            {coachError && <div className="text-xs app-muted mt-2">{coachError}</div>}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="app-title text-sm">Endpoint</h3>
              <button className="app-button secondary" onClick={handleCopyEndpoint}>
                <Copy size={14} /> Copy
              </button>
            </div>
            <div className="text-xs app-muted mt-2 break-all">
              {functionsBase || 'Supabase functions endpoint not configured.'}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="app-title text-sm">How to connect</h3>
            <ul className="mt-2 text-sm app-muted list-disc pl-5 space-y-2">
              {instructions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
