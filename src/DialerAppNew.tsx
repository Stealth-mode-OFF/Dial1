import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSales } from './contexts/SalesContext';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { SettingsWorkspace } from './pages/SettingsWorkspace';
import { useBrief } from './hooks/useBrief';
import { TranscriptInput, AnalysisResult } from './components/TranscriptAnalyzer';
import type { TranscriptAnalysisResult } from './utils/echoApi';

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
  notes?: string;
}

type AppPhase = 'ready' | 'calling' | 'wrapup';

interface DailyStats {
  calls: number;
  connected: number;
  meetings: number;
  talkTime: number;
}

// ============ UTILITIES ============
const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

const getSalutation = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `pane ${parts.slice(1).join(' ')}` : name;
};

const outcomeLabel = (outcome: 'connected' | 'no-answer' | 'meeting' | null) => {
  if (outcome === 'meeting') return 'Demo domluveno';
  if (outcome === 'connected') return 'Spojeno';
  if (outcome === 'no-answer') return 'Nedovoláno';
  return '—';
};

const normalizeCompanyDomain = (value: string): string => {
  const raw = (value || '').toString().trim();
  if (!raw) return '';

  let v = raw;
  v = v.replace(/^https?:\/\//i, '');
  v = v.replace(/^www\./i, '');
  v = v.split('/')[0] || '';
  v = v.split('?')[0] || '';
  v = v.split('#')[0] || '';
  v = v.trim().toLowerCase();
  return v;
};

const inferDomainFromEmail = (email: string | undefined) => {
  const e = (email || '').toString().trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0) return '';
  const domain = e.slice(at + 1).trim();
  if (!domain) return '';
  const blocked = new Set([
    'gmail.com',
    'seznam.cz',
    'email.cz',
    'centrum.cz',
    'atlas.cz',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'yahoo.com',
  ]);
  if (blocked.has(domain)) return '';
  return normalizeCompanyDomain(domain);
};

// ============ STORAGE ============
const STORAGE_KEY = 'dial1.v4';

interface Session {
  stats: DailyStats;
  completedIds: string[];
  notesByContact: Record<string, string>;
  domainByContact: Record<string, string>;
  currentIndex: number;
}

const loadSession = (): Session => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        stats: parsed?.stats || { calls: 0, connected: 0, meetings: 0, talkTime: 0 },
        completedIds: Array.isArray(parsed?.completedIds) ? parsed.completedIds : [],
        notesByContact: parsed?.notesByContact && typeof parsed.notesByContact === 'object' ? parsed.notesByContact : {},
        domainByContact: parsed?.domainByContact && typeof parsed.domainByContact === 'object' ? parsed.domainByContact : {},
        currentIndex: Number.isFinite(parsed?.currentIndex) ? parsed.currentIndex : 0,
      };
    }
  } catch {}
  return {
    stats: { calls: 0, connected: 0, meetings: 0, talkTime: 0 },
    completedIds: [],
    notesByContact: {},
    domainByContact: {},
    currentIndex: 0,
  };
};

const saveSession = (s: Session) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};

// ============ WHISPER API ============
const getWhisper = async (objection: string): Promise<string | null> => {
  if (!isSupabaseConfigured || !objection.trim()) return null;
  try {
    const r = await echoApi.ai.generate({
      type: 'battle_card',
      contactName: '',
      company: '',
      contextData: { objection },
    });
    return r?.reframe || r?.response || null;
  } catch { return null; }
};

