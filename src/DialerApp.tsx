import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSales } from './contexts/SalesContext';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { SettingsWorkspace } from './pages/SettingsWorkspace';
import { CallQualificationPanel } from './components/CallQualificationPanel';

// ============ TYPES ============
interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email?: string;
  title?: string;
  status: 'new' | 'contacted' | 'interested' | 'not-interested' | 'callback';
  priority: 'high' | 'medium' | 'low';
  industry?: string;
  website?: string;
  orgId?: number;
}

interface AIPrep {
  companyInsight: string;
  painPoints: string[];
  openingLine: string;
  qualifyingQuestions: string[];
  objectionHandlers: { objection: string; response: string }[];
  competitorMentions: string[];
  recentNews?: string;
  decisionMakerTips: string;
  bookingScript: string;
  challengerInsight?: string;
  certaintyBuilders?: { product: string; you: string; company: string };
  callTimeline?: { stage: string; time: string; goal: string; say: string; tonality: string }[];
  loopingScripts?: { trigger: string; loop: string }[];
  isFromApi: boolean;
}

interface DailyStats {
  calls: number;
  connected: number;
  meetings: number;
  talkTime: number;
  goal: number;
}

// ============ AI PREP - Real API (all fields) ============
const aiPrepCache = new Map<string, AIPrep>();

const generateAIPrep = async (contact: Contact, skipCache = false): Promise<AIPrep> => {
  if (!isSupabaseConfigured) {
    throw new Error('AI is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const cacheKey = `${contact.id}_${contact.name}`;
  if (!skipCache && aiPrepCache.has(cacheKey)) return aiPrepCache.get(cacheKey)!;

  const result = await echoApi.ai.generate({
    type: 'call-intelligence',
    contactName: contact.name,
    company: contact.company,
    contextData: {
      title: contact.title,
      industry: contact.industry,
      email: contact.email,
      website: contact.website,
    },
  });

  if (!result || result.error) {
    throw new Error(result?.error || 'AI response was empty.');
  }

  const prep: AIPrep = {
    companyInsight: result.companyInsight || `${contact.company}`,
    painPoints: Array.isArray(result.painPoints) ? result.painPoints : [],
    openingLine: result.openingLine || '',
    qualifyingQuestions: Array.isArray(result.qualifyingQuestions) ? result.qualifyingQuestions : [],
    objectionHandlers: Array.isArray(result.objectionHandlers)
      ? result.objectionHandlers.map((o: any) => ({ objection: o.objection || o.trigger || '', response: o.response || o.rebuttal || '' }))
      : [],
    competitorMentions: Array.isArray(result.competitorMentions) ? result.competitorMentions : [],
    recentNews: result.recentNews || undefined,
    decisionMakerTips: result.decisionMakerTips || '',
    bookingScript: result.bookingScript || '',
    challengerInsight: result.challengerInsight || undefined,
    certaintyBuilders: result.certaintyBuilders && typeof result.certaintyBuilders === 'object'
      ? result.certaintyBuilders : undefined,
    callTimeline: Array.isArray(result.callTimeline) ? result.callTimeline : undefined,
    loopingScripts: Array.isArray(result.loopingScripts) ? result.loopingScripts : undefined,
    isFromApi: true,
  };
  aiPrepCache.set(cacheKey, prep);
  return prep;
};

// ============ LIVE WHISPER — instant objection help ============
const getObjectionWhisper = async (objectionText: string): Promise<{ validate: string; reframe: string; question: string; next: string } | null> => {
  if (!isSupabaseConfigured || !objectionText.trim()) return null;
  try {
    const result = await echoApi.ai.generate({
      type: 'battle_card',
      contactName: '',
      company: '',
      contextData: { objection: objectionText },
    });
    return {
      validate: result?.validate || result?.empathize || '',
      reframe: result?.reframe || result?.response || '',
      question: result?.implication_question || result?.follow_up || '',
      next: result?.next_step || result?.close || '',
    };
  } catch { return null; }
};

// ============ AI NOTE SUMMARY ============
const summarizeNotes = async (notes: string, contactName: string, outcome: string): Promise<string | null> => {
  if (!isSupabaseConfigured || !notes.trim() || notes.trim().length < 15) return null;
  try {
    const result = await echoApi.ai.generate({
      type: 'analysis',
      contactName,
      company: '',
      contextData: { notes, outcome, instruction: 'Shrň poznámky z hovoru do 2-3 bodů česky. Formát: • bod. Na konci navrhni next step.' },
    });
    return typeof result === 'string' ? result : result?.summary || result?.analysis || JSON.stringify(result);
  } catch { return null; }
};

// ============ UTILITIES ============
const formatTime = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return Boolean((el as any).isContentEditable);
};

// ============ STORAGE ============
const STORAGE_KEY = 'dial1.session.v3';

interface StoredSession {
  stats: DailyStats;
  completedIds: string[];
  notesByContact: Record<string, string>;
  currentIndex: number;
}

const loadSession = (): StoredSession => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { stats: { calls: 0, connected: 0, meetings: 0, talkTime: 0, goal: 50 }, completedIds: [], notesByContact: {}, currentIndex: 0 };
};

