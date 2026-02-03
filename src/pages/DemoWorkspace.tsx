import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, PlayCircle, Sparkles, StopCircle } from 'lucide-react';
import { echoApi } from '../utils/echoApi';
import { getExtensionStatus, listenToExtension, type ExtensionStatus } from '../utils/extensionBridge';
import { buildFunctionUrl, functionsBase, isSupabaseConfigured, publicAnonKey } from '../utils/supabase/info';

type TranscriptEvent = {
  id: string;
  ts: number;
  text: string;
  speaker?: string;
  speakerName?: string;
};

type SpinPrompts = {
  situation: string;
  problem: string;
  implication: string;
  needPayoff: string;
  closing: string;
};

const STORAGE_MEET_LINK = 'echo.demo.meet_link';
const STORAGE_MEET_CALL = 'echo.demo.meet_call_id';
const STORAGE_SPIN_PROMPTS = 'echo.demo.spin_prompts';

const emptyPrompts: SpinPrompts = {
  situation: '',
  problem: '',
  implication: '',
  needPayoff: '',
  closing: '',
};

const extractMeetCode = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/meet\.google\.com\/([a-zA-Z0-9-]{6,})/i);
  if (urlMatch?.[1]) return urlMatch[1].toUpperCase();
  const codeMatch = trimmed.match(/^[a-zA-Z0-9-]{6,}$/);
  if (codeMatch) return trimmed.toUpperCase();
  return '';
};

const buildSpinContext = (prompts: SpinPrompts) => {
  const lines = [
    prompts.situation && `Situation: ${prompts.situation}`,
    prompts.problem && `Problem: ${prompts.problem}`,
    prompts.implication && `Implication: ${prompts.implication}`,
    prompts.needPayoff && `Need-Payoff: ${prompts.needPayoff}`,
    prompts.closing && `Closing: ${prompts.closing}`,
  ].filter(Boolean);
  if (!lines.length) return '';
  return `Custom SPIN prompts:\n${lines.join('\n')}`;
};

