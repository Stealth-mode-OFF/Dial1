import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { Drawer } from '../components/terminal/Drawer';
import type { StatusPill } from '../components/terminal/TerminalShell';
import { echoApi, type WhisperObjectionResult } from '../utils/echoApi';
import { buildFunctionUrl, functionsBase, isSupabaseConfigured, publicAnonKey } from '../utils/supabase/info';
import { useSales } from '../contexts/SalesContext';
import type { ScreenChrome } from './BookDemoWorkspace';
import type { HotkeyHandler } from '../hooks/useHotkeys';

type TranscriptEvent = {
  id: string;
  ts: number;
  text: string;
  speaker?: string;
  speakerName?: string;
};

type Stage = 'situation' | 'problem' | 'implication' | 'need_payoff' | 'close';

type PackLine = {
  id: string;
  text: string;
  evidence_ids: string[];
  hypothesis_ids: string[];
};

type SalesPack = {
  id: string;
  contact_id: string;
  approved_facts: Array<{ evidence_id: string; claim: string; source_url: string; evidence_snippet: string; confidence: string }>;
  hypotheses: Array<{ hypothesis_id: string; hypothesis: string; how_to_verify: string; priority: string }>;
  spin_demo_pack?: {
    spin?: {
      situation: PackLine[];
      problem: PackLine[];
      implication: PackLine[];
      need_payoff: PackLine[];
    } | null;
  } | null;
};

const STORAGE_LAST_PACK_PREFIX = 'echo.lastPackId.';
const STORAGE_MEET_LINK = 'echo.live.meet_link';

const extractMeetCode = (input: string) => {
  const trimmed = (input || '').toString().trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/meet\.google\.com\/([a-zA-Z0-9-]{6,})/i);
  if (urlMatch?.[1]) return urlMatch[1].toUpperCase();
  const codeMatch = trimmed.match(/^[a-zA-Z0-9-]{6,}$/);
  if (codeMatch) return trimmed.toUpperCase();
  return '';
};

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const copyToClipboard = async (text: string) => {
  const clean = (text || '').toString().trim();
  if (!clean) return;
  try {
    await navigator.clipboard.writeText(clean);
  } catch {
    // ignore
  }
};

const defaultRunbook: Record<Exclude<Stage, 'close'>, string[]> = {
  situation: ['Jak dnes měříte spokojenost / signály fluktuace?', 'Kdy jste naposledy řešili odchody nebo burnout?'],
  problem: ['Co vám dnes nejvíc komplikuje retenci?', 'Kde se ztrácí signály, než je pozdě?'],
  implication: ['Jaký má tenhle problém dopad na náklady / výkon?', 'Co se stane, když to zůstane stejné další 3 měsíce?'],
  need_payoff: ['Kdybyste to vyřešili, co by se zlepšilo jako první?', 'Jak byste poznali, že pilot byl úspěch?'],
};

type CoachMode = 'listening' | 'talking' | 'objection' | 'wrapup';

const OUTCOMES: Array<{ id: string; label: string; hotkey: string }> = [
  { id: 'no-answer', label: 'No answer', hotkey: '1' },
  { id: 'gatekeeper', label: 'Gatekeeper', hotkey: '2' },
  { id: 'not-interested', label: 'Not interested', hotkey: '3' },
  { id: 'meeting', label: 'Meeting set', hotkey: '4' },
  { id: 'callback', label: 'Callback', hotkey: '5' },
  { id: 'wrong-person', label: 'Wrong person', hotkey: '6' },
];

