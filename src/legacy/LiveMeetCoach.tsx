/**
 * LiveMeetCoach
 *
 * Main live AI coaching experience for Google Meet.
 * Handles transcript, coaching, and feedback logic.
 *
 * For handover: All live coaching logic is here. Used by MeetCoach page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Flame, PlugZap, RefreshCw, Sparkles, Video } from 'lucide-react';
import { buildFunctionUrl, functionsBase, publicAnonKey, isSupabaseConfigured } from '../utils/supabase/info';
import { useSales } from '../contexts/SalesContext';

// Add your types/interfaces here if needed
// Example:
// interface TranscriptEvent { ... }
// interface SpinOutput { ... }

export default function LiveMeetCoach() {
  // Add your state and refs here, for example:
  // const [callId, setCallId] = useState('');
  // const [events, setEvents] = useState<TranscriptEvent[]>([]);
  // const [spinOutput, setSpinOutput] = useState<SpinOutput | null>(null);
  // ...etc...

  const pollInterval = 2000;

  const instructions = useMemo(
    () => [
      '1) Otevři Google Meet, zapni Captions (CC).',
      '2) V extension popupu "Meet Coach - Bridge" vlož Call ID zespodu.',
      '3) Klikni Connect; transkript se objeví tady.',
    ],
    [],
  );

  useEffect(() => {
    if (!isRunning || !activeCallId) return;
    const url = buildFunctionUrl(`meet/transcript/${activeCallId}${lastTs ? `?since=${lastTs}` : ''}`);
    if (!url || !isSupabaseConfigured) return;

    const fetchLoop = async () => {
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'x-echo-user': activeCallId,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const newEvents: TranscriptEvent[] = data.events || [];
        if (newEvents.length > 0) {
          setEvents((prev) => [...prev, ...newEvents]);
          setLastTs(newEvents[newEvents.length - 1].ts);
        }
      } catch (e) {
        console.error('Meet transcript fetch failed', e);
      }
    };

    const timer = setInterval(fetchLoop, pollInterval);
    fetchLoop();
    return () => clearInterval(timer);
  }, [isRunning, activeCallId, lastTs]);

  const runSpinCoach = async (opts?: { force?: boolean }) => {
    if (!isRunning || !activeCallId) return;
    if (!isSupabaseConfigured) return;
    if (coachingInFlightRef.current) return;
    if (events.length === 0) return;

    const latestTs = events[events.length - 1]?.ts ?? null;
    const force = Boolean(opts?.force);
    if (!force && latestTs && lastCoachedTsRef.current === latestTs) return;
    const now = Date.now();
    if (!force && now - lastCoachAtRef.current < 2500) return;

    const url = buildFunctionUrl('ai/spin/next');
    if (!url) return;

    coachingInFlightRef.current = true;
    setIsCoaching(true);
    setSpinError(null);
    lastCoachAtRef.current = now;

    try {
      const transcriptWindow = events
        .slice(-12)
        .map((e) => `${e.speaker || 'peer'}: ${e.text}`)
        .join('\n');

      const stageTimers = {
        total: startedAt ? Math.floor((now - startedAt) / 1000) : 0,
        stage: stageStartedAt ? Math.floor((now - stageStartedAt) / 1000) : 0,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'x-echo-user': activeCallId,
        },
        body: JSON.stringify({
          mode: 'live',
          stage: spinStage,
          stageTimers,
          transcriptWindow: transcriptWindow.split('\n'),
          recap: '',
          dealState: dealContext || '',
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const output: SpinOutput | null = data?.output || null;
      if (output) {
        setSpinOutput(output);
        if (output.stage && output.stage !== spinStage) {
          setSpinStage(output.stage);
          setStageStartedAt(now);
        }
      }
      lastCoachedTsRef.current = latestTs;
    } catch (e) {
      console.error('SPIN coach failed', e);
      setSpinError(e instanceof Error ? e.message : String(e));
    } finally {
      coachingInFlightRef.current = false;
      setIsCoaching(false);
    }
  };

  useEffect(() => {
    if (!isRunning || !activeCallId) return;
    void runSpinCoach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, isRunning, activeCallId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events]);

  const handleStart = () => {
    if (!callId) return;
    setEvents([]);
    setLastTs(null);
    setActiveCallId(callId.trim().toUpperCase());
    setIsRunning(true);
    const now = Date.now();
    setStartedAt(now);
    setStageStartedAt(now);
    setSpinStage('situation');
    setSpinOutput(null);
    setSpinError(null);
    lastCoachedTsRef.current = null;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(callId);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  };

  const handleCopyEndpoint = async () => {
    if (!functionsBase) return;
    try {
      await navigator.clipboard.writeText(functionsBase);
    } catch (e) {
      console.warn('Endpoint copy failed', e);
    }
  };

  const handleRefresh = () => {
    setEvents([]);
    setLastTs(null);
  };

  const focusScore = Math.min(100, Math.max(48, Math.round((stats.streak || 1) * 8 + events.length)));

  const feedbackItems = [
    {
      type: 'WIN' as const,
      text: 'Great pace on the opener. You kept control of the first 20 seconds.',
      action: 'Keep the opener under 25s.',
    },
    {
      type: 'IMPROVE' as const,
      text: 'You interrupted the prospect twice when they mentioned budget.',
      action: 'Pause 2 seconds before responding.',
    },
    {
      type: 'TIP' as const,
      text: spinOutput?.say_next || 'Try a softer transition into your next question.',
      action: 'Ask one discovery question before pitching.',
    },
  ];

  return (
    <div className="figma-shell figma-grid-bg space-y-6">
      <div className="neo-panel-shadow bg-white p-5 flex items-center justify-between gap-4">
        <div>
          <div className="neo-tag neo-tag-yellow">TACTICAL DEBRIEF</div>
          <h1 className="neo-display text-5xl font-black mt-3">TACTICAL DEBRIEF</h1>
          <p className="text-sm font-mono font-bold opacity-70 mt-2">AI Analysis of recent performance.</p>
        </div>
        <button className="neo-btn bg-white px-4 py-2 text-sm flex items-center gap-2" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" /> Clear Feed
        </button>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="neo-panel-shadow bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--neo-purple)' }} />
              <div className="font-mono text-xs font-bold uppercase tracking-wider">Feedback Feed</div>
            </div>
            <div className="space-y-4">
              {feedbackItems.map((item, idx) => (
                <div
                  key={`${item.type}-${idx}`}
                  className="neo-panel-shadow bg-white p-4"
                  style={{
                    borderColor:
                      item.type === 'WIN'
                        ? 'var(--neo-green)'
                        : item.type === 'IMPROVE'
                          ? 'var(--neo-yellow)'
                          : 'var(--neo-blue)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="neo-tag"
                      style={{
                        background:
                          item.type === 'WIN'
                            ? 'var(--neo-green)'
                            : item.type === 'IMPROVE'
                              ? 'var(--neo-yellow)'
                              : 'var(--neo-blue)',
                      }}
                    >
                      {item.type}
                    </span>
                    <span className="text-xs font-mono font-bold uppercase opacity-60">{spinStage}</span>
                  </div>
                  <div className="text-sm font-bold leading-relaxed">{item.text}</div>
                  <div className="mt-2 text-xs font-mono font-bold uppercase opacity-70">Action: {item.action}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="neo-panel-shadow bg-white p-5">
            <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70 mb-2">Gamification</div>
            <div className="space-y-3">
              <div className="neo-panel bg-white p-4" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase opacity-70">
                  <Flame size={14} /> Current Streak
                </div>
                <div className="neo-display text-3xl font-black mt-2">{stats.streak} days</div>
              </div>
              <div className="neo-panel bg-white p-4" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase opacity-70">
                  <Video size={14} /> Focus Score
                </div>
                <div className="neo-display text-3xl font-black mt-2">{focusScore}/100</div>
              </div>
            </div>
          </div>

          <div className="neo-panel-shadow bg-white p-5">
            <p className="text-xs font-bold uppercase mb-2">Instrukce</p>
            <ul className="text-sm font-mono font-bold space-y-1">
              {instructions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Live Session Bridge */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="neo-panel-shadow bg-white p-5">
            <label className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">Call ID</label>
            <div className="mt-2 flex gap-2">
              <input
                value={callId}
                onChange={(e) => setCallId(e.target.value.toUpperCase())}
                className="neo-input flex-1 font-mono"
              />
              <button className="neo-btn bg-white flex items-center gap-2 px-3 py-2" onClick={handleCopy}>
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button className="neo-btn neo-bg-yellow flex items-center gap-2 px-3 py-2" onClick={handleStart}>
                <PlugZap className="w-4 h-4" /> Connect
              </button>
            </div>
            <p className="text-xs font-mono font-bold opacity-60 mt-2">Vlož toto ID do popupu Meet Coach extension a klikni Connect.</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs font-mono opacity-70">
                <span className="font-semibold">Endpoint:</span>{' '}
                <span className="font-mono break-all">{functionsBase || '(Supabase není nakonfigurovaný)'}</span>
              </div>
              <button
                className="neo-btn bg-white flex items-center gap-2 px-3 py-2"
                onClick={handleCopyEndpoint}
                disabled={!functionsBase}
              >
                <Copy className="w-4 h-4" /> Copy Endpoint
              </button>
            </div>
          </div>

          <div className="neo-panel-shadow bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--neo-purple)' }} />
                <p className="text-xs font-bold uppercase">Live Coaching</p>
                <span className="text-xs font-mono opacity-60">{spinStage}</span>
                {isCoaching && <span className="text-xs opacity-60">(thinking...)</span>}
              </div>
              <button
                className="neo-btn bg-white flex items-center gap-2 px-3 py-2"
                onClick={() => runSpinCoach({ force: true })}
                disabled={!isRunning || !activeCallId || isCoaching || !isSupabaseConfigured}
              >
                <RefreshCw className="w-4 h-4" /> Generate
              </button>
            </div>

            {spinError && (
              <div className="neo-panel bg-white p-3" style={{ boxShadow: 'var(--neo-shadow-xs)', borderColor: 'var(--neo-red)' }}>
                Coaching error: <span className="font-mono">{spinError}</span>
              </div>
            )}

            {!spinOutput && !spinError && (
              <div className="neo-panel bg-white p-4" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                Začni Meet stream a jakmile přijdou titulky, objeví se tady doporučení „co říct dál“.
              </div>
            )}

            {spinOutput && (
              <div className="grid grid-cols-2 gap-3">
                <div className="neo-panel bg-white p-4" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                  <p className="text-xs font-bold uppercase mb-2">Say Next</p>
                  <p className="text-base font-semibold leading-relaxed">{spinOutput.say_next}</p>
                  <p className="text-xs mt-3">
                    Confidence: <span className="font-mono">{Math.round((spinOutput.confidence || 0) * 100)}%</span>
                  </p>
                </div>
                <div className="neo-panel bg-white p-4" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                  <p className="text-xs font-bold uppercase mb-2">Coach Whisper</p>
                  <p className="text-sm leading-relaxed">{spinOutput.coach_whisper || '(none)'}</p>
                  {(spinOutput.why || spinOutput.risk) && (
                    <div className="mt-3 text-xs space-y-1">
                      {spinOutput.why && <p><span className="font-semibold">Why:</span> {spinOutput.why}</p>}
                      {spinOutput.risk && <p><span className="font-semibold">Risk:</span> {spinOutput.risk}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="neo-panel bg-white p-4">
            <p className="text-xs font-bold uppercase mb-2">Deal Context (optional)</p>
            <textarea
              value={dealContext}
              onChange={(e) => setDealContext(e.target.value)}
              placeholder="e.g. product, ICP, pricing, current situation..."
              className="w-full h-[140px] resize-none neo-panel bg-white p-3 font-mono text-sm"
              style={{ boxShadow: 'var(--neo-shadow-xs)' }}
            />
            <p className="text-xs font-mono opacity-70 mt-2">Používá se pro živé SPIN coaching tipy.</p>
          </div>

          <div className="neo-panel-shadow bg-white p-4 h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className="text-sm font-medium">Live Transcript</span>
                {activeCallId && <span className="text-xs font-mono opacity-70">{activeCallId}</span>}
              </div>
              <span className="text-xs opacity-70">{events.length} messages</span>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 neo-panel bg-white p-3" style={{ boxShadow: 'none' }}>
              {events.length === 0 && (
                <div className="text-center text-sm py-12 opacity-60">Čekám na titulky z Meet...</div>
              )}
              {events.map((evt) => (
                <div key={evt.id} className="neo-panel bg-white p-3" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase">
                      {evt.speakerName ? `${evt.speakerName} (${evt.speaker || 'peer'})` : evt.speaker || 'peer'}
                    </span>
                    <span className="text-[10px] font-mono opacity-60">{new Date(evt.ts).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{evt.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