export function DemoWorkspace() {
  const [meetLink, setMeetLink] = useState('');
  const [meetCallId, setMeetCallId] = useState('');
  const [callIdTouched, setCallIdTouched] = useState(false);
  const [meetActive, setMeetActive] = useState(false);
  const [meetEvents, setMeetEvents] = useState<TranscriptEvent[]>([]);
  const [meetError, setMeetError] = useState<string | null>(null);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>(() => getExtensionStatus());
  const [lastCaption, setLastCaption] = useState('');
  const transcriptRef = useRef<Array<{ text: string; ts: number }>>([]);
  const meetLastTsRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [focusMode, setFocusMode] = useState<'spin' | 'objection' | 'closing'>('spin');
  const [spinStage, setSpinStage] = useState<'situation' | 'problem' | 'implication' | 'need_payoff' | 'close'>('situation');
  const [objectionTrigger, setObjectionTrigger] = useState('');
  const [liveCoachingEnabled, setLiveCoachingEnabled] = useState(true);
  const [coachTip, setCoachTip] = useState('');
  const [coachWhisper, setCoachWhisper] = useState('');
  const [coachConfidence, setCoachConfidence] = useState<number | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [objectionPack, setObjectionPack] = useState<any | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const lastCoachAtRef = useRef<number>(0);

  const [spinPrompts, setSpinPrompts] = useState<SpinPrompts>(emptyPrompts);
  const [useSpinPrompts, setUseSpinPrompts] = useState(true);

  const derivedCallId = useMemo(() => extractMeetCode(meetLink), [meetLink]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedLink = window.localStorage.getItem(STORAGE_MEET_LINK);
      if (storedLink) setMeetLink(storedLink);
      const storedCall = window.localStorage.getItem(STORAGE_MEET_CALL);
      if (storedCall) {
        setMeetCallId(storedCall);
        setCallIdTouched(true);
      }
      const storedPrompts = window.localStorage.getItem(STORAGE_SPIN_PROMPTS);
      if (storedPrompts) {
        const parsed = JSON.parse(storedPrompts);
        setSpinPrompts({ ...emptyPrompts, ...parsed });
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!callIdTouched && derivedCallId) {
      setMeetCallId(derivedCallId);
    }
  }, [derivedCallId, callIdTouched]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_MEET_LINK, meetLink);
    } catch {
      // ignore
    }
  }, [meetLink]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (meetCallId.trim()) window.localStorage.setItem(STORAGE_MEET_CALL, meetCallId.trim().toUpperCase());
    } catch {
      // ignore
    }
  }, [meetCallId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_SPIN_PROMPTS, JSON.stringify(spinPrompts));
    } catch {
      // ignore
    }
  }, [spinPrompts]);

  useEffect(() => {
    const unsub = listenToExtension({
      onStatus: (s) => setExtensionStatus(s),
      onMeetCaption: (chunk) => {
        const ts = typeof chunk.captured_at === 'number' ? chunk.captured_at : Date.now();
        setLastCaption(chunk.text);
        transcriptRef.current = [...transcriptRef.current, { text: chunk.text, ts }].slice(-24);
        setMeetEvents((prev) => {
          const exists = prev.some((evt) => evt.ts === ts && evt.text === chunk.text);
          if (exists) return prev;
          const next: TranscriptEvent = {
            id: `ext-${ts}-${prev.length}`,
            ts,
            text: chunk.text,
            speaker: chunk.speaker,
          };
          return [...prev, next].slice(-160);
        });
      },
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!meetActive || !meetCallId.trim() || !isSupabaseConfigured) return;
    let mounted = true;

    const fetchTranscript = async () => {
      const since = meetLastTsRef.current;
      const url = buildFunctionUrl(`meet/transcript/${meetCallId.trim().toUpperCase()}${since ? `?since=${since}` : ''}`);
      if (!url) return;
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'x-echo-user': meetCallId.trim().toUpperCase(),
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: TranscriptEvent[] = data.events || [];
        if (!incoming.length || !mounted) return;
        const last = incoming[incoming.length - 1];
        meetLastTsRef.current = last.ts;
        setMeetEvents((prev) => [...prev, ...incoming].slice(-200));
        incoming.forEach((event) => {
          transcriptRef.current = [...transcriptRef.current, { text: event.text, ts: event.ts }].slice(-24);
        });
        setLastCaption(last.text);
      } catch {
        // ignore polling errors
      }
    };

    const interval = window.setInterval(fetchTranscript, 2000);
    void fetchTranscript();
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [meetActive, meetCallId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [meetEvents]);

  const isCallIdValid = meetCallId.trim().length >= 8;

  const handleMeetConnect = () => {
    const value = meetCallId.trim().toUpperCase();
    if (!value || value.length < 8) {
      setMeetError('Call ID musí mít alespoň 8 znaků.');
      return;
    }
    setMeetCallId(value);
    setMeetEvents([]);
    meetLastTsRef.current = null;
    setMeetActive(true);
    setMeetError(null);
  };

  const handleMeetStop = () => {
    setMeetActive(false);
  };

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMeetError('Zkopírováno do schránky.');
      window.setTimeout(() => setMeetError(null), 1600);
    } catch {
      setMeetError('Kopírování se nezdařilo.');
    }
  };

  const runCoach = async () => {
    if (!transcriptRef.current.length) {
      setCoachTip('Čekám na titulky z Meet...');
      return;
    }
    const fallbackCoach = () => {
      const lastItem = transcriptRef.current[transcriptRef.current.length - 1];
      const latest = (lastCaption || lastItem?.text || '').toLowerCase();
      if (focusMode === 'closing') {
        return 'Navrhni konkrétní termín a potvrď další krok.';
      }
      if (focusMode === 'objection') {
        if (latest.includes('cena') || latest.includes('budget') || latest.includes('price')) {
          return 'Zeptej se na rámec rozpočtu a ukaž dopad na jejich KPI.';
        }
        if (latest.includes('čas') || latest.includes('timing') || latest.includes('pozd')) {
          return 'Potvrď timing a navrhni konkrétní slot na další krok.';
        }
        if (latest.includes('konkur') || latest.includes('nástroj') || latest.includes('tool')) {
          return 'Zeptej se, co jim současné řešení nedává.';
        }
        return 'Validuj námitku a vrať se k dopadu problému.';
      }
      switch (spinStage) {
        case 'problem':
          return 'Zeptej se na největší bolest a jak často vzniká.';
        case 'implication':
          return 'Dostaň čísla: čas, peníze, riziko dopadu.';
        case 'need_payoff':
          return 'Zeptej se na ideální výsledek a KPI, které chtějí zlepšit.';
        case 'close':
          return 'Požádej o konkrétní termín dalšího kroku.';
        default:
          return 'Získej základní fakta o jejich současném procesu.';
      }
    };

    if (!isSupabaseConfigured) {
      setCoachTip(fallbackCoach());
      setCoachWhisper('Supabase není nastavený — zapni ho pro plné AI coaching.');
      setCoachError('Chybí Supabase konfigurace.');
      setCoachConfidence(null);
      setObjectionPack(null);
      return;
    }

    setAiBusy(true);
    setCoachError(null);
    try {
      const transcriptWindow = transcriptRef.current.slice(-12).map((x) => `prospect: ${x.text}`);
      const dealState = useSpinPrompts ? buildSpinContext(spinPrompts) : '';
      const stage = focusMode === 'closing' ? 'close' : spinStage;
      const objection = focusMode === 'objection' ? (objectionTrigger.trim() || lastCaption || 'objection') : undefined;
      const res = await echoApi.ai.spinNext({
        stage,
        mode: 'live',
        transcriptWindow,
        recap: '',
        dealState,
        strict: true,
        objectionTrigger: objection,
      });
      const output = res?.output || res;
      setCoachTip(output?.say_next || output?.coach_whisper || '(pause)');
      setCoachWhisper(output?.coach_whisper || output?.why || '');
      setCoachConfidence(typeof output?.confidence === 'number' ? output.confidence : null);
      setObjectionPack(res?.agents?.objection || null);
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : 'Coach request failed');
      setCoachTip(fallbackCoach());
      setCoachConfidence(null);
      setObjectionPack(null);
    } finally {
      setAiBusy(false);
    }
  };

  useEffect(() => {
    if (!liveCoachingEnabled) return;
    if (!lastCaption) return;
    const now = Date.now();
    if (now - lastCoachAtRef.current < 9000) return;
    lastCoachAtRef.current = now;
    void runCoach();
  }, [lastCaption, liveCoachingEnabled]);

  return (
    <div className="workspace" data-testid="demo-workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Google Meet</p>
            <h2>Propojení hovoru</h2>
          </div>
          <span className="pill subtle">{extensionStatus.connected ? 'Ext: zapnuto' : 'Ext: vypnuto'}</span>
        </div>

        <div>
          <div className="muted text-xs">Odkaz na Google Meet</div>
          <input
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
          />
          <div className="muted text-xs mt-2">
            Detekovaný kód: {derivedCallId || '—'}
          </div>
          {meetLink.trim() && !derivedCallId && (
            <div className="status-line small">Odkaz nevypadá jako Google Meet.</div>
          )}
        </div>

        <div>
          <div className="muted text-xs">Call ID pro Meet Coach extension</div>
          <input
            value={meetCallId}
            onChange={(e) => {
              setCallIdTouched(true);
              setMeetCallId(e.target.value.toUpperCase());
            }}
            placeholder="CALL ID (např. ABCD1234)"
          />
        </div>

        <div className="button-row wrap">
          <button className="btn outline sm" onClick={handleMeetConnect} disabled={!isCallIdValid} type="button">
            <PlayCircle size={14} /> Propojit
          </button>
          <button className="btn ghost sm" onClick={handleMeetStop} disabled={!meetActive} type="button">
            <StopCircle size={14} /> Zastavit
          </button>
          <button className="btn ghost sm" onClick={() => void copyText(meetCallId.trim().toUpperCase())} disabled={!meetCallId.trim()} type="button">
            <Copy size={14} /> Kopírovat Call ID
          </button>
        </div>

        <div className="button-row wrap">
          <button className="btn ghost sm" onClick={() => void copyText(functionsBase)} disabled={!functionsBase} type="button">
            <Copy size={14} /> Kopírovat Endpoint
          </button>
          <button className="btn ghost sm" onClick={() => void copyText(publicAnonKey)} disabled={!publicAnonKey} type="button">
            <Copy size={14} /> Kopírovat Token
          </button>
        </div>

        <div className="muted text-xs break-all">
          Endpoint: {functionsBase || 'Supabase functions endpoint není nastavený.'}
        </div>
        <div className="muted text-xs break-all">
          Auth token: {publicAnonKey ? 'Anon key připravený (vložit do extension Advanced).' : 'Chybí VITE_SUPABASE_ANON_KEY.'}
        </div>
        <div className="muted text-xs">
          Zapni titulky v Meet a do Chrome extension vlož Call ID + Endpoint + Auth token.
        </div>
        {!isSupabaseConfigured && (
          <div className="muted text-xs">
            Supabase není nastavený — coaching poběží z lokálních titulků, feed se neukáže.
          </div>
        )}
        {meetActive && <div className="muted text-xs">Titulky: {meetEvents.length} řádků</div>}
        {meetError && <div className="status-line small">{meetError}</div>}
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Real-time coaching</p>
            <h2>Námitky & Closing</h2>
            <p className="muted">
              Zaměření: {focusMode === 'spin' ? 'SPIN' : focusMode === 'objection' ? 'Námitky' : 'Closing'}
            </p>
          </div>
          <div className="button-row">
            <button className="btn ghost sm" onClick={() => setLiveCoachingEnabled((v) => !v)} type="button">
              {liveCoachingEnabled ? 'Live zapnuto' : 'Live vypnuto'}
            </button>
            <button className="btn outline sm" onClick={() => void runCoach()} disabled={aiBusy} type="button">
              <Sparkles size={14} /> {aiBusy ? 'Přemýšlím…' : 'Tip teď'}
            </button>
            <span className="pill subtle">{aiBusy ? 'Pracuji…' : 'Připraveno'}</span>
          </div>
        </div>

        <div className="coach-box focus">
          <p className="say-next">{coachTip || 'Čekám na titulky z Meet...'}</p>
          {coachWhisper && <p className="muted text-sm mt-2">{coachWhisper}</p>}
          {coachConfidence !== null && (
            <div className="muted text-xs mt-2">Confidence: {Math.round(coachConfidence * 100)}%</div>
          )}
          {coachError && <div className="status-line small">{coachError}</div>}
        </div>

        {focusMode === 'objection' && objectionPack && (
          <div className="coach-box mt-2">
          <div className="muted text-xs">Toolkit námitek</div>
            <p className="say-next">{objectionPack.rebuttal || '—'}</p>
            <p className="muted text-sm mt-2">{objectionPack.redirect_question || ''}</p>
            <p className="muted text-sm mt-1">{objectionPack.close_retry || ''}</p>
          </div>
        )}

        <div className="panel soft mt-3">
          <div className="panel-head tight">
            <span className="eyebrow">Živý přepis</span>
            <span className="pill subtle">{meetEvents.length} řádků</span>
          </div>
          <div ref={listRef} className="list" style={{ maxHeight: 320 }}>
            {meetEvents.length === 0 && <div className="muted text-sm">Čekám na titulky z Meet…</div>}
            {meetEvents.map((evt) => (
              <div key={evt.id} className="list-row">
                <div>
                  <div className="muted text-xs">
                    {evt.speakerName || evt.speaker || 'Speaker'} ·{' '}
                    {new Date(evt.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm">{evt.text}</div>
                </div>
              </div>
            ))}
          </div>
          {lastCaption && <div className="muted text-xs mt-2">Poslední: {lastCaption}</div>}
        </div>
      </div>

      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Zaměření</p>
            <h2>SPIN & custom</h2>
          </div>
          <span className="pill subtle">{useSpinPrompts ? 'Custom zapnuto' : 'Custom vypnuto'}</span>
        </div>

        <div className="button-row wrap">
          <button className={`btn ghost sm ${focusMode === 'spin' ? 'active' : ''}`} onClick={() => setFocusMode('spin')} type="button">
            SPIN
          </button>
          <button className={`btn ghost sm ${focusMode === 'objection' ? 'active' : ''}`} onClick={() => setFocusMode('objection')} type="button">
            Námitky
          </button>
          <button className={`btn ghost sm ${focusMode === 'closing' ? 'active' : ''}`} onClick={() => setFocusMode('closing')} type="button">
            Closing
          </button>
        </div>

        {focusMode === 'spin' && (
          <div className="button-row wrap">
            {(['situation', 'problem', 'implication', 'need_payoff', 'close'] as const).map((stage) => (
              <button
                key={stage}
                className={`btn ghost sm ${spinStage === stage ? 'active' : ''}`}
                onClick={() => setSpinStage(stage)}
                type="button"
              >
                {stage === 'need_payoff' ? 'Need-Payoff' : stage === 'close' ? 'Close' : stage.charAt(0).toUpperCase() + stage.slice(1)}
              </button>
            ))}
          </div>
        )}

        {focusMode === 'objection' && (
          <div>
            <div className="muted text-xs">Námitka (volitelné)</div>
            <input
              value={objectionTrigger}
              onChange={(e) => setObjectionTrigger(e.target.value)}
              placeholder="Např. cena, timing, konkurence..."
            />
          </div>
        )}

        {focusMode === 'closing' && (
          <div className="muted text-xs">
            Closing režim používá stage „Close“ a tlačí na konkrétní slot/next step.
          </div>
        )}

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Custom SPIN dotazy</span>
            <button className="btn ghost sm" onClick={() => setUseSpinPrompts((v) => !v)} type="button">
              {useSpinPrompts ? 'Vypnout' : 'Zapnout'}
            </button>
          </div>

          <div className="muted text-xs">Situation otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.situation}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, situation: e.target.value }))}
            placeholder="Jaký je váš current stack? Kdy plánujete změnu?"
          />

          <div className="muted text-xs mt-2">Problem otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.problem}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, problem: e.target.value }))}
            placeholder="Co vám dneska nejvíc komplikuje X?"
          />

          <div className="muted text-xs mt-2">Implication otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.implication}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, implication: e.target.value }))}
            placeholder="Co se stane, když to zůstane stejně další 3 měsíce?"
          />

          <div className="muted text-xs mt-2">Need-Payoff otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.needPayoff}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, needPayoff: e.target.value }))}
            placeholder="Jaký dopad by mělo, kdybychom to vyřešili?"
          />

          <div className="muted text-xs mt-2">Closing otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.closing}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, closing: e.target.value }))}
            placeholder="Můžeme si rovnou dát demo ve čtvrtek v 10:00?"
          />
        </div>
      </div>
    </div>
  );
}
