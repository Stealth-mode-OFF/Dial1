import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, PhoneCall, RefreshCw, TriangleAlert } from 'lucide-react';
import { Drawer } from '../components/terminal/Drawer';
import type { StatusPill } from '../components/terminal/TerminalShell';
import { useSales } from '../contexts/SalesContext';
import type { HotkeyHandler } from '../hooks/useHotkeys';
import { echoApi, type ApprovedFact } from '../utils/echoApi';
import { dialViaTelLink } from '../utils/extensionBridge';

type Hypothesis = {
  hypothesis_id: string;
  hypothesis: string;
  based_on_evidence_ids: string[];
  how_to_verify: string;
  priority: 'high' | 'medium' | 'low';
};

type PackLine = {
  id: string;
  text: string;
  evidence_ids: string[];
  hypothesis_ids: string[];
};

type PackObjection = {
  id: string;
  trigger: string;
  response: string;
  evidence_ids: string[];
  hypothesis_ids: string[];
};

type ColdCallCard = {
  opener_variants: PackLine[];
  discovery_questions: PackLine[];
  objections: PackObjection[];
  insufficient_evidence: boolean;
  insufficient_evidence_reasons?: string[];
};

type MeetingPack = {
  discovery_questions: PackLine[];
  meeting_asks: PackLine[];
  agenda: PackLine[];
  next_step_conditions: PackLine[];
  insufficient_evidence: boolean;
  insufficient_evidence_reasons?: string[];
};

type SpinPack = {
  spin: null | {
    situation: PackLine[];
    problem: PackLine[];
    implication: PackLine[];
    need_payoff: PackLine[];
  };
  insufficient_evidence: boolean;
  insufficient_evidence_reasons?: string[];
};

type SalesPack = {
  id: string;
  contact_id: string;
  approved_facts: ApprovedFact[];
  hypotheses: Hypothesis[];
  cold_call_prep_card: ColdCallCard | null;
  meeting_booking_pack: MeetingPack | null;
  spin_demo_pack: SpinPack | null;
  quality_report?: { passes: boolean; failed_checks: string[] };
  created_at: string;
};

type PreparedContact = {
  id: string;
  name: string;
  title?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  company_website?: string | null;
};

const STORAGE_LAST_PACK_PREFIX = 'echo.lastPackId.';

export type ScreenChrome = {
  overlayOpen: boolean;
  setStatus: (pill: StatusPill | null) => void;
  setTopbarAccessory: (node: React.ReactNode | null) => void;
  setBottomBar: (node: React.ReactNode | null) => void;
  registerHotkeys: (handler: HotkeyHandler) => void;
};

const safeHost = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

const safeOpen = (url: string) => {
  if (typeof window === 'undefined') return;
  if (import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true') return;
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // ignore
  }
};

const copyToClipboard = async (text: string) => {
  if (typeof window === 'undefined') return;
  const clean = (text || '').toString().trim();
  if (!clean) return;
  try {
    await navigator.clipboard.writeText(clean);
  } catch {
    // ignore
  }
};

type CallState = 'idle' | 'ready' | 'calling' | 'wrapup';
type PackLoadState = 'idle' | 'loading' | 'ready' | 'error';

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const DISPOSITIONS: Array<{ id: string; label: string; hotkey: string }> = [
  { id: 'no-answer', label: 'No answer', hotkey: '1' },
  { id: 'gatekeeper', label: 'Gatekeeper', hotkey: '2' },
  { id: 'not-interested', label: 'Not interested', hotkey: '3' },
  { id: 'meeting', label: 'Meeting set', hotkey: '4' },
  { id: 'callback', label: 'Callback', hotkey: '5' },
  { id: 'wrong-person', label: 'Wrong person', hotkey: '6' },
];