export function DemoWorkspace({ chrome }: { chrome?: ScreenChrome }) {
  const { activeContact, pipedriveConfigured, logCall } = useSales();

  const [meetLink, setMeetLink] = useState('');
  const [meetActive, setMeetActive] = useState(false);
  const [mode, setMode] = useState<CoachMode>('listening');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [lastCaptionAt, setLastCaptionAt] = useState<number | null>(null);
  const [meetError, setMeetError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>('situation');
  const stageRef = useRef<Stage>('situation');
  const stageStartAtRef = useRef<number | null>(null);
  const stageTimersRef = useRef<Record<Stage, number>>({
    situation: 0,
    problem: 0,
    implication: 0,
    need_payoff: 0,
    close: 0,
  });

  const [pack, setPack] = useState<SalesPack | null>(null);

  const [nowTick, setNowTick] = useState(0);
  const callStartedAtRef = useRef<number | null>(null);

  const meetLastTsRef = useRef<number | null>(null);
  const lastCoachAtRef = useRef<number>(0);
  const lastCoachedLineRef = useRef<string>('');

  const [coachBusy, setCoachBusy] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [sayNext, setSayNext] = useState('');
  const [why, setWhy] = useState('');
  const [risk, setRisk] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);

  const [objectionDraft, setObjectionDraft] = useState('');
  const [objectionBusy, setObjectionBusy] = useState(false);
  const [objectionError, setObjectionError] = useState<string | null>(null);
  const [objectionPack, setObjectionPack] = useState<WhisperObjectionResult | null>(null);

  const [wrapOutcome, setWrapOutcome] = useState('meeting');
  const [wrapNotes, setWrapNotes] = useState('');
  const [wrapStatus, setWrapStatus] = useState<string | null>(null);
  const [wrapSaving, setWrapSaving] = useState(false);

  const contactExternalId = activeContact?.id || '';

  const callId = useMemo(() => extractMeetCode(meetLink), [meetLink]);

  const callSeconds = useMemo(() => {
    const started = callStartedAtRef.current;
    if (!meetActive || !started) return 0;
    return Math.max(0, Math.floor((Date.now() - started) / 1000));
  }, [meetActive, nowTick]);

  const stagePill = useMemo(() => {
    const map: Record<Stage, string> = {
      situation: 'S',
      problem: 'P',
      implication: 'I',
      need_payoff: 'N',
      close: 'C',
    };
    return map[stage];
  }, [stage]);

  const transcriptWindow = useMemo(() => {
    return events.slice(-14).map((e) => {
      const who = e.speaker === 'user' ? 'ME' : 'THEM';
      return `${who}: ${e.text}`;
    });
  }, [events]);

  const transcriptDrawerLines = useMemo(() => {
    return events.slice(-10).map((e) => {
      const who = e.speaker === 'user' ? 'ME' : 'THEM';
      return `${who}: ${e.text}`;
    });
  }, [events]);

  const connectionStatus = useMemo(() => {
    if (!meetActive) return { text: 'Not connected', tone: 'subtle' as const };
    const age = lastCaptionAt ? Date.now() - lastCaptionAt : null;
    if (age !== null && age < 12_000) return { text: 'Connected', tone: 'success' as const };
    return { text: 'Captions missing', tone: 'warning' as const };
  }, [meetActive, lastCaptionAt, nowTick]);

  const proofPack = useMemo(() => {
    const facts = (pack?.approved_facts || []).slice(0, 4).map((f) => `- ${f.claim}`);
    const hyps = (pack?.hypotheses || []).slice(0, 2).map((h) => `- HYP: ${h.hypothesis} (ověř: ${h.how_to_verify})`);
    const lines = [...(facts.length ? ['Verified facts:', ...facts] : []), ...(hyps.length ? ['', 'Hypotheses:', ...hyps] : [])];
    return lines.join('\n').trim();
  }, [pack]);

  const runbook = useMemo(() => {
    const spin = pack?.spin_demo_pack?.spin || null;
    if (!spin) return null;
    return {
      situation: spin.situation.slice(0, 3),
      problem: spin.problem.slice(0, 3),
      implication: spin.implication.slice(0, 3),
      need_payoff: spin.need_payoff.slice(0, 3),
    };
  }, [pack]);

  const stageQuestions = useMemo(() => {
    if (stage === 'close') {
      return [{ id: 'close1', text: 'Navrhuju 20min demo. Jak se vám hodí příští týden — úterý nebo čtvrtek?' }];
    }
    const fromPack = runbook?.[stage]?.map((l) => ({ id: l.id, text: l.text })) || [];
    const fallback = (defaultRunbook[stage] || []).map((t, idx) => ({ id: `fb-${stage}-${idx}`, text: t }));
    const merged = [...fromPack, ...fallback].slice(0, 2);
    return merged.length ? merged : fallback;
  }, [runbook, stage]);

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  useEffect(() => {
    setActiveQuestionId(stageQuestions[0]?.id || null);
  }, [stageQuestions]);

  const activeQuestion = useMemo(() => {
    const q = stageQuestions.find((x) => x.id === activeQuestionId);
    return q?.text || stageQuestions[0]?.text || '';
  }, [stageQuestions, activeQuestionId]);

  const bumpStage = (next: Stage) => {
    const now = Date.now();
    const prevStage = stageRef.current;
    const started = stageStartAtRef.current;
    if (started) {
      stageTimersRef.current[prevStage] += Math.max(0, Math.floor((now - started) / 1000));
    }
    stageRef.current = next;
    stageStartAtRef.current = now;
    setStage(next);
  };

  const loadLastPack = async () => {
    if (!contactExternalId) return;
    const key = `${STORAGE_LAST_PACK_PREFIX}${contactExternalId}`;
    const packId = window.localStorage.getItem(key);
    if (!packId) {
      setPack(null);
      return;
    }
    try {
      const res = await echoApi.packs.get(packId);
      setPack(res as SalesPack);
    } catch {
      window.localStorage.removeItem(key);
      setPack(null);
    }
  };

  useEffect(() => {
    void loadLastPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactExternalId]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_MEET_LINK);
      if (stored) setMeetLink(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_MEET_LINK, meetLink);
    } catch {
      // ignore
    }
  }, [meetLink]);

  useEffect(() => {
    if (!meetActive) return;
    const timer = window.setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [meetActive]);

  const connect = useCallback(() => {
    setMeetError(null);
    setEvents([]);
    setLastCaptionAt(null);
    meetLastTsRef.current = null;

    if (!callId) {
      setMeetError('Vlož Meet link nebo kód (např. abc-defg-hij).');
      return;
    }
    setMeetActive(true);
    callStartedAtRef.current = Date.now();
    stageStartAtRef.current = Date.now();
    stageTimersRef.current = { situation: 0, problem: 0, implication: 0, need_payoff: 0, close: 0 };
    stageRef.current = stage;
    setMode('listening');
    setTranscriptOpen(false);
  }, [callId, stage]);

  const disconnect = useCallback(() => {
    setMeetActive(false);
    setMode('wrapup');
  }, []);

  useEffect(() => {
    if (!meetActive || !callId.trim() || !isSupabaseConfigured) return;
    let mounted = true;

    const fetchTranscript = async () => {
      const since = meetLastTsRef.current;
      const url = buildFunctionUrl(`meet/transcript/${callId.trim().toUpperCase()}${since ? `?since=${since}` : ''}`);
      if (!url) return;
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: publicAnonKey ? `Bearer ${publicAnonKey}` : '',
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: TranscriptEvent[] = data.events || [];
        if (!incoming.length || !mounted) return;

        const last = incoming[incoming.length - 1];
        meetLastTsRef.current = last.ts;
        setLastCaptionAt(Date.now());
        setEvents((prev) => {
          const next = [...prev];
          for (const evt of incoming) {
            const exists = next.some((p) => p.ts === evt.ts && p.text === evt.text);
            if (!exists) next.push(evt);
          }
          return next.slice(-200);
        });
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
  }, [meetActive, callId]);

  const refreshCoach = async () => {
    if (!transcriptWindow.length) return;
    setCoachBusy(true);
    setCoachError(null);
    try {
      const payload = {
        stage,
        transcriptWindow,
        recap: wrapNotes.trim().slice(0, 600),
        dealState: { lead: { name: activeContact?.name || null, company: activeContact?.company || null } },
        proofPack: proofPack || undefined,
        strict: true,
        stageTimers: stageTimersRef.current,
      };
      const res = await echoApi.ai.spinNext(payload);
      const out = res?.output || {};
      setSayNext(out.say_next || '');
      setWhy(out.why || '');
      setRisk(out.risk || '');
      setConfidence(typeof out.confidence === 'number' ? out.confidence : null);
      lastCoachAtRef.current = Date.now();
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : 'Coaching failed');
    } finally {
      setCoachBusy(false);
    }
  };

  useEffect(() => {
    if (!meetActive) return;
    const lastLine = events[events.length - 1]?.text || '';
    if (!lastLine.trim()) return;
    if (Date.now() - lastCoachAtRef.current < 9000) return;
    if (lastLine === lastCoachedLineRef.current) return;
    lastCoachedLineRef.current = lastLine;
    void refreshCoach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const onMarkObjection = async () => {
    const raw = (objectionDraft || '').toString().trim();
    if (!raw) return;
    setObjectionBusy(true);
    setObjectionError(null);
    try {
      const contactId = pack?.contact_id || contactExternalId;
      const res = await echoApi.whisper.objection({ contact_id: contactId, prospect_text: raw });
      setObjectionPack(res);
    } catch (e) {
      setObjectionError(e instanceof Error ? e.message : 'Objection failed');
    } finally {
      setObjectionBusy(false);
    }
  };

  const onLogCall = useCallback(async () => {
    if (!activeContact) {
      setWrapStatus('Vyber lead.');
      return;
    }
    if (!pipedriveConfigured) {
      setWrapStatus('Pipedrive není připojený.');
      return;
    }
    setWrapSaving(true);
    setWrapStatus(null);
    try {
      const res = await logCall({
        contactId: activeContact.id,
        contactName: activeContact.name,
        companyName: activeContact.company || undefined,
        disposition: wrapOutcome,
        notes: wrapNotes.trim(),
        duration: callSeconds,
      });
      setWrapNotes('');
      setMode('listening');
      setWrapStatus(res?.pipedrive?.synced ? 'Zapsáno do Pipedrive.' : 'Zapsáno (Pipedrive nesync).');
    } catch (e) {
      setWrapStatus(e instanceof Error ? e.message : 'Zápis selhal');
    } finally {
      setWrapSaving(false);
    }
  }, [activeContact, pipedriveConfigured, logCall, wrapOutcome, wrapNotes, callSeconds]);

  const statusPill = useMemo<StatusPill | null>(() => {
    if (mode === 'wrapup') return { text: 'Wrap-up', tone: 'warning' };
    if (!meetActive) return { text: 'Not connected', tone: 'subtle' };
    return { text: `${connectionStatus.text} · ${formatTimer(callSeconds)}`, tone: connectionStatus.tone };
  }, [mode, meetActive, connectionStatus, callSeconds]);

  useEffect(() => {
    chrome?.setStatus(statusPill);
  }, [chrome, statusPill]);

  const topbarAccessory = useMemo(() => {
    if (meetActive || mode === 'wrapup') return null;
    return (
      <div className="meet-accessory">
        <input
          value={meetLink}
          onChange={(e) => setMeetLink(e.target.value)}
          placeholder="Meet link / kód"
          style={{ width: 240 }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            connect();
          }}
        />
        <button className="btn ghost sm" onClick={() => setTranscriptOpen((v) => !v)} type="button" aria-label="Transcript (T)">
          T
        </button>
        <button className="btn primary sm" onClick={connect} disabled={!meetLink.trim()} type="button" data-testid="meet-connect">
          Connect
        </button>
      </div>
    );
  }, [meetActive, mode, meetLink, connect]);

  useEffect(() => {
    chrome?.setTopbarAccessory(topbarAccessory);
    return () => chrome?.setTopbarAccessory(null);
  }, [chrome, topbarAccessory]);

  const bottomBar = useMemo(() => {
    if (mode !== 'wrapup') return null;
    return (
      <div className="bottom-bar">
        <div className="wrapup-grid">
          <div className="wrapup-dispos">
            <div className="muted text-xs" style={{ marginBottom: 6 }}>
              Outcome (1..6)
            </div>
            <div className="quick-row" aria-label="Outcome">
              {OUTCOMES.map((o) => (
                <button
                  key={o.id}
                  className={`btn ghost sm ${wrapOutcome === o.id ? 'active' : ''}`}
                  onClick={() => setWrapOutcome(o.id)}
                  type="button"
                  title={`${o.hotkey} – ${o.label}`}
                >
                  {o.hotkey}. {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="muted text-xs" style={{ marginBottom: 6 }}>
              Notes
            </div>
            <input value={wrapNotes} onChange={(e) => setWrapNotes(e.target.value)} placeholder="Stručně…" />
            {wrapStatus ? <div className="status-line small">{wrapStatus}</div> : null}
          </div>
          <div className="wrapup-cta">
            <button className="btn primary" onClick={() => void onLogCall()} disabled={wrapSaving} type="button" data-testid="live-log">
              {wrapSaving ? 'Logging…' : 'Log'}
            </button>
            <span className={`pill ${pipedriveConfigured ? 'success' : 'warning'}`}>
              {pipedriveConfigured ? 'Pipedrive OK' : 'Pipedrive missing'}
            </span>
          </div>
        </div>
      </div>
    );
  }, [mode, wrapOutcome, wrapNotes, wrapStatus, wrapSaving, onLogCall, pipedriveConfigured]);

  useEffect(() => {
    chrome?.setBottomBar(bottomBar);
    return () => chrome?.setBottomBar(null);
  }, [chrome, bottomBar]);

  const hotkeys = useCallback<HotkeyHandler>(
    (e) => {
      if (chrome?.overlayOpen) return false;
      const key = (e.key || '').toLowerCase();
      if (key === 't') {
        setTranscriptOpen((v) => !v);
        return true;
      }
      if (key === 'o' && mode !== 'wrapup') {
        setMode((m) => (m === 'objection' ? 'listening' : 'objection'));
        return true;
      }
      if (mode === 'wrapup') {
        const found = OUTCOMES.find((x) => x.hotkey === e.key);
        if (found) {
          setWrapOutcome(found.id);
          return true;
        }
      }
      if (e.key === 'Enter') {
        if (mode === 'wrapup') {
          void onLogCall();
          return true;
        }
        if (meetActive) {
          disconnect();
          return true;
        }
        connect();
        return true;
      }
      return false;
    },
    [chrome?.overlayOpen, mode, meetActive, connect, disconnect, onLogCall],
  );

  useEffect(() => {
    chrome?.registerHotkeys(hotkeys);
  }, [chrome, hotkeys]);

  const objectionResponse = objectionPack?.whisper?.validate?.text || '';
  const objectionFollowUp = objectionPack?.whisper?.implication_question?.text || '';

  return (
    <div className="live-terminal" data-testid="demo-workspace">
      <div className="live-grid">
        <div className="panel focus compact say-card">
          <div className="panel-head tight">
            <div>
              <p className="eyebrow">Live Call</p>
              <h2>Řekni teď</h2>
              <div className="chip-row">
                <span className="pill subtle">Mode: {mode}</span>
                <span className="pill subtle">Stage: {stagePill}</span>
                <button className={`btn ghost sm ${mode === 'objection' ? 'active' : ''}`} onClick={() => setMode((m) => (m === 'objection' ? 'listening' : 'objection'))} type="button">
                  O Objection
                </button>
                <button className="btn ghost sm" onClick={() => setTranscriptOpen(true)} type="button">
                  T Transcript
                </button>
                {meetActive ? (
                  <button className="btn danger sm" onClick={disconnect} type="button" data-testid="meet-stop">
                    Stop
                  </button>
                ) : null}
              </div>
            </div>
            <div className="button-row">
              <button className="btn icon" onClick={() => void copyToClipboard(sayNext)} disabled={!sayNext} type="button" aria-label="Copy say next">
                <Copy size={16} />
              </button>
              <button className="btn icon" onClick={() => void refreshCoach()} disabled={coachBusy || !transcriptWindow.length} type="button" aria-label="Refresh coaching">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {meetError ? <div className="status-line">{meetError}</div> : null}
          {coachError ? <div className="status-line">{coachError}</div> : null}
          {wrapStatus && mode !== 'wrapup' ? <div className="status-line small">{wrapStatus}</div> : null}

          <div className="say-next-card">
            <div className="say-section">
              <div className="say-label">Řekni teď</div>
              <div className="say-big">{sayNext || (meetActive ? '—' : 'Připoj Meet (Connect) a zapni titulky.')}</div>
              {why ? (
                <div className="muted text-sm" style={{ marginTop: 10 }}>
                  Proč: {why}
                </div>
              ) : null}
              {confidence !== null && confidence < 0.55 && risk ? (
                <div className="pill warning" style={{ marginTop: 10 }}>
                  Risk: {risk}
                </div>
              ) : null}
            </div>

            <div className="say-section">
              <div className="say-label">Zeptej se</div>
              <div className="say-mid">{activeQuestion || '—'}</div>
              <div className="button-row" style={{ marginTop: 8 }}>
                <button className="btn ghost sm" onClick={() => void copyToClipboard(activeQuestion)} disabled={!activeQuestion} type="button">
                  <Copy size={14} /> Copy question
                </button>
              </div>
            </div>

            {mode === 'objection' ? (
              <div className="say-section">
                <div className="say-label">Pokud namítne</div>
                <div className="objection-inline">
                  <input value={objectionDraft} onChange={(e) => setObjectionDraft(e.target.value)} placeholder="Vlož námitku…" />
                  <button className="btn ghost sm" onClick={() => void onMarkObjection()} disabled={objectionBusy || !objectionDraft.trim()} type="button">
                    <Sparkles size={14} /> {objectionBusy ? '…' : 'Analyze'}
                  </button>
                  {objectionPack ? (
                    <button className="btn ghost sm" onClick={() => setObjectionPack(null)} type="button">
                      Clear
                    </button>
                  ) : null}
                </div>
                {objectionError ? <div className="status-line">{objectionError}</div> : null}

                <div className="objection-two">
                  <div className="objection-piece">
                    <div className="muted text-xs">Odpověď</div>
                    <div className="say-mid">{objectionResponse || '—'}</div>
                    <button className="btn icon" type="button" onClick={() => void copyToClipboard(objectionResponse)} disabled={!objectionResponse} aria-label="Copy objection response">
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="objection-piece">
                    <div className="muted text-xs">Follow-up otázka</div>
                    <div className="say-mid">{objectionFollowUp || '—'}</div>
                    <button className="btn icon" type="button" onClick={() => void copyToClipboard(objectionFollowUp)} disabled={!objectionFollowUp} aria-label="Copy follow-up">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel soft compact spin-panel">
          <div className="panel-head tight">
            <div>
              <p className="eyebrow">SPIN</p>
              <h2>{stage.toUpperCase()}</h2>
              <p className="muted text-sm">Max 2 otázky.</p>
            </div>
            <button className="btn ghost sm" onClick={() => void copyToClipboard(activeQuestion)} disabled={!activeQuestion} type="button">
              <Copy size={14} /> Copy current
            </button>
          </div>

          <div className="chip-row" style={{ marginBottom: 10 }}>
            {(
              [
                ['S', 'situation'],
                ['P', 'problem'],
                ['I', 'implication'],
                ['N', 'need_payoff'],
                ['C', 'close'],
              ] as Array<[string, Stage]>
            ).map(([k, s]) => (
              <button key={s} className={`btn ghost sm ${stage === s ? 'active' : ''}`} onClick={() => bumpStage(s)} type="button">
                {k}
              </button>
            ))}
          </div>

          <div className="list paged" style={{ gap: 8 }}>
            {stageQuestions.map((q) => (
              <button
                key={q.id}
                className={`list-row ${q.id === activeQuestionId ? 'active' : ''}`}
                onClick={() => setActiveQuestionId(q.id)}
                type="button"
              >
                <div className="item-title">{q.text}</div>
                <span className="pill subtle">{q.id === activeQuestionId ? 'Now' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Drawer open={transcriptOpen} onOpenChange={setTranscriptOpen} side="bottom" title="Transcript (T)" data-testid="transcript-drawer">
        {meetActive && connectionStatus.tone !== 'success' ? (
          <div className="banner warning" style={{ marginBottom: 12 }}>
            <div className="icon-title">
              <TriangleAlert size={16} /> <strong>Titulky se nečtou</strong>
            </div>
            <div className="muted text-sm" style={{ marginTop: 6 }}>
              Checklist: 1) Zapni CC v Google Meet. 2) V extension zapni <strong>Enabled</strong>. 3) Zkontroluj endpoint.
            </div>
            {functionsBase ? (
              <div className="muted text-xs" style={{ marginTop: 8 }}>
                Endpoint: {functionsBase}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="chip-row" style={{ marginBottom: 10 }}>
          <span className="pill subtle">{callId || '—'}</span>
          <span className={`pill ${connectionStatus.tone}`}>{connectionStatus.text}</span>
        </div>

        <div className="output-box" style={{ minHeight: 0, maxHeight: 260 }}>
          {!transcriptDrawerLines.length ? <div className="muted">Čekám na titulky…</div> : null}
          {transcriptDrawerLines.length ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{transcriptDrawerLines.join('\n')}</pre>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