const saveSession = (s: StoredSession) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };

// ============ COMPONENTS ============

function StatPill({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill-icon">{icon}</span>
      <span className="stat-pill-value">{value}</span>
      <span className="stat-pill-label">{label}</span>
    </div>
  );
}

function ContactRow({ contact, isActive, onClick }: { contact: Contact; isActive: boolean; onClick: () => void }) {
  return (
    <div className={`contact-row ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className={`contact-row-priority priority-${contact.priority}`} />
      <div className="contact-row-info">
        <span className="contact-row-name">{contact.name}</span>
        <span className="contact-row-company">{contact.company}</span>
      </div>
      <span className={`contact-row-status status-${contact.status}`}>{contact.status}</span>
    </div>
  );
}

function AIPrepPanel({ prep, isLoading, onRefresh, error }: { prep: AIPrep | null; isLoading: boolean; onRefresh: () => void; error?: string | null }) {
  const [tab, setTab] = useState<'prep' | 'objections' | 'qualify' | 'strategy'>('prep');
  const [copied, setCopied] = useState(false);
  const [copiedBooking, setCopiedBooking] = useState(false);

  const copyOpener = () => {
    if (prep?.openingLine) {
      navigator.clipboard.writeText(prep.openingLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const copyBooking = () => {
    if (prep?.bookingScript) {
      navigator.clipboard.writeText(prep.bookingScript);
      setCopiedBooking(true);
      setTimeout(() => setCopiedBooking(false), 1500);
    }
  };

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-badge">{prep?.isFromApi ? 'AI' : 'Smart'}</span>
          Call Intelligence
        </div>
        <button className="ai-refresh" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? '...' : '↻'}
        </button>
      </div>

      <div className="ai-tabs">
        {(['prep', 'objections', 'qualify', 'strategy'] as const).map(t => (
          <button key={t} className={`ai-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'prep' ? 'Brief' : t === 'objections' ? 'Objections' : t === 'qualify' ? 'Qualify' : 'Strategy'}
          </button>
        ))}
      </div>

      <div className="ai-content">
        {isLoading ? (
          <div className="ai-loading">
            <div className="ai-loading-bar" />
            <div className="ai-loading-bar short" />
            <div className="ai-loading-bar" />
          </div>
        ) : prep ? (
          <>
            {tab === 'prep' && (
              <>
                <div className="ai-card ai-card-opener">
                  <div className="ai-card-header">
                    <span className="ai-card-label">Opening Script</span>
                    <button className="ai-copy" onClick={copyOpener}>{copied ? '✓' : 'Copy'}</button>
                  </div>
                  <p className="ai-opener-text">{prep.openingLine}</p>
                </div>

                <div className="ai-card ai-card-dm">
                  <span className="ai-card-label">Decision Maker Intel</span>
                  <p>{prep.decisionMakerTips}</p>
                </div>

                <div className="ai-card">
                  <span className="ai-card-label">Company Context</span>
                  <p>{prep.companyInsight}</p>
                </div>

                <div className="ai-card">
                  <span className="ai-card-label">Likely Pain Points</span>
                  <ul className="ai-list">
                    {prep.painPoints.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>

                {prep.recentNews && (
                  <div className="ai-card ai-card-news">
                    <span className="ai-card-label">Recent Context</span>
                    <p>{prep.recentNews}</p>
                  </div>
                )}
              </>
            )}

            {tab === 'objections' && (
              <>
                <div className="ai-objection-list">
                  {prep.objectionHandlers.map((o, i) => (
                    <div key={i} className="ai-objection">
                      <div className="ai-objection-trigger">{o.objection}</div>
                      <div className="ai-objection-response">{o.response}</div>
                    </div>
                  ))}
                </div>

                <div className="ai-card">
                  <span className="ai-card-label">Competitor Watch</span>
                  <div className="ai-tags">
                    {prep.competitorMentions.map((c, i) => <span key={i} className="ai-tag">{c}</span>)}
                  </div>
                </div>
              </>
            )}

            {tab === 'qualify' && (
              <>
                <div className="ai-card">
                  <span className="ai-card-label">SPIN Discovery Questions</span>
                  <ol className="ai-questions">
                    {prep.qualifyingQuestions.map((q, i) => <li key={i}>{q}</li>)}
                  </ol>
                </div>

                <div className="ai-card ai-card-bant">
                  <span className="ai-card-label">BANT Qualification</span>
                  <div className="bant-grid">
                    {[
                      { key: 'B', label: 'Budget', q: 'Mají alokovaný rozpočet?' },
                      { key: 'A', label: 'Authority', q: 'Je decision maker?' },
                      { key: 'N', label: 'Need', q: 'Mají reálnou potřebu?' },
                      { key: 'T', label: 'Timing', q: 'Je to teď priorita?' },
                    ].map(b => (
                      <label key={b.key} className="bant-item">
                        <input type="checkbox" />
                        <div><strong>{b.key}</strong> {b.label}<span>{b.q}</span></div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="ai-card ai-card-next">
                  <div className="ai-card-header">
                    <span className="ai-card-label">Booking Script</span>
                    <button className="ai-copy" onClick={copyBooking}>{copiedBooking ? '✓' : 'Copy'}</button>
                  </div>
                  <p className="ai-script">{prep.bookingScript || '"Super, vidím že to dává smysl. Co takhle si dát 20 minut příští týden? Hodí se úterý nebo čtvrtek?"'}</p>
                </div>
              </>
            )}

            {tab === 'strategy' && (
              <>
                {prep.callTimeline && prep.callTimeline.length > 0 && (
                  <div className="ai-card ai-card-timeline">
                    <span className="ai-card-label">Call Flow</span>
                    <div className="timeline-steps">
                      {prep.callTimeline.map((step, i) => (
                        <div key={i} className={`timeline-step timeline-stage-${step.stage?.toLowerCase()}`}>
                          <div className="timeline-header">
                            <span className="timeline-badge">{step.stage}</span>
                            <span className="timeline-time">{step.time}</span>
                          </div>
                          <div className="timeline-goal">{step.goal}</div>
                          <div className="timeline-say">"{step.say}"</div>
                          <div className="timeline-tone">🎙 {step.tonality}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {prep.challengerInsight && (
                  <div className="ai-card ai-card-challenger">
                    <span className="ai-card-label">Challenger Insight</span>
                    <p className="ai-challenger-text">{prep.challengerInsight}</p>
                  </div>
                )}

                {prep.certaintyBuilders && (
                  <div className="ai-card ai-card-certainty">
                    <span className="ai-card-label">Three Tens — Jak budovat jistotu</span>
                    <div className="certainty-grid">
                      {[
                        { key: 'product' as const, icon: '📦', label: 'Product', sub: 'Věří, že to funguje?' },
                        { key: 'you' as const, icon: '🤝', label: 'You', sub: 'Věří mně jako expertovi?' },
                        { key: 'company' as const, icon: '🏢', label: 'Company', sub: 'Věří Behavery jako firmě?' },
                      ].map(t => (
                        <div key={t.key} className="certainty-item">
                          <div className="certainty-header">
                            <span className="certainty-icon">{t.icon}</span>
                            <div className="certainty-meta">
                              <strong>{t.label}</strong>
                              <span className="certainty-sub">{t.sub}</span>
                            </div>
                          </div>
                          <div className="certainty-tactic">{prep.certaintyBuilders?.[t.key] || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {prep.loopingScripts && prep.loopingScripts.length > 0 && (
                  <div className="ai-card ai-card-looping">
                    <span className="ai-card-label">Looping — Když odmítnou</span>
                    <div className="looping-list">
                      {prep.loopingScripts.map((ls, i) => (
                        <div key={i} className="looping-item">
                          <div className="looping-trigger">🔴 {ls.trigger}</div>
                          <div className="looping-response">↩ {ls.loop}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="ai-empty">
            {error ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Error</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{error}</div>
                <button className="ai-refresh" onClick={onRefresh} style={{ margin: '12px auto 0', width: 'auto', padding: '4px 12px', fontSize: 11 }}>Retry</button>
              </div>
            ) : 'Select a contact to load intelligence'}
          </div>
        )}
      </div>
    </aside>
  );
}

function SettingsOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <div
        className="panel modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        style={{ width: 'min(980px, 100%)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Configuration</h2>
            <p className="muted">Supabase + Pipedrive + OpenAI integrations.</p>
          </div>
          <button className="btn ghost sm" onClick={() => onOpenChange(false)} type="button">
            Esc
          </button>
        </div>
        <SettingsWorkspace />
      </div>
    </div>
  );
}

// ============ MAIN ============
export function DialerApp({ onSwitchMode, currentMode }: { onSwitchMode?: () => void; currentMode?: string }) {
  const { contacts: salesContacts, isLoading: contactsLoading, pipedriveConfigured, error: salesError, logCall, refresh } = useSales();
  const [importing, setImporting] = useState(false);

  const handleImportLeads = useCallback(async () => {
    setImporting(true);
    try {
      await refresh();
    } finally {
      setImporting(false);
    }
  }, [refresh]);
  const externalNavDisabled = import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true';
  const [showSettings, setShowSettings] = useState(false);
  
  // Map sales contacts (no demo fallbacks).
  const contacts: Contact[] = useMemo(() => {
    if (salesContacts && salesContacts.length > 0) {
      return salesContacts
        .map(c => ({
          id: c.id,
          name: c.name || 'Unknown',
          company: c.company || '',
          phone: c.phone || '',
          email: c.email || undefined,
          title: c.title || undefined,
          status: (c.status as Contact['status']) || 'new',
          priority: c.score && c.score > 70 ? 'high' : c.score && c.score > 40 ? 'medium' : 'low',
          industry: undefined,
          orgId: c.orgId || undefined,
        }));
    }
    return [];
  }, [salesContacts]);

  const [session, setSession] = useState<StoredSession>(loadSession);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInCall, setIsInCall] = useState(false);
  const [callStart, setCallStart] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [aiPrep, setAiPrep] = useState<AIPrep | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [whisperInput, setWhisperInput] = useState('');
  const [whisperResult, setWhisperResult] = useState<{ validate: string; reframe: string; question: string; next: string } | null>(null);
  const [whisperLoading, setWhisperLoading] = useState(false);
  const [noteSummary, setNoteSummary] = useState<string | null>(null);

  const notesRef = useRef<HTMLTextAreaElement>(null);
  const contact = contacts[activeIndex] || null;
  const activeContacts = useMemo(() => contacts.filter(c => !session.completedIds.includes(c.id)), [contacts, session.completedIds]);
  const hasContacts = contacts.length > 0;

  useEffect(() => {
    // Clamp / restore index when contacts change.
    if (!contacts.length) {
      setActiveIndex(0);
      return;
    }
    const next = Math.min(Math.max(0, session.currentIndex || 0), contacts.length - 1);
    setActiveIndex(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length]);

  // Load AI prep
  const loadAiPrep = useCallback(async () => {
    if (!contact) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const prep = await generateAIPrep(contact);
      setAiPrep(prep);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI unavailable';
      setAiPrep(null);
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }, [contact]);

  useEffect(() => { loadAiPrep(); }, [contact?.id]);
  useEffect(() => { saveSession({ ...session, currentIndex: activeIndex }); }, [session, activeIndex]);
  useEffect(() => {
    if (contact) {
      setNotes(session.notesByContact[contact.id] || '');
      setNoteSummary(null);
      setWhisperResult(null);
      setWhisperInput('');
    }
  }, [contact?.id]);
  
  useEffect(() => {
    if (!callStart) return;
    const t = setInterval(() => setCallDuration(Math.floor((Date.now() - callStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [callStart]);

  const openMeet = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (externalNavDisabled) return;
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
  }, [externalNavDisabled]);

  const endCall = useCallback((outcome: string) => {
    const dur = callStart ? Math.floor((Date.now() - callStart) / 1000) : 0;
    if (callStart) {
      setSession(s => ({
        ...s,
        stats: { ...s.stats, talkTime: s.stats.talkTime + dur, connected: outcome === 'connected' ? s.stats.connected + 1 : s.stats.connected },
      }));
    }
    // Auto-summarize notes after call
    if (contact && notes.trim().length >= 15) {
      summarizeNotes(notes, contact.name, outcome).then(summary => {
        if (summary) setNoteSummary(summary);
      });
    }
    // Persist to backend
    if (contact) {
      logCall({
        contactId: contact.id,
        contactName: contact.name,
        companyName: contact.company,
        disposition: outcome,
        duration: dur,
        notes: notes || undefined,
      }).catch(() => { /* best-effort */ });
    }
    setIsInCall(false);
    setCallStart(null);
    setCallDuration(0);
  }, [callStart, contact, notes, logCall]);

  const handleCall = useCallback(() => {
    if (!contact) return;
    if (!hasContacts) return;
    if (!isInCall) {
      setIsInCall(true);
      setCallStart(Date.now());
      setSession(s => ({ ...s, stats: { ...s.stats, calls: s.stats.calls + 1 } }));
      if (!externalNavDisabled && typeof window !== 'undefined') {
        const normalizedPhone = contact.phone.replace(/[^\d+]/g, '');
        window.location.href = `tel:${normalizedPhone}`;
      }
    } else {
      endCall('connected');
    }
  }, [contact, isInCall, externalNavDisabled, endCall]);

  const handleSkip = useCallback(() => {
    if (!hasContacts) return;
    if (isInCall) endCall('no-answer');
    setActiveIndex(i => Math.min(i + 1, contacts.length - 1));
  }, [isInCall, contacts.length, endCall]);

  const handleMeeting = useCallback(() => {
    if (!contact) return;
    if (!hasContacts) return;
    setSession(s => ({ ...s, stats: { ...s.stats, meetings: s.stats.meetings + 1 }, completedIds: [...s.completedIds, contact.id] }));
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
    if (isInCall) endCall('connected');
    setActiveIndex(i => Math.min(i + 1, contacts.length - 1));
  }, [contact, isInCall, contacts.length, endCall]);

  const handleNotInterested = useCallback(() => {
    if (!contact) return;
    if (!hasContacts) return;
    setSession(s => ({ ...s, completedIds: [...s.completedIds, contact.id] }));
    if (isInCall) endCall('connected');
    setActiveIndex(i => Math.min(i + 1, contacts.length - 1));
  }, [contact, isInCall, contacts.length, endCall]);

  const saveNotes = useCallback(() => {
    if (contact) setSession(s => ({ ...s, notesByContact: { ...s.notesByContact, [contact.id]: notes } }));
  }, [contact, notes]);

  const handleWhisper = useCallback(async () => {
    if (!whisperInput.trim() || whisperLoading) return;
    setWhisperLoading(true);
    setWhisperResult(null);
    try {
      const r = await getObjectionWhisper(whisperInput.trim());
      if (r) setWhisperResult(r);
    } finally {
      setWhisperLoading(false);
    }
  }, [whisperInput, whisperLoading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (!hasContacts) return;
      const k = e.key.toLowerCase();
      if (k === 'c') { e.preventDefault(); handleCall(); }
      if (k === 's') { e.preventDefault(); handleSkip(); }
      if (k === 'd') { e.preventDefault(); handleMeeting(); }
      if (k === 'n') { e.preventDefault(); notesRef.current?.focus(); }
      if (k === 'm') { e.preventDefault(); openMeet(); }
      if (k === 'arrowdown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, contacts.length - 1)); }
      if (k === 'arrowup') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasContacts, contacts.length, handleCall, handleSkip, handleMeeting, openMeet]);

  const connectRate = session.stats.calls > 0 ? Math.round((session.stats.connected / session.stats.calls) * 100) : 0;
  const goalProgress = Math.min(100, Math.round((session.stats.calls / session.stats.goal) * 100));

  return (
    <div className="app" data-testid="dialer-app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">D1</span>
            <div className="logo-text">
              <span className="logo-name">Dial1</span>
              <span className="logo-tag">Sales Intelligence</span>
            </div>
          </div>
          {onSwitchMode && (
            <button 
              onClick={onSwitchMode} 
              className="mode-switch-btn"
              title="Switch to Meet Coach"
            >
              <span>→ Meet Coach</span>
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="mode-switch-btn"
            title="Settings"
            type="button"
          >
            <span>⚙ Settings</span>
          </button>
        </div>
        
        <div className="header-center">
          <StatPill icon="•" value={session.stats.calls} label="calls" />
          <StatPill icon="✓" value={`${connectRate}%`} label="connect" />
          <StatPill icon="+" value={session.stats.meetings} label="meetings" />
          <StatPill icon="◐" value={formatTime(session.stats.talkTime)} label="talk" />
        </div>

        <div className="header-right">
          <div className="goal-ring" style={{ '--progress': goalProgress } as React.CSSProperties}>
            <svg viewBox="0 0 36 36"><circle className="goal-bg" cx="18" cy="18" r="15.9" /><circle className="goal-fill" cx="18" cy="18" r="15.9" /></svg>
            <span className="goal-value">{goalProgress}%</span>
          </div>
          <span className="goal-label">Daily Goal</span>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        {/* Queue */}
        <aside className="queue">
          <div className="queue-header">
            <span className="queue-title">Queue</span>
            <div className="queue-header-right">
              <button
                className="queue-import-btn"
                onClick={handleImportLeads}
                disabled={importing || !pipedriveConfigured}
                title={pipedriveConfigured ? 'Import 30 leads from Pipedrive Leads Inbox' : 'Configure Pipedrive in Settings first'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {importing ? 'Importing…' : 'Import 30'}
              </button>
              <span className="queue-count">{activeContacts.length}</span>
            </div>
          </div>
          <div className="queue-list">
            {contactsLoading ? (
              <div className="queue-loading">Loading contacts...</div>
            ) : contacts.length ? (
              contacts.map((c, i) => (
                <ContactRow key={c.id} contact={c} isActive={i === activeIndex} onClick={() => setActiveIndex(i)} />
              ))
            ) : (
              <div className="queue-loading" style={{ lineHeight: 1.4 }}>
                {pipedriveConfigured
                  ? 'Hit "Import 30" to load leads from your Pipedrive Leads Inbox.'
                  : 'Pipedrive is not configured. Open Settings and paste your API key.'}
                {salesError ? <div style={{ marginTop: 8, opacity: 0.7 }}>{salesError}</div> : null}
              </div>
            )}
          </div>
          <div className="queue-footer">
            <span className="api-status">
              {pipedriveConfigured ? '● Pipedrive connected' : '○ Pipedrive not configured'}
            </span>
          </div>
        </aside>

        {/* Active Contact */}
        <section className="focus">
          {contact ? (
            <motion.div className="focus-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={contact.id}>
              <div className="focus-header">
                <div className="focus-avatar">{contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div className="focus-info">
                  <h2 className="focus-name">{contact.name}</h2>
                  <p className="focus-title">{contact.title} · {contact.company}</p>
                  <div className="focus-badges">
                    <span className={`badge priority-${contact.priority}`}>{contact.priority}</span>
                    <span className={`badge status-${contact.status}`}>{contact.status}</span>
                    {contact.industry && <span className="badge badge-muted">{contact.industry}</span>}
                  </div>
                </div>
              </div>

              <div className="focus-contact">
                {contact.phone
                  ? <a href={`tel:${contact.phone}`} className="phone">{contact.phone}</a>
                  : <span className="phone" style={{ opacity: 0.4 }}>No phone</span>
                }
                {contact.email && <>
                  <span className="focus-separator" />
                  <a href={`mailto:${contact.email}`} className="email">{contact.email}</a>
                </>}
              </div>

              {isInCall && (
                <motion.div className="call-timer" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                  <span className="timer-dot" />
                  <span className="timer-text">Active Call</span>
                  <span className="timer-value">{formatTime(callDuration)}</span>
                </motion.div>
              )}

              <div className="actions">
                <button className={`action-btn ${isInCall ? 'action-danger' : 'action-primary'}`} onClick={handleCall}>
                  <span className="action-icon">{isInCall ? '×' : '●'}</span>
                  <span className="action-label">{isInCall ? 'End' : 'Call'}</span>
                  <kbd>C</kbd>
                </button>
                <button className="action-btn action-secondary" onClick={handleSkip}>
                  <span className="action-icon">→</span>
                  <span className="action-label">Skip</span>
                  <kbd>S</kbd>
                </button>
                <button className="action-btn action-success" onClick={handleMeeting}>
                  <span className="action-icon">+</span>
                  <span className="action-label">Meeting</span>
                  <kbd>D</kbd>
                </button>
              </div>

              <div className="outcomes">
                <button onClick={() => { endCall('no-answer'); handleSkip(); }}>No Answer</button>
                <button onClick={() => { endCall('voicemail'); handleSkip(); }}>Voicemail</button>
                <button onClick={() => { endCall('busy'); handleSkip(); }}>Busy</button>
                <button onClick={handleNotInterested}>Not Interested</button>
              </div>

              {/* Call Qualification Panel */}
              <CallQualificationPanel
                contactName={contact.name}
                companyName={contact.company}
                contactId={contact.id}
                personId={undefined}
                orgId={contact.orgId}
                visible={true}
              />

              <div className="notes-box">
                <div className="notes-header">
                  <span>Notes</span>
                  <kbd>N</kbd>
                </div>
                <textarea
                  ref={notesRef}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Volné poznámky…"
                />
                {noteSummary && (
                  <div className="note-summary">
                    <div className="note-summary-header">
                      <span className="note-summary-badge">AI Summary</span>
                      <button className="note-summary-dismiss" onClick={() => setNoteSummary(null)}>×</button>
                    </div>
                    <div className="note-summary-text">{noteSummary}</div>
                  </div>
                )}
              </div>

              {/* Live Whisper — instant objection help during call */}
              {isInCall && (
                <div className="whisper-box">
                  <div className="whisper-header">
                    <span className="whisper-badge">⚡ Live Whisper</span>
                    <span className="whisper-hint">Type the objection you're hearing</span>
                  </div>
                  <div className="whisper-input-row">
                    <input
                      type="text"
                      className="whisper-input"
                      value={whisperInput}
                      onChange={e => setWhisperInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleWhisper(); }}
                      placeholder="e.g. nemáme rozpočet, nemám čas..."
                    />
                    <button className="whisper-btn" onClick={handleWhisper} disabled={whisperLoading || !whisperInput.trim()}>
                      {whisperLoading ? '...' : '→'}
                    </button>
                  </div>
                  {whisperResult && (
                    <motion.div className="whisper-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="whisper-step"><span className="whisper-label">✓ Validuj</span><span>{whisperResult.validate}</span></div>
                      <div className="whisper-step"><span className="whisper-label">↻ Reframe</span><span>{whisperResult.reframe}</span></div>
                      <div className="whisper-step"><span className="whisper-label">? Otázka</span><span>{whisperResult.question}</span></div>
                      <div className="whisper-step"><span className="whisper-label">→ Dál</span><span>{whisperResult.next}</span></div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="empty">
              <span>◎</span>
              <h3>Queue Complete</h3>
              <p>All contacts processed</p>
            </div>
          )}
        </section>

        {/* AI Panel */}
        <AIPrepPanel prep={aiPrep} isLoading={aiLoading} onRefresh={loadAiPrep} error={aiError} />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="shortcuts">
          <span><kbd>C</kbd> Call</span>
          <span><kbd>S</kbd> Skip</span>
          <span><kbd>D</kbd> Meeting</span>
          <span><kbd>N</kbd> Notes</span>
          <span><kbd>M</kbd> Meet</span>
          <span><kbd>↑↓</kbd> Navigate</span>
        </div>
        <span className="footer-status">{activeContacts.length} remaining</span>
      </footer>

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div className="confetti" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="confetti-piece"
                initial={{ x: '50vw', y: '50vh', scale: 0 }}
                animate={{ x: `${Math.random() * 100}vw`, y: `${Math.random() * 100}vh`, scale: 1, rotate: Math.random() * 360 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ background: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][i % 4] }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsOverlay open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}

export default DialerApp;