export function BookDemoWorkspace({ chrome }: { chrome?: ScreenChrome }) {
  const {
    isConfigured,
    isLoading,
    error,
    contacts,
    visibleContacts,
    showCompletedLeads,
    activeContact,
    setActiveContactId,
    pipedriveConfigured,
    setPipedriveKey,
    logCall,
    refresh,
    completedLeadIds,
  } = useSales();

  const [detailsOpen, setDetailsOpen] = useState(false);

  const [callState, setCallState] = useState<CallState>('idle');
  const callStartedAtRef = useRef<number | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  const [wrapOutcome, setWrapOutcome] = useState(DISPOSITIONS[0].id);
  const [wrapNotes, setWrapNotes] = useState('');
  const [wrapNextStep, setWrapNextStep] = useState<'callback' | 'email' | 'skip'>('skip');
  const [wrapBusy, setWrapBusy] = useState(false);
  const [wrapStatus, setWrapStatus] = useState<string | null>(null);

  const [pack, setPack] = useState<SalesPack | null>(null);
  const [preparedContact, setPreparedContact] = useState<PreparedContact | null>(null);
  const [pipedriveKeyDraft, setPipedriveKeyDraft] = useState('');
  const [companyWebsiteDraft, setCompanyWebsiteDraft] = useState('');
  const [packState, setPackState] = useState<PackLoadState>('idle');
  const [packError, setPackError] = useState<string | null>(null);

  const contactId = activeContact?.id || '';
  const queue = useMemo(() => (showCompletedLeads ? contacts : visibleContacts), [contacts, visibleContacts, showCompletedLeads]);
  const activeIndex = useMemo(() => queue.findIndex((c) => c.id === contactId), [queue, contactId]);

  useEffect(() => {
    setWrapStatus(null);
    setPackError(null);
    setDetailsOpen(false);
    setWrapNotes('');
    setWrapOutcome(DISPOSITIONS[0].id);
    setWrapNextStep('skip');
    setCallSeconds(0);
    callStartedAtRef.current = null;
    setCallState(activeContact ? 'ready' : 'idle');
  }, [contactId]);

  useEffect(() => {
    const next = (preparedContact?.company_website || '').toString().trim();
    setCompanyWebsiteDraft(next);
  }, [preparedContact?.company_website]);

  const loadLastPack = useCallback(async (): Promise<SalesPack | null> => {
    if (!contactId) return null;
    const key = `${STORAGE_LAST_PACK_PREFIX}${contactId}`;
    const packId = window.localStorage.getItem(key);
    if (!packId) return null;
    try {
      const res = await echoApi.packs.get(packId);
      return res as SalesPack;
    } catch {
      window.localStorage.removeItem(key);
      return null;
    }
  }, [contactId]);

  const prepare = useCallback(async () => {
    if (!contactId) return;
    if (!isConfigured) {
      setPackState('idle');
      setPackError('Supabase není nastavený.');
      return;
    }
    setPackState('loading');
    setPackError(null);
    try {
      const res = await echoApi.lead.prepare({
        contact_id: contactId,
        language: 'cs',
        include: ['cold_call_prep_card', 'meeting_booking_pack', 'spin_demo_pack'],
        base_url: companyWebsiteDraft.trim() ? companyWebsiteDraft.trim() : undefined,
      });
      window.localStorage.setItem(`${STORAGE_LAST_PACK_PREFIX}${contactId}`, res.pack_id);
      setPack(res.pack as SalesPack);
      if (res.contact) setPreparedContact(res.contact as PreparedContact);
      setPackState('ready');
    } catch (e) {
      setPackState('error');
      setPackError(e instanceof Error ? e.message : 'Prepare failed');
    }
  }, [contactId, companyWebsiteDraft]);

  const ensurePack = useCallback(async () => {
    if (!contactId) {
      setPack(null);
      setPreparedContact(null);
      setPackState('idle');
      setPackError(null);
      return;
    }

    if (!isConfigured) {
      setPack(null);
      setPackState('idle');
      setPackError(null);
      return;
    }

    setPackState('loading');
    setPackError(null);

    const last = await loadLastPack();
    if (last) {
      setPack(last);
      setPackState('ready');
      return;
    }

    if (!pipedriveConfigured) {
      setPack(null);
      setPackState('idle');
      return;
    }

    await prepare();
  }, [contactId, loadLastPack, pipedriveConfigured, prepare]);

  useEffect(() => {
    void ensurePack();
  }, [ensurePack]);

  useEffect(() => {
    if (callState !== 'calling') return;
    const t = window.setInterval(() => {
      const started = callStartedAtRef.current;
      if (!started) return;
      setCallSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }, 250);
    return () => window.clearInterval(t);
  }, [callState]);

  const onConnectPipedrive = useCallback(async () => {
    const key = pipedriveKeyDraft.trim();
    if (!key) return;
    setPackError(null);
    try {
      await setPipedriveKey(key);
      setPipedriveKeyDraft('');
      await refresh();
      await ensurePack();
    } catch (e) {
      setPackError(e instanceof Error ? e.message : 'Připojení selhalo');
    }
  }, [pipedriveKeyDraft, setPipedriveKey, refresh, ensurePack]);

  const leadTitle = preparedContact?.title || activeContact?.title || null;
  const leadCompany = preparedContact?.company || activeContact?.company || null;
  const leadPhone = preparedContact?.phone || activeContact?.phone || null;
  const leadEmail = preparedContact?.email || activeContact?.email || null;

  const facts = useMemo(() => (pack?.approved_facts || []).slice(0, 5), [pack]);
  const hypotheses = useMemo(() => (pack?.hypotheses || []).slice(0, 3), [pack]);
  const openers = useMemo(() => (pack?.cold_call_prep_card?.opener_variants || []).slice(0, 2), [pack]);
  const objections = useMemo(() => (pack?.cold_call_prep_card?.objections || []).slice(0, 3), [pack]);

  const questions = useMemo(() => {
    const a = (pack?.cold_call_prep_card?.discovery_questions || []).slice(0, 3);
    const b = (pack?.meeting_booking_pack?.discovery_questions || []).slice(0, 3);
    const merged = [...a, ...b].filter(Boolean);
    const uniq: PackLine[] = [];
    const seen = new Set<string>();
    for (const q of merged) {
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      uniq.push(q);
      if (uniq.length >= 3) break;
    }
    return uniq;
  }, [pack]);

  const openerText = useMemo(() => openers.map((l) => l.text).join('\n').trim(), [openers]);
  const whyNow = useMemo(() => facts[0]?.claim || '', [facts]);

  const spinMap = useMemo(() => {
    const spin = pack?.spin_demo_pack?.spin || null;
    if (!spin) return null;
    return {
      situation: spin.situation.slice(0, 2),
      problem: spin.problem.slice(0, 2),
      implication: spin.implication.slice(0, 2),
      need_payoff: spin.need_payoff.slice(0, 2),
    };
  }, [pack]);

  const setActiveByOffset = useCallback(
    (delta: number) => {
      if (!queue.length) return;
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const next = (idx + delta + queue.length) % queue.length;
      setActiveContactId(queue[next].id);
    },
    [queue, activeIndex, setActiveContactId],
  );

  const startCall = useCallback(() => {
    if (!activeContact) return;
    if (!leadPhone) return;
    setWrapStatus(null);
    dialViaTelLink(leadPhone);
    callStartedAtRef.current = Date.now();
    setCallSeconds(0);
    setCallState('calling');
  }, [activeContact, leadPhone]);

  const endCall = useCallback(() => {
    setWrapStatus(null);
    setCallState('wrapup');
  }, []);

  const saveAndNext = useCallback(async () => {
    if (!activeContact) {
      setWrapStatus('Vyber lead.');
      return;
    }
    if (!pipedriveConfigured) {
      setWrapStatus('Pipedrive není připojený.');
      return;
    }

    const nextId = (() => {
      if (!queue.length) return null;
      const idx = queue.findIndex((c) => c.id === activeContact.id);
      if (idx < 0) return queue[0]?.id || null;
      return queue[(idx + 1) % queue.length]?.id || null;
    })();

    const nextStepTag = wrapNextStep === 'skip' ? '' : ` [next:${wrapNextStep}]`;
    const notes = `${wrapNotes.trim()}${nextStepTag}`.trim();

    setWrapBusy(true);
    setWrapStatus(null);
    try {
      await logCall({
        contactId: activeContact.id,
        contactName: activeContact.name,
        companyName: activeContact.company || undefined,
        disposition: wrapOutcome,
        notes,
        duration: callSeconds,
      });
      setWrapNotes('');
      setWrapOutcome(DISPOSITIONS[0].id);
      setWrapNextStep('skip');
      setCallState(activeContact ? 'ready' : 'idle');
      callStartedAtRef.current = null;
      setCallSeconds(0);
      if (nextId) setActiveContactId(nextId);
    } catch (e) {
      setWrapStatus(e instanceof Error ? e.message : 'Zápis selhal');
    } finally {
      setWrapBusy(false);
    }
  }, [activeContact, pipedriveConfigured, logCall, wrapOutcome, wrapNotes, wrapNextStep, callSeconds, queue, setActiveContactId]);

  const hotkeys = useCallback<HotkeyHandler>(
    (e) => {
      if (chrome?.overlayOpen) return false;
      if (e.key === 'ArrowUp') {
        setActiveByOffset(-1);
        return true;
      }
      if (e.key === 'ArrowDown') {
        setActiveByOffset(1);
        return true;
      }
      if (e.key.toLowerCase() === 'd') {
        setDetailsOpen((v) => !v);
        return true;
      }
      if (callState === 'wrapup') {
        const d = DISPOSITIONS.find((x) => x.hotkey === e.key);
        if (d) {
          setWrapOutcome(d.id);
          return true;
        }
      }
      if (e.key === 'Enter') {
        if (callState === 'ready') {
          startCall();
          return true;
        }
        if (callState === 'calling') {
          endCall();
          return true;
        }
        if (callState === 'wrapup') {
          void saveAndNext();
          return true;
        }
      }
      return false;
    },
    [chrome?.overlayOpen, setActiveByOffset, callState, startCall, endCall, saveAndNext],
  );

  useEffect(() => {
    chrome?.registerHotkeys(hotkeys);
  }, [chrome, hotkeys]);

  const statusPill = useMemo<StatusPill | null>(() => {
    if (callState === 'idle') return { text: 'Vyber lead', tone: 'subtle' };
    if (callState === 'calling') return { text: `Calling · ${formatTimer(callSeconds)}`, tone: 'success' };
    if (callState === 'wrapup') return { text: 'Wrap-up', tone: 'warning' };
    if (packState === 'loading') return { text: 'Loading…', tone: 'subtle' };
    if (packState === 'error') return { text: 'Pack error', tone: 'warning' };
    return { text: 'Ready', tone: 'success' };
  }, [callState, callSeconds, packState]);

  useEffect(() => {
    chrome?.setStatus(statusPill);
  }, [chrome, statusPill]);

  const accessory = useMemo(() => {
    return (
      <div className="chip-row">
        <span className="pill subtle">↑↓ Queue</span>
        <span className="pill subtle">D Details</span>
        <span className="pill subtle">Enter</span>
      </div>
    );
  }, []);

  useEffect(() => {
    chrome?.setTopbarAccessory(accessory);
  }, [chrome, accessory]);

  const bottom = useMemo(() => {
    const disabledCall = !activeContact || !leadPhone;
    const primaryLabel = callState === 'ready' ? 'CALL' : callState === 'calling' ? 'END' : 'Save & Next';
    const primaryAction =
      callState === 'ready' ? startCall : callState === 'calling' ? endCall : () => void saveAndNext();
    const primaryClass = callState === 'calling' ? 'btn danger' : 'btn primary';

    return (
      <div className="bottom-bar">
        {callState !== 'wrapup' ? (
          <>
            <button
              className={`${primaryClass}`}
              onClick={primaryAction}
              disabled={disabledCall}
              type="button"
              data-testid="lead-primary-action"
            >
              <PhoneCall size={16} /> {primaryLabel}
            </button>
            <div className="bottom-meta">
              <div className="muted text-sm">
                {activeContact ? `${activeContact.name}${leadCompany ? ` · ${leadCompany}` : ''}` : '—'}
              </div>
              <div className="muted text-xs">
                {leadPhone || '—'} {leadEmail ? `· ${leadEmail}` : ''}
              </div>
            </div>
            <div className="bottom-right">
              <span className="pill subtle">⏱ {formatTimer(callSeconds)}</span>
              <span className={`pill ${pipedriveConfigured ? 'success' : 'warning'}`}>
                {pipedriveConfigured ? 'Pipedrive OK' : 'Pipedrive missing'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="wrapup-grid">
              <div className="wrapup-dispos">
                <div className="muted text-xs" style={{ marginBottom: 6 }}>
                  Outcome (1..6)
                </div>
                <div className="quick-row" aria-label="Outcome">
                  {DISPOSITIONS.map((d) => (
                    <button
                      key={d.id}
                      className={`btn ghost sm ${wrapOutcome === d.id ? 'active' : ''}`}
                      onClick={() => setWrapOutcome(d.id)}
                      type="button"
                      aria-label={d.label}
                      title={`${d.hotkey} – ${d.label}`}
                    >
                      {d.hotkey}. {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="muted text-xs" style={{ marginBottom: 6 }}>
                  Notes
                </div>
                <input value={wrapNotes} onChange={(e) => setWrapNotes(e.target.value)} placeholder="Stručně…" />
                <div className="quick-row" style={{ marginTop: 8 }}>
                  {(
                    [
                      ['skip', 'Skip'],
                      ['callback', 'Callback'],
                      ['email', 'Email'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      className={`btn ghost sm ${wrapNextStep === id ? 'active' : ''}`}
                      onClick={() => setWrapNextStep(id)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="wrapup-cta">
                <button className="btn primary" onClick={() => void saveAndNext()} disabled={wrapBusy} type="button" data-testid="lead-save-next">
                  {wrapBusy ? 'Saving…' : 'Save & Next'}
                </button>
                {wrapStatus ? <div className="status-line small">{wrapStatus}</div> : null}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }, [
    callState,
    activeContact,
    leadPhone,
    leadCompany,
    leadEmail,
    callSeconds,
    pipedriveConfigured,
    startCall,
    endCall,
    saveAndNext,
    wrapOutcome,
    wrapNotes,
    wrapNextStep,
    wrapBusy,
    wrapStatus,
  ]);

  useEffect(() => {
    chrome?.setBottomBar(bottom);
    return () => chrome?.setBottomBar(null);
  }, [chrome, bottom]);

  const showScriptHint = useMemo(() => {
    if (!activeContact) return 'Vyber lead v queue.';
    if (!pipedriveConfigured) return 'Připoj Pipedrive v Details (D), pak se skript připraví automaticky.';
    if (packState === 'loading') return 'Připravuju skript…';
    if (packState === 'error') return packError || 'Pack error.';
    if (!pack) return 'Klikni Refresh v Details.';
    return '';
  }, [activeContact, pipedriveConfigured, packState, pack, packError]);

  return (
    <div className="lead-terminal" data-testid="book-demo-workspace">
      <aside className="panel soft compact queue-panel">
        <div className="panel-head tight">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>{queue.length ? `${queue.length} leads` : '—'}</h2>
          </div>
          <span className="pill subtle">{completedLeadIds.length ? `${completedLeadIds.length} tried` : 'New'}</span>
        </div>

        <div className="queue-list">
          {!queue.length && <div className="muted">{isLoading ? 'Loading…' : 'Žádní leadi.'}</div>}
          {queue.slice(0, 60).map((c) => {
            const active = c.id === contactId;
            const completed = completedLeadIds.includes(c.id);
            return (
              <button
                key={c.id}
                className={`queue-item ${active ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveContactId(c.id)}
                title={`${c.name}${c.company ? ` · ${c.company}` : ''}`}
              >
                <span className={`dot ${completed ? 'dot-tried' : 'dot-new'}`} aria-hidden="true" />
                <div className="queue-text">
                  <div className="queue-company">{c.company || '—'}</div>
                  <div className="queue-meta">
                    {c.name}
                    {c.title ? ` · ${c.title}` : ''}
                  </div>
                  {active && whyNow ? <div className="queue-why">{whyNow}</div> : null}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="panel focus compact stack-panel">
        <div className="panel-head tight">
          <div>
            <p className="eyebrow">Call stack</p>
            <h2>{leadCompany || activeContact?.company || '—'}</h2>
            <div className="muted text-sm">
              {activeContact?.name || '—'}{leadTitle ? ` · ${leadTitle}` : ''}
            </div>
          </div>
          <div className="chip-row">
            {!isConfigured ? (
              <span className="pill warning">
                <TriangleAlert size={14} /> Supabase missing
              </span>
            ) : null}
            <button className="btn icon" type="button" onClick={() => void copyToClipboard(openerText)} disabled={!openerText} aria-label="Copy opener">
              <Copy size={16} />
            </button>
            <button className="btn icon" type="button" onClick={() => setDetailsOpen(true)} aria-label="Details (D)">
              D
            </button>
          </div>
        </div>

        <div className="stack-grid">
          <div className="stack-block opener-block">
            <div className="stack-label">Opener (2 věty)</div>
            <div className="opener-text">{openerText || '—'}</div>
            {!openerText && showScriptHint ? <div className="muted text-sm" style={{ marginTop: 8 }}>{showScriptHint}</div> : null}
          </div>

          <div className="stack-block">
            <div className="stack-label">3 otázky</div>
            <ol className="stack-list">
              {[0, 1, 2].map((idx) => (
                <li key={idx} className="stack-item">
                  <span className="muted text-xs">{idx + 1}.</span>
                  <span>{questions[idx]?.text || '—'}</span>
                  <button
                    className="btn icon"
                    type="button"
                    onClick={() => void copyToClipboard(questions[idx]?.text || '')}
                    disabled={!questions[idx]?.text}
                    aria-label="Copy question"
                  >
                    <Copy size={16} />
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="stack-block">
            <details className="details">
              <summary className="details-summary">Objections ({objections.length || 0})</summary>
              <div className="details-body">
                {!objections.length ? <div className="muted">—</div> : null}
                {objections.slice(0, 3).map((o) => (
                  <div key={o.id} className="objection-row">
                    <div>
                      <div className="item-title">{o.trigger || 'Námitka'}</div>
                      <div className="muted text-sm">{o.response}</div>
                    </div>
                    <button className="btn icon" onClick={() => void copyToClipboard(o.response)} type="button" aria-label="Copy objection response">
                      <Copy size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </section>

      <Drawer open={detailsOpen} onOpenChange={setDetailsOpen} side="right" title="Details (D)" data-testid="lead-details-drawer">
        {!isConfigured ? (
          <div className="banner warning" style={{ marginBottom: 12 }}>
            <div className="icon-title">
              <TriangleAlert size={16} /> <strong>Supabase není nastavený</strong>
            </div>
            <div className="muted text-sm">{error || 'Doplň VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY.'}</div>
          </div>
        ) : null}

        {!pipedriveConfigured ? (
          <div className="banner warning" style={{ marginBottom: 12 }}>
            <div className="icon-title">
              <TriangleAlert size={16} /> <strong>Pipedrive není připojený</strong>
            </div>
            <div className="muted text-sm" style={{ marginTop: 6 }}>
              Bez Pipedrive se skript nepřipraví automaticky.
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="full">
                <label className="label">Pipedrive API key</label>
                <input
                  value={pipedriveKeyDraft}
                  onChange={(e) => setPipedriveKeyDraft(e.target.value)}
                  placeholder="Vlož API key z Pipedrive"
                  type="password"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="button-row" style={{ marginTop: 10 }}>
              <button className="btn primary sm" onClick={() => void onConnectPipedrive()} disabled={!pipedriveKeyDraft.trim()} type="button">
                Připojit
              </button>
            </div>
          </div>
        ) : null}

        <div className="panel soft compact">
          <div className="panel-head tight">
            <span className="eyebrow">Pack</span>
            <span className="pill subtle">{packState}</span>
          </div>
          <div className="button-row">
            <button className="btn ghost sm" onClick={() => void ensurePack()} disabled={!contactId || packState === 'loading'} type="button">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {packError ? <div className="status-line">{packError}</div> : null}
          <div className="muted text-xs" style={{ marginTop: 10 }}>
            Company website (optional)
          </div>
          <input value={companyWebsiteDraft} onChange={(e) => setCompanyWebsiteDraft(e.target.value)} placeholder="https://firma.cz" autoComplete="off" />
        </div>

        <div className="panel soft compact" style={{ marginTop: 12 }}>
          <div className="panel-head tight">
            <span className="eyebrow">Intel</span>
            <span className={`pill ${facts.length ? 'success' : 'subtle'}`}>{facts.length ? `${facts.length} facts` : '0 facts'}</span>
          </div>
          <div className="list paged">
            {facts.length === 0 && <div className="muted">Zatím žádná schválená fakta.</div>}
            {facts.map((f) => (
              <div key={f.evidence_id} className="list-row" style={{ cursor: 'default' }}>
                <div>
                  <div className="item-title">{f.claim}</div>
                  <div className="muted text-xs">
                    {safeHost(f.source_url)} · {f.confidence}
                  </div>
                </div>
                <button className="btn icon" onClick={() => safeOpen(f.source_url)} type="button" title="Open source" aria-label="Open source">
                  <ExternalLink size={16} />
                </button>
              </div>
            ))}
          </div>

          {hypotheses.length ? (
            <div className="panel soft compact" style={{ marginTop: 12 }}>
              <div className="panel-head tight">
                <span className="eyebrow">Hypotheses</span>
                <span className="pill subtle">{hypotheses.length}</span>
              </div>
              <div className="list paged">
                {hypotheses.map((h) => (
                  <div key={h.hypothesis_id} className="list-row" style={{ cursor: 'default' }}>
                    <div>
                      <div className="item-title">{h.hypothesis}</div>
                      <div className="muted text-xs">Ověř: {h.how_to_verify}</div>
                    </div>
                    <span className="pill warning">HYP</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel soft compact" style={{ marginTop: 12 }}>
          <div className="panel-head tight">
            <span className="eyebrow">SPIN runbook</span>
            <span className="pill subtle">{spinMap ? 'Ready' : '—'}</span>
          </div>
          {!spinMap ? <div className="muted">—</div> : null}
          {spinMap ? (
            <div className="output-box" style={{ minHeight: 0, maxHeight: 260 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {[
                  'Situation',
                  ...spinMap.situation.map((l) => `- ${l.text}`),
                  '',
                  'Problem',
                  ...spinMap.problem.map((l) => `- ${l.text}`),
                  '',
                  'Implication',
                  ...spinMap.implication.map((l) => `- ${l.text}`),
                  '',
                  'Need-Payoff',
                  ...spinMap.need_payoff.map((l) => `- ${l.text}`),
                ]
                  .join('\n')
                  .trim()}
              </pre>
            </div>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
