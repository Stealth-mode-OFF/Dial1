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
export function DialerApp() {
  const { contacts: salesContacts, isLoading, pipedriveConfigured, refresh, settings } = useSales();
  
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
  const [emailLogStatus, setEmailLogStatus] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);
  const [crmSaving, setCrmSaving] = useState(false);
  const [crmResult, setCrmResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sequenceEnabled, setSequenceEnabled] = useState(false);
  const [sequenceBusy, setSequenceBusy] = useState(false);
  const [sequenceMsg, setSequenceMsg] = useState<string | null>(null);
  const [sequenceSchedules, setSequenceSchedules] = useState<any[]>([]);
  const analyzedKeyRef = useRef<string>('');

  const contact = contacts[activeIndex] || null;
  const externalNavDisabled = import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true';
  const sequenceTime = (settings.sequenceSendTime || '09:00').toString().trim() || '09:00';
  const sequenceTimeZone = 'Europe/Prague';

  const computeZonedUtc = (y: number, m: number, d: number, hh: number, mm: number, timeZone: string) => {
    const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
    const asLocal = new Date(utcGuess.toLocaleString('en-US', { timeZone }));
    const offset = utcGuess.getTime() - asLocal.getTime();
    return new Date(utcGuess.getTime() + offset);
  };

  const computeSequenceIso = (delayDays: number) => {
    const [hhRaw, mmRaw] = sequenceTime.split(':');
    const hh = Math.max(0, Math.min(23, Number(hhRaw) || 9));
    const mm = Math.max(0, Math.min(59, Number(mmRaw) || 0));

    const now = new Date();
    const nowZoned = new Date(now.toLocaleString('en-US', { timeZone: sequenceTimeZone }));
    const targetZoned = new Date(nowZoned);
    targetZoned.setDate(targetZoned.getDate() + delayDays);
    const y = targetZoned.getFullYear();
    const m = targetZoned.getMonth() + 1;
    const d = targetZoned.getDate();
    return computeZonedUtc(y, m, d, hh, mm, sequenceTimeZone).toISOString();
  };

  const formatSequenceWhen = (iso: string) =>
    new Date(iso).toLocaleString('cs-CZ', { timeZone: sequenceTimeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

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
      setEmailLogStatus(null);
      setEmailHistory([]);
      setEmailHistoryLoading(false);
      setCrmSaving(false);
      setCrmResult(null);
      setSequenceEnabled(false);
      setSequenceBusy(false);
      setSequenceMsg(null);
      setSequenceSchedules([]);
      analyzedKeyRef.current = '';
      setWrapupOutcome(null);
      setPhase('ready');
      setCallDuration(0);
    }
  }, [contact?.id, session.domainByContact, session.notesByContact, clearBrief]);

  // Email history (last 3)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!contact?.id) return;
    if (phase !== 'wrapup') return;
    let cancelled = false;
    setEmailHistoryLoading(true);
    echoApi.email.history(contact.id)
      .then((res) => {
        if (cancelled) return;
        setEmailHistory(Array.isArray(res?.emails) ? res.emails : []);
      })
      .catch(() => {
        if (cancelled) return;
        setEmailHistory([]);
      })
      .finally(() => {
        if (cancelled) return;
        setEmailHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [contact?.id, isSupabaseConfigured, phase]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!contact?.id) return;
    if (phase !== 'wrapup') return;
    let cancelled = false;
    echoApi.emailSchedule.active({ contactId: contact.id })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.schedules) ? res.schedules : [];
        setSequenceSchedules(rows);
        const has = rows.some((r: any) => String(r?.email_type || '').startsWith('sequence-') && (r?.status === 'pending' || r?.status === 'draft-created'));
        setSequenceEnabled(has);
      })
      .catch(() => {
        if (cancelled) return;
        setSequenceSchedules([]);
        setSequenceEnabled(false);
      });
    return () => { cancelled = true; };
  }, [contact?.id, isSupabaseConfigured, phase]);

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
          <h3>AI příprava</h3>
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
          <div className="prep-ai-note">Nastav Supabase klíče v ⚙ Nastavení — AI příprava se pak spustí automaticky.</div>
        ) : briefError ? (
          <div className="prep-ai-error">
            <div className="prep-ai-error-title">Přípravu se nepodařilo načíst</div>
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
            {/* ── Kontext: firma + osoba ── */}
            <div className="prep-section">
              <div className="prep-ctx-row">
                <span className="prep-ctx-icon">🏢</span>
                <div className="prep-ctx-body">
                  <strong>{brief.company?.name || contact!.company}</strong>
                  {brief.company?.industry ? <span className="prep-ctx-dot"> · {brief.company.industry}</span> : null}
                  {brief.company?.size ? <span className="prep-ctx-dot"> · {brief.company.size}</span> : null}
                  {brief.company?.summary ? <p className="prep-ctx-summary">{brief.company.summary}</p> : null}
                  {brief.company?.recentNews ? <p className="prep-ctx-summary">📰 {brief.company.recentNews}</p> : null}
                </div>
              </div>
              <div className="prep-ctx-row">
                <span className="prep-ctx-icon">👤</span>
                <div className="prep-ctx-body">
                  <strong>{brief.person?.name || contact!.name}</strong>
                  <span className="prep-ctx-dot"> · {brief.person?.role || contact!.title || 'role neznámá'}</span>
                  {brief.person?.decisionPower && brief.person.decisionPower !== 'unknown' ? (
                    <span className="prep-ctx-dot"> · {brief.person.decisionPower === 'decision-maker' ? '🔑 Rozhodovatel' : brief.person.decisionPower === 'influencer' ? '💡 Influencer' : '🏅 Champion'}</span>
                  ) : null}
                  {brief.person?.background ? <p className="prep-ctx-summary">{brief.person.background}</p> : null}
                </div>
              </div>
              {/* Quick links */}
              <div className="prep-links-row">
                {brief.company?.website ? (
                  <a href={brief.company.website.startsWith('http') ? brief.company.website : `https://${brief.company.website}`} target="_blank" rel="noopener noreferrer" className="prep-link">🌐 Web</a>
                ) : companyDomain ? (
                  <a href={`https://${companyDomain}`} target="_blank" rel="noopener noreferrer" className="prep-link">🌐 Web</a>
                ) : null}
                {brief.person?.linkedin ? (
                  <a href={brief.person.linkedin} target="_blank" rel="noopener noreferrer" className="prep-link">💼 LinkedIn</a>
                ) : null}
                {contact!.email ? (
                  <a href={`mailto:${contact!.email}`} className="prep-link">✉️ {contact!.email}</a>
                ) : null}
              </div>
            </div>

            {/* ── Signály (jen pokud existují) ── */}
            {((brief.signals || []).length > 0 || (brief.landmines || []).length > 0) && (
              <div className="prep-chips-row">
                {(brief.signals || []).slice(0, 4).map((s, idx) => (
                  <span key={`sig-${idx}`} className={`prep-chip prep-chip--${s.type}`}>
                    {s.type === 'opportunity' ? '🟢' : s.type === 'risk' ? '🔴' : '⚪'} {s.text}
                  </span>
                ))}
                {(brief.landmines || []).slice(0, 3).map((t, idx) => (
                  <span key={`lm-${idx}`} className="prep-chip prep-chip--landmine">⚠️ {t}</span>
                ))}
              </div>
            )}

            {/* ── Jen otevírací věta (cold call = jednoduchý) ── */}
            {aiScript?.openingVariants?.[0]?.text ? (
              <div className="prep-script">
                <details className="prep-details" open>
                  <summary className="prep-details-sum">📞 Jak začít hovor</summary>
                  <div className="prep-details-body">
                    <div className="prep-ai-quote">„{aiScript.openingVariants[0].text}"</div>
                  </div>
                </details>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="prep-ai-note">Zadej doménu firmy — AI připraví scénář hovoru na míru.</div>
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
              {!emailDraft && (
                <button
                  className="wrapup-email-btn"
                  onClick={() => {
                    if (!contact) return;
                    const firstName = contact.name.split(' ')[0] || contact.name;
                    const template = `Předmět: ${contact.company} – krátký dotaz\n\nDobrý den${firstName ? ` ${firstName}` : ''},\n\nzkoušel/a jsem Vás zastihnout telefonicky – omlouvám se, že se to nepodařilo.\n\nŘeším jednu věc s firmami jako ${contact.company} – jak udržet klíčové lidi a mít přehled o tom, co se v týmu skutečně děje (ne jen to, co řeknou na poradě).\n\nPomáháme s tím přes krátké pulse-checky, které manažerům ukážou reálná data za 2 minuty.\n\nMělo by smysl se na to podívat? Stačí krátký 15min call.\n\nDěkuji a přeji hezký den,\n${settings.smartBccAddress ? '' : '[Vaše jméno]'}`;
                    setEmailDraft(template);
                  }}
                >
                  ✉️ Připravit follow‑up e‑mail
                </button>
              )}

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
                      {emailCopied ? 'Zkopírováno ✓' : '📋 Kopírovat'}
                    </button>
                    <button
                      className="wrapup-email-copy"
                      type="button"
                      onClick={async () => {
                        if (!contact) return;
                        setEmailLogStatus(null);
                        try {
                          const lines = emailDraft.split('\n');
                          const subjectLine = lines.find(l => l.startsWith('Předmět:'));
                          const subject = subjectLine ? subjectLine.replace('Předmět:', '').trim() : `${contact.company} – follow-up`;
                          const bodyLines = lines.filter(l => !l.startsWith('Předmět:'));
                          const body = bodyLines.join('\n').trim();

                          const res = await echoApi.email.log({
                            contactId: contact.id,
                            contactName: contact.name,
                            company: contact.company,
                            emailType: 'cold',
                            subject,
                            body,
                            recipientEmail: contact.email || undefined,
                            source: 'manual',
                          });
                          if (!res?.ok) throw new Error(res?.error || 'Log selhal');
                          setEmailLogStatus('Označeno jako odeslané ✓');
                          // Refresh history
                          try {
                            const h = await echoApi.email.history(contact.id);
                            setEmailHistory(Array.isArray(h?.emails) ? h.emails : []);
                          } catch {
                            // ignore
                          }
                        } catch {
                          setEmailLogStatus('Nepodařilo se zalogovat e‑mail');
                        }
                      }}
                    >
                      ✅ Označit jako odeslané
                    </button>
                    {contact?.email && (
                      <button
                        className="wrapup-email-mailto"
                        type="button"
                        onClick={async () => {
                          const lines = emailDraft.split('\n');
                          const subjectLine = lines.find(l => l.startsWith('Předmět:'));
                          const subject = subjectLine ? subjectLine.replace('Předmět:', '').trim() : `${contact.company} – follow-up`;
                          const bodyLines = lines.filter(l => !l.startsWith('Předmět:'));
                          const body = bodyLines.join('\n').trim();
                          const bcc = settings.smartBccAddress || '';
                          const mailtoUrl = `mailto:${encodeURIComponent(contact.email!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${bcc ? `&bcc=${encodeURIComponent(bcc)}` : ''}`;

                          if (isSupabaseConfigured) {
                            try {
                              const status = await echoApi.gmail.getStatus();
                              if (status?.configured) {
                                const res = await echoApi.gmail.createDraft({
                                  to: contact.email!,
                                  subject,
                                  body,
                                  bcc: bcc || undefined,
                                  log: {
                                    contactId: contact.id,
                                    contactName: contact.name,
                                    company: contact.company,
                                    emailType: 'cold',
                                  },
                                });
                                if (res?.ok && res.gmailUrl) {
                                  window.open(res.gmailUrl, '_blank', 'noopener,noreferrer');
                                  try {
                                    const h = await echoApi.email.history(contact.id);
                                    setEmailHistory(Array.isArray(h?.emails) ? h.emails : []);
                                  } catch {
                                    // ignore
                                  }
                                  return;
                                }
                              }
                            } catch {
                              // Silent fallback to mailto:
                            }
                          }

                          window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        📧 Otevřít v e‑mailu
                      </button>
                    )}
                  </div>
                  <textarea
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    rows={8}
                  />
                  {!contact?.email && (
                    <div className="wrapup-email-hint muted">Kontakt nemá e‑mail – zkopíruj text a pošli ručně.</div>
                  )}
                  {settings.smartBccAddress && (
                    <div className="wrapup-email-hint muted">SmartBCC: {settings.smartBccAddress}</div>
                  )}
                  {emailLogStatus && (
                    <div className="wrapup-email-hint muted">{emailLogStatus}</div>
                  )}
                  {isSupabaseConfigured && contact?.id ? (
                    emailHistoryLoading ? (
                      <div className="wrapup-email-hint muted">Poslední e‑maily: ⏳ Načítám…</div>
                    ) : emailHistory.length ? (
                      <div className="wrapup-email-hint muted">
                        <div>Poslední e‑maily:</div>
                        <ul className="wrapup-ai-answers">
                          {emailHistory.slice(0, 3).map((e: any) => {
                            const when = e?.sent_at ? new Date(String(e.sent_at)).toLocaleDateString('cs-CZ') : '—';
                            const type = String(e?.email_type || '');
                            const typeLabel =
                              type === 'cold' ? 'cold' :
                              type === 'demo-followup' ? 'po demo' :
                              type === 'sequence-d1' ? 'D+1' :
                              type === 'sequence-d3' ? 'D+3' : type;
                            const subj = e?.subject ? String(e.subject) : '—';
                            return <li key={String(e?.id || `${when}-${type}-${subj}`)}>{when} · {typeLabel} · {subj}</li>;
                          })}
                        </ul>
                      </div>
                    ) : (
                      <div className="wrapup-email-hint muted">Poslední e‑maily: —</div>
                    )
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="wrapup-crm">
              <button
                className="wrapup-crm-btn"
                disabled={!isSupabaseConfigured || crmSaving}
                onClick={async () => {
                  if (!contact) return;
                  setCrmSaving(true);
                  setCrmResult(null);
                  try {
                    let personId: number | undefined = undefined;
                    try {
                      const ctx = await echoApi.precall.context({
                        contact_id: contact.id,
                        include: [],
                        ttl_hours: 24,
                        timeline: { activities: 0, notes: 0, deals: 0 },
                      });
                      personId = ctx?.pipedrive?.person_id ?? undefined;
                    } catch {
                      personId = undefined;
                    }

                    if (!personId && !contact.orgId) {
                      throw new Error('Chybí vazba do Pipedrive (personId/orgId).');
                    }

                    const lines: string[] = [];
                    lines.push(`<b>📞 Hovor</b> – Echo Pulse`);
                    lines.push(`Klient: <b>${contact.name}</b> (${contact.title || '—'}) – <b>${contact.company}</b>`);
                    lines.push(`Výsledek: <b>${outcomeLabel(wrapupOutcome)}</b>`);
                    lines.push(`Délka: <b>${formatTime(callDuration)}</b>`);
                    if (callAnalysis?.score !== undefined) lines.push(`AI skóre: <b>${Number(callAnalysis.score)}</b>/100`);
                    if (callAnalysis?.summary) lines.push(`Shrnutí: ${String(callAnalysis.summary)}`);
                    if (Array.isArray(callAnalysis?.strengths) && callAnalysis.strengths.length) {
                      lines.push(`Silné stránky: ${callAnalysis.strengths.slice(0, 3).map((s: string) => `• ${s}`).join(' ')}`);
                    }
                    if (Array.isArray(callAnalysis?.weaknesses) && callAnalysis.weaknesses.length) {
                      lines.push(`Slabiny: ${callAnalysis.weaknesses.slice(0, 3).map((s: string) => `• ${s}`).join(' ')}`);
                    }
                    if (callAnalysis?.coachingTip) lines.push(`Tip kouče: ${String(callAnalysis.coachingTip)}`);
                    const qa = aiQualAnswers.filter(Boolean).slice(0, 3).map((a) => `• ${a}`).join(' ');
                    if (qa) lines.push(`Kvalifikace: ${qa}`);
                    if (notes?.trim()) lines.push(`Poznámky: ${notes.trim()}`);
                    const content = lines.join('<br>');

                    const res = await echoApi.addPipedriveNote({
                      personId,
                      orgId: contact.orgId,
                      content,
                    });

                    setCrmResult({ ok: Boolean(res?.success), message: res?.success ? 'Uloženo do Pipedrive.' : 'Nepodařilo se uložit do Pipedrive.' });
                  } catch (e) {
                    setCrmResult({ ok: false, message: e instanceof Error ? e.message : 'Uložení do CRM selhalo' });
                  } finally {
                    setCrmSaving(false);
                  }
                }}
              >
                {crmSaving ? '⏳ Ukládám do CRM…' : '💾 Uložit do CRM (Pipedrive)'}
              </button>
              {crmResult ? (
                <div className={`wrapup-crm-msg ${crmResult.ok ? 'ok' : 'err'}`}>{crmResult.message}</div>
              ) : null}
            </div>

            <div className="wrapup-email" style={{ marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={sequenceEnabled}
                  disabled={!isSupabaseConfigured || sequenceBusy}
                  onChange={async (e) => {
                    if (!contact) return;
                    const next = e.target.checked;
                    setSequenceMsg(null);
                    setSequenceBusy(true);
                    try {
                      if (!next) {
                        await echoApi.emailSchedule.cancel({ contactId: contact.id });
                        setSequenceEnabled(false);
                        setSequenceSchedules([]);
                        setSequenceMsg('Sekvence zrušena.');
                        return;
                      }

                      if (!emailDraft.trim()) {
                        setSequenceEnabled(false);
                        setSequenceMsg('Nejdřív připrav follow‑up e‑mail (aby měl AI kontext).');
                        return;
                      }

                      const lines = emailDraft.split('\n');
                      const subjectLine = lines.find(l => l.startsWith('Předmět:'));
                      const originalSubject = subjectLine ? subjectLine.replace('Předmět:', '').trim() : `${contact.company} – krátký dotaz`;
                      const bodyLines = lines.filter(l => !l.startsWith('Předmět:'));
                      const originalBody = bodyLines.join('\n').trim();

                      const d1 = computeSequenceIso(1);
                      const d3 = computeSequenceIso(3);
                      const baseContext = {
                        sequenceKind: 'cold',
                        contactName: contact.name,
                        company: contact.company,
                        recipientEmail: contact.email || '',
                        bcc: settings.smartBccAddress || '',
                        originalEmail: { subject: originalSubject, body: originalBody },
                      };

                      const res = await echoApi.emailSchedule.create({
                        contactId: contact.id,
                        schedules: [
                          { emailType: 'sequence-d1', scheduledFor: d1, context: baseContext },
                          { emailType: 'sequence-d3', scheduledFor: d3, context: baseContext },
                        ],
                      });
                      if (!res?.ok) throw new Error(res?.error || 'Nepodařilo se naplánovat sekvenci');
                      setSequenceEnabled(true);
                      setSequenceSchedules(Array.isArray(res?.schedules) ? res.schedules : []);
                      setSequenceMsg('Sekvence naplánována ✓');
                    } catch (err) {
                      setSequenceEnabled(false);
                      setSequenceMsg(err instanceof Error ? err.message : 'Nepodařilo se naplánovat sekvenci');
                    } finally {
                      setSequenceBusy(false);
                    }
                  }}
                />
                <span style={{ fontWeight: 700 }}>Naplánovat follow‑up sekvenci</span>
              </label>
              <div className="wrapup-email-hint muted">→ D+1: krátký bump ({formatSequenceWhen(computeSequenceIso(1))})</div>
              <div className="wrapup-email-hint muted">→ D+3: finální follow‑up ({formatSequenceWhen(computeSequenceIso(3))})</div>
              {sequenceMsg ? <div className="wrapup-email-hint muted">{sequenceMsg}</div> : null}
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
      {/* Session header */}
      <header className="header-v2">
        <div className="header-v2-left">
          <button onClick={() => setShowSettings(true)} className="header-btn">⚙ Nastavení</button>
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