// ============ FLOATING WHISPER ============
function FloatingWhisper() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const r = await getWhisper(input.trim());
    setResponse(r);
    setLoading(false);
  };

  if (minimized) {
    return (
      <motion.button
        className="whisper-fab"
        onClick={() => setMinimized(false)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
      >
        ⚡
      </motion.button>
    );
  }

  return (
    <motion.div
      className="whisper-float"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="whisper-float-header">
        <span>⚡ Našeptávač</span>
        <button onClick={() => setMinimized(true)}>−</button>
      </div>
      <div className="whisper-float-body">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Co říká? (námitka)"
          autoFocus
        />
        <button onClick={handleSubmit} disabled={loading || !input.trim()}>
          {loading ? '...' : '→'}
        </button>
      </div>
      {response && (
        <motion.div
          className="whisper-float-response"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {response}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============ QUEUE DRAWER ============
function QueueDrawer({
  contacts,
  activeIndex,
  onSelect,
  onClose,
}: {
  contacts: Contact[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="drawer-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        className="drawer"
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        exit={{ x: -300 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="drawer-header">
          <span>Fronta ({contacts.length})</span>
          <button onClick={onClose}>×</button>
        </div>
        <div className="drawer-list">
          {contacts.map((c, i) => (
            <button
              key={c.id}
              className={`drawer-item ${i === activeIndex ? 'active' : ''}`}
              onClick={() => { onSelect(i); onClose(); }}
            >
              <span className="drawer-item-name">{c.name}</span>
              <span className="drawer-item-company">{c.company}</span>
            </button>
          ))}
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ============ SETTINGS OVERLAY ============
function SettingsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      className="overlay-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="overlay-panel"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="overlay-header">
          <h2>Nastavení</h2>
          <button onClick={onClose}>Esc</button>
        </div>
        <SettingsWorkspace />
      </motion.div>
    </motion.div>
  );
}

// ============ TRANSCRIPT WRAPUP SECTION (Dialer) ============
function DialerTranscriptSection({ contact, callDuration }: { contact: Contact; callDuration: number }) {
  const [expanded, setExpanded] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TranscriptAnalysisResult | null>(null);

  if (analysisResult) {
    return (
      <div className="ta-wrapup-inline" style={{ marginTop: '16px' }}>
        <AnalysisResult
          result={analysisResult}
          onBack={() => setAnalysisResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="ta-wrapup-inline" style={{ marginTop: '16px' }}>
      <button className="ta-wrapup-toggle" onClick={() => setExpanded(!expanded)}>
        <h3>📋 Analyzovat přepis hovoru</h3>
        <span className={expanded ? 'open' : ''}>▼</span>
      </button>
      {expanded && (
        <div className="ta-wrapup-body">
          <TranscriptInput
            contactName={contact.name}
            contactCompany={contact.company}
            durationSeconds={callDuration}
            onAnalyzed={setAnalysisResult}
            compact
          />
        </div>
      )}
    </div>
  );
}

// ============ MAIN APP ============
export function DialerApp({ onSwitchMode }: { onSwitchMode?: () => void }) {
  const { contacts: salesContacts, isLoading, pipedriveConfigured, refresh } = useSales();
  
  const contacts: Contact[] = useMemo(() => {
    if (!salesContacts?.length) return [];
    return salesContacts.map(c => ({
      id: c.id,
      name: c.name || 'Neznámý',
      company: c.company || '',
      phone: c.phone || '',
      email: c.email || undefined,
      title: c.title,
      status: (c.status as Contact['status']) || 'new',
      priority: c.score && c.score > 70 ? 'high' : c.score && c.score > 40 ? 'medium' : 'low',
      orgId: c.orgId ?? undefined,
      website: undefined,
    }));
  }, [salesContacts]);

  const [session, setSession] = useState<Session>(loadSession);
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<AppPhase>('ready');
  const [callStart, setCallStart] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [wrapupOutcome, setWrapupOutcome] = useState<'connected' | 'no-answer' | 'meeting' | null>(null);
  const [notes, setNotes] = useState('');
  const [showQueue, setShowQueue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [importing, setImporting] = useState(false);

  // Script fields
  const [companySize, setCompanySize] = useState('');
  const [engagement, setEngagement] = useState('');
  const [lateInfo, setLateInfo] = useState('');
  const [aiQualAnswers, setAiQualAnswers] = useState<string[]>(['', '', '']);
  const [callAnalysis, setCallAnalysis] = useState<any | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const analyzedKeyRef = useRef<string>('');

  const contact = contacts[activeIndex] || null;
  const externalNavDisabled = import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true';

  const { brief, script: aiScript, loading: briefLoading, error: briefError, generate: generateBrief, clear: clearBrief } = useBrief();
  const [companyDomain, setCompanyDomain] = useState('');
  const [domainSaved, setDomainSaved] = useState(false);

  // Timer
  useEffect(() => {
    if (!callStart) return;
    const t = setInterval(() => setCallDuration(Math.floor((Date.now() - callStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [callStart]);

  // Persist
  useEffect(() => { saveSession({ ...session, currentIndex: activeIndex }); }, [session, activeIndex]);

  // Reset on contact change
  useEffect(() => {
    if (contact) {
      setNotes(session.notesByContact[contact.id] || '');
      const fromSession = session.domainByContact?.[contact.id] || '';
      const inferred = inferDomainFromEmail(contact.email) || normalizeCompanyDomain(contact.website || '');
      const nextDomain = normalizeCompanyDomain(fromSession || inferred);
      setCompanyDomain(nextDomain);
      setDomainSaved(Boolean(fromSession));
      clearBrief();
      setCompanySize('');
      setEngagement('');
      setLateInfo('');
      setAiQualAnswers(['', '', '']);
      setCallAnalysis(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      setEmailDraft('');
      setEmailError(null);
      setEmailLoading(false);
      setEmailCopied(false);
      analyzedKeyRef.current = '';
      setWrapupOutcome(null);
      setPhase('ready');
      setCallDuration(0);
    }
  }, [contact?.id, session.domainByContact, session.notesByContact, clearBrief]);

  // Generate AI brief + script (PREP)
  useEffect(() => {
    if (!contact) return;
    const domain = normalizeCompanyDomain(companyDomain);
    if (!domain) return;
    if (!isSupabaseConfigured) return;
    generateBrief(
      {
        domain,
        personName: contact.name,
        role: contact.title || 'Neznámá role',
        notes: contact.notes || '',
      },
      false,
    );
  }, [contact?.id, companyDomain, generateBrief]);

  // Import
  const handleImport = useCallback(async () => {
    setImporting(true);
    await refresh();
    setImporting(false);
  }, [refresh]);

  // Call actions
  const startCall = useCallback(() => {
    if (!contact) return;
    setPhase('calling');
    setCallStart(Date.now());
    setSession(s => ({ ...s, stats: { ...s.stats, calls: s.stats.calls + 1 } }));
    if (!externalNavDisabled) {
      window.location.href = `tel:${contact.phone.replace(/[^\d+]/g, '')}`;
    }
  }, [contact, externalNavDisabled]);

  const endCall = useCallback((outcome: 'connected' | 'no-answer' | 'meeting') => {
    const dur = callStart ? Math.floor((Date.now() - callStart) / 1000) : 0;
    setWrapupOutcome(outcome);
    setSession(s => ({
      ...s,
      stats: {
        ...s.stats,
        talkTime: s.stats.talkTime + dur,
        connected: outcome === 'connected' || outcome === 'meeting' ? s.stats.connected + 1 : s.stats.connected,
        meetings: outcome === 'meeting' ? s.stats.meetings + 1 : s.stats.meetings,
      },
      notesByContact: { ...s.notesByContact, [contact!.id]: notes },
      completedIds: outcome === 'meeting' ? [...s.completedIds, contact!.id] : s.completedIds,
    }));
    setCallStart(null);
    setCallDuration(dur);
    setPhase('wrapup');
  }, [callStart, contact, notes]);

  // Post-call AI analysis (WRAPUP)
  useEffect(() => {
    if (!contact) return;
    if (phase !== 'wrapup') return;
    if (!isSupabaseConfigured) return;

    const questions = (aiScript?.qualification || []).slice(0, 3);
    const qaLines = questions.map((q, idx) => {
      const ans = (aiQualAnswers[idx] || '').trim();
      if (!ans) return null;
      return `Q: ${q.question}\nA: ${ans}`;
    }).filter(Boolean) as string[];

    const transcriptText = [
      qaLines.length ? `Kvalifikace:\n${qaLines.join('\n\n')}` : '',
      companySize ? `Velikost firmy: ${companySize}` : '',
      engagement ? `Engagement / zjišťování nálady: ${engagement}` : '',
      lateInfo ? `Pozdní informace: ${lateInfo}` : '',
      notes ? `Poznámky: ${notes}` : '',
    ].filter(Boolean).join('\n');

    const key = `${contact.id}::${transcriptText}`.slice(0, 800);
    if (analyzedKeyRef.current === key) return;
    analyzedKeyRef.current = key;

    const transcript = [
      { speaker: 'Obchodník', text: transcriptText || 'Bez poznámek.' },
      { speaker: 'Obchodník', text: `Délka hovoru: ${formatTime(callDuration)}. Výsledek: ${outcomeLabel(wrapupOutcome)}.` },
    ];

    setAnalysisLoading(true);
    setAnalysisError(null);
    echoApi.ai.analyzeCall({
      transcript,
      salesStyle: 'SPIN + Straight Line',
      contact: { name: contact.name, role: contact.title || '' },
    }).then((r) => {
      setCallAnalysis(r || null);
    }).catch((e) => {
      setAnalysisError(e instanceof Error ? e.message : 'Analýza selhala');
    }).finally(() => {
      setAnalysisLoading(false);
    });
  }, [aiQualAnswers, aiScript?.qualification, callDuration, companySize, contact, engagement, lateInfo, notes, phase, wrapupOutcome]);

  const nextContact = useCallback(() => {
    setActiveIndex(i => Math.min(i + 1, contacts.length - 1));
  }, [contacts.length]);

  const handleWrapupDone = useCallback((booked: boolean) => {
    if (booked && contact) {
      setSession(s => ({
        ...s,
        stats: { ...s.stats, meetings: s.stats.meetings + 1 },
        completedIds: [...s.completedIds, contact.id],
      }));
    }
    nextContact();
  }, [contact, nextContact]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'q') { e.preventDefault(); setShowQueue(true); }
      if (e.key === 'c' && phase === 'ready') { e.preventDefault(); startCall(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, contacts.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, startCall, contacts.length]);

  // ============ RENDER: READY PHASE ============
  const renderReady = () => (
    <div className="phase-ready">
      <div className="contact-hero">
        <div className="contact-avatar">{contact!.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
        <div className="contact-info">
          <h1>{contact!.name}</h1>
          <p>{contact!.title} · {contact!.company}</p>
          <a href={`tel:${contact!.phone}`} className="contact-phone">{contact!.phone}</a>
        </div>
      </div>

      <div className="prep-ai" aria-live="polite">
        <div className="prep-ai-header">
          <h3>AI brief</h3>
          <button
            className="prep-ai-btn"
            onClick={() => {
              if (!contact) return;
              const domain = normalizeCompanyDomain(companyDomain);
              if (!domain) return;
              generateBrief(
                { domain, personName: contact.name, role: contact.title || 'Neznámá role', notes: contact.notes || '' },
                true,
              );
            }}
            disabled={!isSupabaseConfigured || !normalizeCompanyDomain(companyDomain) || briefLoading}
            title="Vynutit nové vygenerování"
          >
            {briefLoading ? '…' : '↻'}
          </button>
        </div>

        <div className="prep-domain">
          <label htmlFor="company-domain">Web firmy (doména)</label>
          <div className="prep-domain-row">
            <input
              id="company-domain"
              value={companyDomain}
              onChange={(e) => setCompanyDomain(normalizeCompanyDomain(e.target.value))}
              placeholder="např. skoda-auto.cz"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              className="prep-domain-save"
              onClick={() => {
                if (!contact) return;
                const v = normalizeCompanyDomain(companyDomain);
                setSession((s) => ({ ...s, domainByContact: { ...(s.domainByContact || {}), [contact.id]: v } }));
                setDomainSaved(Boolean(v));
              }}
              disabled={!normalizeCompanyDomain(companyDomain)}
              title="Uložit doménu pro tento kontakt"
            >
              Uložit
            </button>
          </div>
          <div className="prep-domain-hint">
            {domainSaved ? 'Uloženo pro tento kontakt.' : 'Tip: když je e‑mail firemní, doména se doplní automaticky.'}
          </div>
        </div>

        {!isSupabaseConfigured ? (
          <div className="prep-ai-note">AI není nakonfigurovaná (Supabase). Otevři Nastavení a doplň klíče.</div>
        ) : briefError ? (
          <div className="prep-ai-error">
            <div className="prep-ai-error-title">Nepodařilo se vygenerovat brief</div>
            <div className="prep-ai-error-msg">{briefError}</div>
          </div>
        ) : briefLoading ? (
          <div className="prep-ai-skeleton">
            <div className="sk-line wide" />
            <div className="sk-line" />
            <div className="sk-line" />
            <div className="sk-line wide" />
            <div className="sk-line" />
          </div>
        ) : brief ? (
          <div className="prep-ai-content">
            <div className="prep-ai-row">
              <div className="prep-ai-card">
                <div className="prep-ai-card-title">Firma</div>
                <div className="prep-ai-text">
                  <div className="prep-ai-company">{brief.company?.name || contact!.company}</div>
                  <div className="prep-ai-muted">{brief.company?.industry || 'Obor neznámý'}</div>
                  <div className="prep-ai-sub">{brief.company?.summary || '—'}</div>
                </div>
              </div>
              <div className="prep-ai-card">
                <div className="prep-ai-card-title">Osoba</div>
                <div className="prep-ai-text">
                  <strong>{brief.person?.name || contact!.name}</strong>
                  <div className="prep-ai-muted">{brief.person?.role || contact!.title || '—'}</div>
                  {brief.person?.background ? <div className="prep-ai-sub">{brief.person.background}</div> : null}
                </div>
              </div>
            </div>

            <div className="prep-ai-row">
              <div className="prep-ai-card">
                <div className="prep-ai-card-title">Signály</div>
                <ul className="prep-ai-list">
                  {(brief.signals || []).slice(0, 5).map((s, idx) => (
                    <li key={`${s.type}-${idx}`}>{s.text}</li>
                  ))}
                  {(brief.signals || []).length === 0 ? <li>—</li> : null}
                </ul>
              </div>
              <div className="prep-ai-card">
                <div className="prep-ai-card-title">Landminy</div>
                <ul className="prep-ai-list">
                  {(brief.landmines || []).slice(0, 5).map((t, idx) => (
                    <li key={`${t}-${idx}`}>{t}</li>
                  ))}
                  {(brief.landmines || []).length === 0 ? <li>—</li> : null}
                </ul>
              </div>
            </div>

            {aiScript ? (
              <div className="prep-ai-card">
                <div className="prep-ai-card-title">Scénář (AI)</div>
                <div className="prep-ai-text">
                  <div className="prep-ai-subtitle">Otevírací věta</div>
                  <div className="prep-ai-quote">„{aiScript.openingVariants?.[0]?.text || '—'}“</div>
                  <div className="prep-ai-subtitle">Kvalifikace</div>
                  <ol className="prep-ai-ol">
                    {(aiScript.qualification || []).slice(0, 4).map((q, idx) => (
                      <li key={`${q.question}-${idx}`}>
                        <div className="prep-ai-q">{q.question}</div>
                        <div className="prep-ai-muted">{q.why}</div>
                      </li>
                    ))}
                    {(aiScript.qualification || []).length === 0 ? <li>—</li> : null}
                  </ol>
                  <details className="prep-ai-details">
                    <summary>Námitky a reakce</summary>
                    <ul className="prep-ai-list">
                      {(aiScript.objections || []).slice(0, 6).map((o, idx) => (
                        <li key={`${o.objection}-${idx}`}>
                          <div className="prep-ai-q"><strong>{o.objection}</strong></div>
                          <div className="prep-ai-sub">{o.response}</div>
                        </li>
                      ))}
                      {(aiScript.objections || []).length === 0 ? <li>—</li> : null}
                    </ul>
                  </details>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="prep-ai-note">Zadej doménu a AI vygeneruje brief + scénář (cache 30 minut).</div>
        )}
      </div>

      <button className="btn-call" onClick={startCall}>
        <span className="btn-call-icon">●</span>
        Zavolat
        <kbd>C</kbd>
      </button>

      <div className="ready-actions">
        <button onClick={nextContact}>Přeskočit →</button>
        <button onClick={() => setShowQueue(true)}>Fronta (Q)</button>
      </div>
    </div>
  );

  // ============ RENDER: CALLING PHASE (FULLSCREEN SCRIPT) ============
  const renderCalling = () => (
    <div className="phase-calling">
      {/* Timer bar */}
      <div className="call-bar">
        <div className="call-bar-left">
          <span className="call-dot" />
          <span>{contact!.name}</span>
        </div>
        <span className="call-timer">{formatTime(callDuration)}</span>
        <div className="call-bar-actions">
          <button className="btn-end btn-end-skip" onClick={() => endCall('no-answer')}>Nedovoláno</button>
          <button className="btn-end btn-end-done" onClick={() => endCall('connected')}>Spojeno</button>
          <button className="btn-end btn-end-meeting" onClick={() => endCall('meeting')}>📅 Demo</button>
        </div>
      </div>

      {/* Script */}
      <div className="script">
        {aiScript?.openingVariants?.[0]?.text ? (
          <div className="script-ai">
            <div className="script-ai-title">AI scénář</div>
            <div className="script-ai-block">
              <div className="script-ai-label">Otevírací věta</div>
              <p className="script-ai-quote">„{aiScript.openingVariants[0].text}“</p>
            </div>
            {(aiScript.objections || []).slice(0, 3).length ? (
              <details className="script-ai-details">
                <summary>Námitky (rychlý tahák)</summary>
                <ul className="script-ai-list">
                  {(aiScript.objections || []).slice(0, 3).map((o, idx) => (
                    <li key={`${o.objection}-${idx}`}>
                      <strong>{o.objection}</strong>
                      <div className="script-ai-muted">{o.response}</div>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        {aiScript?.qualification?.length ? (
          <>
            <p className="script-transition">Kvalifikační otázky</p>
            {aiScript.qualification.slice(0, 3).map((q, idx) => (
              <div key={`${q.question}-${idx}`} className="script-question">
                <span className="script-q-num">{idx + 1}</span>
                <div className="script-q-content">
                  <p>{q.question}</p>
                  <input
                    value={aiQualAnswers[idx] || ''}
                    onChange={(e) =>
                      setAiQualAnswers((prev) => {
                        const next = [...prev];
                        next[idx] = e.target.value;
                        return next;
                      })
                    }
                    placeholder="Odpověď…"
                  />
                </div>
              </div>
            ))}

            <details className="script-fallback">
              <summary>Původní otázky (volitelné)</summary>

              <p className="script-greeting">
                „Dobrý den, <strong>{getSalutation(contact!.name)}</strong>, tady Josef Hofman z <strong>Behavery</strong>."
              </p>
              <p className="script-pitch">
                Pomáháme CEO a vedoucím ve firmách podobného typu, aby <strong>včas viděli, kde se týmy začínají přetěžovat nebo ztrácet motivaci</strong>, aniž by museli dělat další HR procesy.
              </p>
              <p className="script-transition">Můžu se jen rychle zeptat…</p>

              <div className="script-question">
                <span className="script-q-num">A</span>
                <div className="script-q-content">
                  <p>Kolik je vás dnes přibližně ve firmě?</p>
                  <input value={companySize} onChange={e => setCompanySize(e.target.value)} placeholder="např. 120 lidí" />
                </div>
              </div>

              <div className="script-question">
                <span className="script-q-num">B</span>
                <div className="script-q-content">
                  <p>Zjišťujete nějak pravidelně náladu nebo spokojenost týmů?</p>
                  <input value={engagement} onChange={e => setEngagement(e.target.value)} placeholder="Ano / Ne / Jak?" />
                </div>
              </div>

              <div className="script-question">
                <span className="script-q-num">C</span>
                <div className="script-q-content">
                  <p>Jak často se k vám dostane informace o problému až pozdě?</p>
                  <input value={lateInfo} onChange={e => setLateInfo(e.target.value)} placeholder="Stává se / Občas / Ne" />
                </div>
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="script-greeting">
              „Dobrý den, <strong>{getSalutation(contact!.name)}</strong>, tady Josef Hofman z <strong>Behavery</strong>."
            </p>
            <p className="script-pitch">
              Pomáháme CEO a vedoucím ve firmách podobného typu, aby <strong>včas viděli, kde se týmy začínají přetěžovat nebo ztrácet motivaci</strong>, aniž by museli dělat další HR procesy.
            </p>
            <p className="script-transition">Můžu se jen rychle zeptat…</p>

            <div className="script-question">
              <span className="script-q-num">1</span>
              <div className="script-q-content">
                <p>Kolik je vás dnes přibližně ve firmě?</p>
                <input value={companySize} onChange={e => setCompanySize(e.target.value)} placeholder="např. 120 lidí" />
              </div>
            </div>

            <div className="script-question">
              <span className="script-q-num">2</span>
              <div className="script-q-content">
                <p>Zjišťujete nějak pravidelně náladu nebo spokojenost týmů?</p>
                <input value={engagement} onChange={e => setEngagement(e.target.value)} placeholder="Ano / Ne / Jak?" />
              </div>
            </div>

            <div className="script-question">
              <span className="script-q-num">3</span>
              <div className="script-q-content">
                <p>Jak často se k vám dostane informace o problému až pozdě?</p>
                <input value={lateInfo} onChange={e => setLateInfo(e.target.value)} placeholder="Stává se / Občas / Ne" />
              </div>
            </div>
          </>
        )}

        <div className="script-notes">
          <label>Poznámky</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Volné poznámky z hovoru…"
            rows={3}
          />
        </div>
      </div>

      {/* Floating whisper */}
      <FloatingWhisper />
    </div>
  );

  // Scheduler embed
  const [showScheduler, setShowScheduler] = useState(false);
  const SCHEDULER_URL = 'https://behavera.pipedrive.com/scheduler/GX27Q8iw/konzultace-jak-ziskat-jasna-data-o-svem-tymu-30-minutes';

  // ============ RENDER: WRAPUP PHASE ============
  const renderWrapup = () => (
    <div className="phase-wrapup">
      {showScheduler ? (
        <div className="scheduler-embed">
          <div className="scheduler-header">
            <h3>📅 Naplánuj demo</h3>
            <button className="scheduler-close" onClick={() => setShowScheduler(false)}>✕ Zavřít</button>
          </div>
          <iframe
            src={SCHEDULER_URL}
            className="scheduler-iframe"
            title="Pipedrive Scheduler"
            allow="payment"
          />
        </div>
      ) : (
        <div className="wrapup-card">
          <h2>Hovor ukončen</h2>
          <p className="wrapup-contact">{contact!.name} · {contact!.company}</p>
          <p className="wrapup-duration">{formatTime(callDuration)} min</p>

          <div className="wrapup-summary">
            {companySize && <div><strong>Velikost:</strong> {companySize}</div>}
            {engagement && <div><strong>Engagement:</strong> {engagement}</div>}
            {lateInfo && <div><strong>Pozdní info:</strong> {lateInfo}</div>}
            {aiQualAnswers.filter(Boolean).length ? (
              <div>
                <strong>AI kvalifikace:</strong>
                <ul className="wrapup-ai-answers">
                  {aiQualAnswers.filter(Boolean).slice(0, 3).map((a, idx) => (
                    <li key={`${a}-${idx}`}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {notes && <div><strong>Poznámky:</strong> {notes}</div>}
          </div>

          <div className="wrapup-ai">
            <div className="wrapup-ai-header">
              <h3>AI hodnocení</h3>
              <span className="wrapup-ai-pill">{wrapupOutcome ? outcomeLabel(wrapupOutcome) : '—'}</span>
            </div>

            {!isSupabaseConfigured ? (
              <div className="wrapup-ai-note">AI není nakonfigurovaná.</div>
            ) : analysisLoading ? (
              <div className="wrapup-ai-note">⏳ Analyzuji hovor…</div>
            ) : analysisError ? (
              <div className="wrapup-ai-error">Nepodařilo se analyzovat: {analysisError}</div>
            ) : callAnalysis ? (
              <div className="wrapup-ai-content">
                <div className="wrapup-ai-score">
                  <span className="wrapup-ai-score-num">{Number(callAnalysis.score ?? 0)}</span>
                  <span className="wrapup-ai-score-label">/ 100</span>
                </div>
                {callAnalysis.summary ? <div className="wrapup-ai-summary">{callAnalysis.summary}</div> : null}
                {Array.isArray(callAnalysis.strengths) && callAnalysis.strengths.length ? (
                  <div className="wrapup-ai-list">
                    <div className="wrapup-ai-list-title">Silné stránky</div>
                    <ul>{callAnalysis.strengths.slice(0, 4).map((s: string, i: number) => <li key={`${s}-${i}`}>{s}</li>)}</ul>
                  </div>
                ) : null}
                {Array.isArray(callAnalysis.weaknesses) && callAnalysis.weaknesses.length ? (
                  <div className="wrapup-ai-list">
                    <div className="wrapup-ai-list-title">Slabiny</div>
                    <ul>{callAnalysis.weaknesses.slice(0, 4).map((s: string, i: number) => <li key={`${s}-${i}`}>{s}</li>)}</ul>
                  </div>
                ) : null}
                {callAnalysis.coachingTip ? (
                  <div className="wrapup-ai-tip">
                    <strong>Tip:</strong> {callAnalysis.coachingTip}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="wrapup-ai-note">Doplň poznámky a AI zhodnotí hovor.</div>
            )}

            <div className="wrapup-email">
              <button
                className="wrapup-email-btn"
                disabled={!isSupabaseConfigured || emailLoading}
                onClick={async () => {
                  if (!contact) return;
                  setEmailLoading(true);
                  setEmailError(null);
                  setEmailCopied(false);
                  try {
                    const r = await echoApi.ai.generate({
                      type: 'email',
                      contactName: contact.name,
                      company: contact.company,
                      goal: 'Domluvit 20min demo',
                      contextData: {
                        outcome: outcomeLabel(wrapupOutcome),
                        duration_sec: callDuration,
                        notes,
                        aiAnalysis: callAnalysis || null,
                      },
                    });
                    const content = (r && typeof r === 'object' && 'content' in r) ? (r as any).content : r;
                    setEmailDraft(typeof content === 'string' ? content : JSON.stringify(content));
                  } catch (e) {
                    setEmailError(e instanceof Error ? e.message : 'E‑mail se nepodařilo vygenerovat');
                  } finally {
                    setEmailLoading(false);
                  }
                }}
              >
                {emailLoading ? '⏳ Generuji follow‑up e‑mail…' : '✉️ Vygenerovat follow‑up e‑mail'}
              </button>

              {emailError ? <div className="wrapup-ai-error">{emailError}</div> : null}

              {emailDraft ? (
                <div className="wrapup-email-editor">
                  <div className="wrapup-email-actions">
                    <button
                      className="wrapup-email-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(emailDraft);
                        setEmailCopied(true);
                        setTimeout(() => setEmailCopied(false), 1500);
                      }}
                    >
                      {emailCopied ? 'Zkopírováno' : 'Kopírovat'}
                    </button>
                  </div>
                  <textarea value={emailDraft} readOnly rows={6} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="wrapup-actions">
            <button className="btn-wrapup btn-wrapup-next" onClick={() => handleWrapupDone(false)}>
              Další kontakt →
            </button>
            <button className="btn-wrapup btn-wrapup-meeting" onClick={() => { setShowScheduler(true); handleWrapupDone(true); }}>
              📅 Naplánovat demo
            </button>
          </div>

          {/* Transcript Analysis Section */}
          <DialerTranscriptSection contact={contact!} callDuration={callDuration} />
        </div>
      )}
    </div>
  );

  // ============ RENDER: EMPTY STATE ============
  const renderEmpty = () => (
    <div className="phase-empty">
      <div className="empty-card">
        <span className="empty-icon">◎</span>
        <h2>Žádné kontakty</h2>
        <p>Importuj leady z Pipedrive nebo nastav připojení.</p>
        <div className="empty-actions">
          <button onClick={handleImport} disabled={importing || !pipedriveConfigured}>
            {importing ? 'Importuji…' : 'Importovat 30 leadů'}
          </button>
          <button onClick={() => setShowSettings(true)}>⚙ Nastavení</button>
        </div>
      </div>
    </div>
  );

  // ============ MAIN RENDER ============
  return (
    <div className="dialer-v2" data-testid="dialer-app">
      {/* Minimal header */}
      <header className="header-v2">
        <div className="header-v2-left">
          <span className="logo-v2">D1</span>
          {onSwitchMode && <button onClick={onSwitchMode} className="header-btn">→ MeetCoach</button>}
          <button onClick={() => setShowSettings(true)} className="header-btn">⚙</button>
        </div>

        <div className="header-v2-stats">
          <span>{session.stats.calls} hovory</span>
          <span>{session.stats.meetings} dema</span>
          <span>{formatTime(session.stats.talkTime)}</span>
        </div>

        <div className="header-v2-right">
          <button
            onClick={handleImport}
            disabled={importing || !pipedriveConfigured}
            className="header-btn header-btn-import"
          >
            {importing ? '...' : '↓ Import'}
          </button>
          <span className="header-queue-count">{contacts.length}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="main-v2">
        {isLoading ? (
          <div className="loading">Načítám…</div>
        ) : !contact ? (
          renderEmpty()
        ) : phase === 'ready' ? (
          renderReady()
        ) : phase === 'calling' ? (
          renderCalling()
        ) : (
          renderWrapup()
        )}
      </main>

      {/* Drawers & Overlays */}
      <AnimatePresence>
        {showQueue && (
          <QueueDrawer
            contacts={contacts}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            onClose={() => setShowQueue(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && <SettingsOverlay open={showSettings} onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default DialerApp;
