import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { echoApi, type WhisperObjectionResult } from '../utils/echoApi';
import { buildFunctionUrl, functionsBase, isSupabaseConfigured, publicAnonKey } from '../utils/supabase/info';
import { useSales } from '../contexts/SalesContext';

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

export function DemoWorkspace() {
  const { activeContact, pipedriveConfigured, logCall } = useSales();

  const [meetLink, setMeetLink] = useState('');
  const [meetActive, setMeetActive] = useState(false);
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
    const merged = [...fromPack, ...fallback].slice(0, 3);
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (el as any)?.isContentEditable) return;
      if (e.key === '1') bumpStage('situation');
      if (e.key === '2') bumpStage('problem');
      if (e.key === '3') bumpStage('implication');
      if (e.key === '4') bumpStage('need_payoff');
      if (e.key === '5') bumpStage('close');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = () => {
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
  };

  const disconnect = () => {
    setMeetActive(false);
  };

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

  const onLogCall = async () => {
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
      await logCall({
        contactId: activeContact.id,
        contactName: activeContact.name,
        companyName: activeContact.company || undefined,
        disposition: wrapOutcome,
        notes: wrapNotes.trim(),
        duration: callSeconds,
      });
      setWrapStatus('Zapsáno do Pipedrive.');
    } catch (e) {
      setWrapStatus(e instanceof Error ? e.message : 'Zápis selhal');
    } finally {
      setWrapSaving(false);
    }
  };

  return (
    <div className="call-layout" data-testid="demo-workspace">
      <div className="panel compact">
        <div className="panel-head tight">
          <div>
            <p className="eyebrow">Live Call Coach</p>
            <h2>{activeContact?.name || 'Vyber lead'}</h2>
            <div className="chip-row">
              <span className={`pill ${connectionStatus.tone}`}>{connectionStatus.text}</span>
              <span className="pill subtle">⏱ {formatTimer(callSeconds)}</span>
              <span className="pill subtle">Stage: {stagePill}</span>
            </div>
          </div>

          <div className="button-row wrap" style={{ justifyContent: 'flex-end' }}>
            <div className="button-row">
              {(
                [
                  ['1', 'situation'],
                  ['2', 'problem'],
                  ['3', 'implication'],
                  ['4', 'need_payoff'],
                  ['5', 'close'],
                ] as Array<[string, Stage]>
              ).map(([key, s]) => (
                <button
                  key={s}
                  className={`btn ghost sm ${stage === s ? 'active' : ''}`}
                  onClick={() => bumpStage(s)}
                  type="button"
                  title={`${key} – ${s}`}
                >
                  {key}
                </button>
              ))}
            </div>

            <input
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="Meet link / kód"
              style={{ width: 260 }}
            />
            {!meetActive ? (
              <button className="btn outline sm" onClick={connect} disabled={!meetLink.trim()} type="button">
                Connect
              </button>
            ) : (
              <button className="btn danger sm" onClick={disconnect} type="button">
                Stop
              </button>
            )}
          </div>
        </div>
        {meetError && <div className="status-line">{meetError}</div>}
      </div>

      <div className="call-main">
        <div className="panel soft compact" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Transcript</p>
              <h2>Posledních 14 řádků</h2>
              <p className="muted text-sm">Okno, ne nekonečný feed.</p>
            </div>
            <span className="pill subtle">{callId ? callId : '—'}</span>
          </div>

          {meetActive && connectionStatus.tone !== 'success' && (
            <div className="banner warning" style={{ marginBottom: 12 }}>
              <div className="icon-title">
                <TriangleAlert size={16} /> <strong>Titulky se nečtou</strong>
              </div>
              <div className="muted text-sm" style={{ marginTop: 6 }}>
                Checklist: 1) Zapni CC v Google Meet. 2) V extension zapni <strong>Enabled</strong>. 3) Zkontroluj endpoint.
              </div>
              {functionsBase && (
                <div className="muted text-xs" style={{ marginTop: 8 }}>
                  Endpoint (pro extension Advanced): {functionsBase}
                </div>
              )}
            </div>
          )}

          <div className="output-box" style={{ flex: 1, minHeight: 0 }}>
            {!transcriptWindow.length && <div className="muted">Čekám na titulky z Meet…</div>}
            {transcriptWindow.length > 0 && (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{transcriptWindow.join('\n')}</pre>
            )}
          </div>
        </div>

        <div className="panel focus compact" style={{ overflow: 'hidden' }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Next Best Move</p>
              <h2>Řekni další větu</h2>
              <p className="muted text-sm">Auto refresh max 1× / ~9 s.</p>
            </div>
            <div className="button-row">
              <button className="btn ghost sm" onClick={() => void copyToClipboard(sayNext)} disabled={!sayNext} type="button">
                <Copy size={14} /> Copy
              </button>
              <button className="btn ghost sm" onClick={() => void refreshCoach()} disabled={coachBusy || !transcriptWindow.length} type="button">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          <div style={{ overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="coach-box focus">
              <div className="item-title">Say next</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{sayNext || '—'}</div>
              {why && (
                <div className="muted text-sm" style={{ marginTop: 8 }}>
                  Why: {why}
                </div>
              )}
              {confidence !== null && confidence < 0.55 && risk && (
                <div className="pill warning" style={{ marginTop: 10 }}>
                  Risk: {risk}
                </div>
              )}
            </div>
            {coachError && <div className="status-line">{coachError}</div>}

            <div className="panel soft" style={{ marginTop: 0 }}>
              <div className="panel-head tight">
                <span className="eyebrow">Objection</span>
                <span className="pill subtle">{objectionPack ? objectionPack.category : '—'}</span>
              </div>
              <input
                value={objectionDraft}
                onChange={(e) => setObjectionDraft(e.target.value)}
                placeholder="Vlož námitku (nebo nech prázdné)"
              />
              <div className="button-row" style={{ marginTop: 10 }}>
                <button className="btn outline sm" onClick={() => void onMarkObjection()} disabled={objectionBusy || !objectionDraft.trim()} type="button">
                  <Sparkles size={14} /> {objectionBusy ? 'Analyzing…' : 'Mark objection'}
                </button>
                {objectionPack && (
                  <button className="btn ghost sm" onClick={() => setObjectionPack(null)} type="button">
                    Clear
                  </button>
                )}
              </div>
              {objectionError && <div className="status-line">{objectionError}</div>}

              {objectionPack && (
                <div className="list paged" style={{ marginTop: 10 }}>
                  {[
                    objectionPack.whisper.validate,
                    objectionPack.whisper.reframe,
                    objectionPack.whisper.implication_question,
                    objectionPack.whisper.next_step,
                  ].map((l) => (
                    <div key={l.id} className="list-row" style={{ cursor: 'default' }}>
                      <div className="item-title">{l.text}</div>
                      <button className="btn ghost sm" onClick={() => void copyToClipboard(l.text)} type="button">
                        <Copy size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel soft compact" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">SPIN runbook</p>
              <h2>{stage.toUpperCase()}</h2>
              <p className="muted text-sm">Klikni na otázku, pak Copy.</p>
            </div>
            <button className="btn outline sm" onClick={() => void copyToClipboard(activeQuestion)} disabled={!activeQuestion} type="button">
              <Copy size={14} /> Copy current
            </button>
          </div>

          <div className="list" style={{ flex: 1, minHeight: 0, maxHeight: 'none' }}>
            {stageQuestions.map((q) => (
              <div
                key={q.id}
                className={`list-item ${q.id === activeQuestionId ? 'active' : ''}`}
                onClick={() => setActiveQuestionId(q.id)}
                role="button"
                tabIndex={0}
              >
                <div className="item-title">{q.text}</div>
                <span className="pill subtle">{q.id === activeQuestionId ? 'Now' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel soft compact">
        <div className="call-wrap">
          <div>
            <label className="label">Outcome</label>
            <select value={wrapOutcome} onChange={(e) => setWrapOutcome(e.target.value)}>
              <option value="meeting">Meeting</option>
              <option value="callback">Callback</option>
              <option value="not-interested">Not interested</option>
              <option value="no-answer">No answer</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="mini-notes" value={wrapNotes} onChange={(e) => setWrapNotes(e.target.value)} placeholder="Stručné poznámky…" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'end' }}>
            <span className={`pill ${pipedriveConfigured ? 'success' : 'warning'}`}>{pipedriveConfigured ? 'Pipedrive OK' : 'Pipedrive missing'}</span>
            <button className="btn primary" onClick={() => void onLogCall()} disabled={wrapSaving} type="button">
              {wrapSaving ? 'Logging…' : 'Log'}
            </button>
          </div>
        </div>
        {wrapStatus && <div className="status-line small">{wrapStatus}</div>}
      </div>
    </div>
  );
}
