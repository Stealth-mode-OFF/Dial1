import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSales } from './contexts/SalesContext';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { SettingsWorkspace } from './pages/SettingsWorkspace';
import { useBrief } from './hooks/useBrief';
import { useBatchBriefs } from './hooks/useBatchBriefs';
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

type CallOutcome = 'connected' | 'no-answer' | 'meeting';

interface Session {
  stats: DailyStats;
  completedOutcomes: Record<string, CallOutcome>;
  notesByContact: Record<string, string>;
  domainByContact: Record<string, string>;
  currentIndex: number;
}

const loadSession = (): Session => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate legacy completedIds (string[]) → completedOutcomes (Record)
      let outcomes: Record<string, CallOutcome> = {};
      if (parsed?.completedOutcomes && typeof parsed.completedOutcomes === 'object' && !Array.isArray(parsed.completedOutcomes)) {
        outcomes = parsed.completedOutcomes;
      } else if (Array.isArray(parsed?.completedIds)) {
        parsed.completedIds.forEach((id: string) => { outcomes[id] = 'connected'; });
      }
      return {
        stats: parsed?.stats || { calls: 0, connected: 0, meetings: 0, talkTime: 0 },
        completedOutcomes: outcomes,
        notesByContact: parsed?.notesByContact && typeof parsed.notesByContact === 'object' ? parsed.notesByContact : {},
        domainByContact: parsed?.domainByContact && typeof parsed.domainByContact === 'object' ? parsed.domainByContact : {},
        currentIndex: Number.isFinite(parsed?.currentIndex) ? parsed.currentIndex : 0,
      };
    }
  } catch {}
  return {
    stats: { calls: 0, connected: 0, meetings: 0, talkTime: 0 },
    completedOutcomes: {},
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

// ============ LEAD SIDEBAR (hover slide-out) ============
function LeadSidebar({
  contacts,
  activeIndex,
  completedOutcomes,
  onSelect,
}: {
  contacts: Contact[];
  activeIndex: number;
  completedOutcomes: Record<string, CallOutcome>;
  onSelect: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const doneCount = contacts.filter(c => c.id in completedOutcomes).length;
  const connectedCount = contacts.filter(c => completedOutcomes[c.id] === 'connected' || completedOutcomes[c.id] === 'meeting').length;

  // Scroll active item into view when sidebar opens
  useEffect(() => {
    if (open && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [open, activeIndex]);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 300);
  }, []);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <>
      {/* Invisible hover trigger zone on left edge */}
      <div
        className="sidebar-trigger"
        onMouseEnter={handleMouseEnter}
      />
      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        className={`lead-sidebar ${open ? 'open' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-header">
          <span className="sidebar-title">Leadů {doneCount}/{contacts.length}</span>
          <span className="sidebar-subtitle">{connectedCount} dovoláno</span>
        </div>
        <div className="sidebar-list">
          {contacts.map((c, i) => {
            const outcome = completedOutcomes[c.id];
            const stateClass = outcome
              ? (outcome === 'no-answer' ? 'missed' : 'reached')
              : '';
            return (
              <button
                key={c.id}
                ref={i === activeIndex ? activeItemRef : undefined}
                className={`sidebar-lead ${i === activeIndex ? 'active' : ''} ${stateClass}`}
                onClick={() => onSelect(i)}
              >
                <span className="sidebar-lead-indicator">
                  {outcome
                    ? (outcome === 'no-answer' ? '✗' : '✓')
                    : (i === activeIndex ? '▸' : '○')
                  }
                </span>
                <span className="sidebar-lead-info">
                  <span className="sidebar-lead-name">{c.name}</span>
                  <span className="sidebar-lead-company">{c.company}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============ SETTINGS OVERLAY ============
function SettingsOverlay({
  open,
  onClose,
  smsTemplate,
  onSmsTemplateChange,
}: {
  open: boolean;
  onClose: () => void;
  smsTemplate: string;
  onSmsTemplateChange: (value: string) => void;
}) {
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
        <div className="settings-sms">
          <label htmlFor="sms-template">📱 SMS šablona (nedovoláno)</label>
          <textarea
            id="sms-template"
            className="settings-textarea"
            value={smsTemplate}
            onChange={(e) => onSmsTemplateChange(e.target.value)}
            rows={3}
          />
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
  const { progress: batchProgress, preload: batchPreload, skip: skipPreload, briefsByContactId } = useBatchBriefs();
  
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
  // Find the first uncalled lead on init (skip already completed)
  const [activeIndex, setActiveIndex] = useState(() => {
    const s = loadSession();
    if (!Object.keys(s.completedOutcomes).length) return s.currentIndex || 0;
    // If we have salesContacts available, find first uncalled
    if (salesContacts?.length) {
      const mapped = salesContacts.map(c => c.id);
      const firstUncalled = mapped.findIndex(id => !(id in s.completedOutcomes));
      if (firstUncalled >= 0) return firstUncalled;
    }
    return s.currentIndex || 0;
  });
  const [phase, setPhase] = useState<AppPhase>('ready');
  const [callStart, setCallStart] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [wrapupOutcome, setWrapupOutcome] = useState<'connected' | 'no-answer' | 'meeting' | null>(null);
  const [notes, setNotes] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoDialCountdown, setAutoDialCountdown] = useState(0);
  const [autoDialQueued, setAutoDialQueued] = useState(false);
  const autoDialTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [smsTemplate, setSmsTemplate] = useState(() => (
    localStorage.getItem('dial1.smsTemplate')
      || 'Dobrý den, zkoušel/a jsem Vás zastihnout telefonicky. Rád/a bych s Vámi probral/a možnou spolupráci. Můžeme se spojit?'
  ));

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

  // After import/refresh: jump to first uncalled lead (only when not mid-call)
  const prevContactsLenRef = useRef(contacts.length);
  const lastPreloadCountRef = useRef(0);
  useEffect(() => {
    if (phase !== 'ready') return;
    // Only trigger when contacts list actually changes (e.g. after import)
    if (contacts.length === prevContactsLenRef.current) return;
    prevContactsLenRef.current = contacts.length;
    if (!contacts.length) return;
    const firstUncalled = contacts.findIndex(c => !(c.id in session.completedOutcomes));
    if (firstUncalled >= 0) {
      setActiveIndex(firstUncalled);
    }
  }, [contacts, session.completedOutcomes, phase]);

  useEffect(() => {
    if (!contacts.length) return;
    if (!isSupabaseConfigured) return;
    if (!batchProgress.done) return;
    if (contacts.length === lastPreloadCountRef.current) return;
    lastPreloadCountRef.current = contacts.length;
    batchPreload(contacts);
  }, [contacts, batchProgress.done, batchPreload, isSupabaseConfigured]);

  useEffect(() => {
    try { localStorage.setItem('dial1.smsTemplate', smsTemplate); } catch {}
  }, [smsTemplate]);

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
      setAutoDialCountdown(0);
      setAutoDialQueued(false);
      if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
    }
  }, [contact?.id, session.domainByContact, session.notesByContact, clearBrief]);

  useEffect(() => () => {
    if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
  }, []);

  // Email history (last 3)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!contact?.id) return;
    if (phase !== 'wrapup') return;
    if (wrapupOutcome === 'no-answer') return;
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
  }, [contact?.id, isSupabaseConfigured, phase, wrapupOutcome]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!contact?.id) return;
    if (phase !== 'wrapup') return;
    if (wrapupOutcome === 'no-answer') return;
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
  }, [contact?.id, isSupabaseConfigured, phase, wrapupOutcome]);

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
    if (!contact) return;
    const dur = callStart ? Math.floor((Date.now() - callStart) / 1000) : 0;
    setWrapupOutcome(outcome);
    // Mark lead with its outcome
    setSession(s => ({
      ...s,
      stats: {
        ...s.stats,
        talkTime: s.stats.talkTime + dur,
        connected: outcome === 'connected' || outcome === 'meeting' ? s.stats.connected + 1 : s.stats.connected,
        meetings: outcome === 'meeting' ? s.stats.meetings + 1 : s.stats.meetings,
      },
      notesByContact: { ...s.notesByContact, [contact.id]: notes },
      completedOutcomes: { ...s.completedOutcomes, [contact.id]: outcome },
    }));
    setCallStart(null);
    setCallDuration(dur);
    setPhase('wrapup');

    // Auto-log to Pipedrive as done activity (fire-and-forget)
    if (isSupabaseConfigured) {
      echoApi.logCall({
        contactId: contact.id,
        contactName: contact.name,
        companyName: contact.company,
        disposition: outcome,
        notes: notes || (outcome === 'no-answer' ? 'Nedovoláno' : outcome === 'meeting' ? 'Demo domluveno' : 'Dovoláno'),
        duration: dur,
      }).catch(err => console.error('Auto-log to Pipedrive failed:', err));
    }

    if (outcome === 'no-answer') {
      if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
      setAutoDialCountdown(3);
      autoDialTimerRef.current = setInterval(() => {
        setAutoDialCountdown((prev) => {
          if (prev <= 1) {
            if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
            setAutoDialQueued(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [callStart, contact, notes, isSupabaseConfigured]);

  // Post-call AI analysis (WRAPUP)
  useEffect(() => {
    if (!contact) return;
    if (phase !== 'wrapup') return;
    if (wrapupOutcome === 'no-answer') return;
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

  // Advance to the next UNCALLED lead (skip completed ones)
  const nextContact = useCallback(() => {
    setActiveIndex(current => {
      // Look forward for the first uncalled lead
      for (let i = current + 1; i < contacts.length; i++) {
        if (!(contacts[i].id in session.completedOutcomes)) return i;
      }
      // If none found after current, just go to next (cap at end)
      return Math.min(current + 1, contacts.length - 1);
    });
  }, [contacts, session.completedOutcomes]);

  const handleWrapupDone = useCallback((booked: boolean) => {
    if (booked && contact) {
      setSession(s => ({
        ...s,
        stats: { ...s.stats, meetings: s.stats.meetings + 1 },
      }));
    }
    nextContact();
  }, [contact, nextContact]);

  const saveWrapupAndNext = useCallback(async () => {
    if (!contact) return;
    if (wrapupOutcome === 'no-answer') return;
    if (!isSupabaseConfigured) {
      setCrmResult({ ok: false, message: 'Supabase není nakonfigurovaný.' });
      return;
    }
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
      lines.push(`<b>📞 Hovor</b>`);
      lines.push(`Klient: <b>${contact.name}</b> (${contact.title || '—'}) – <b>${contact.company}</b>`);
      lines.push(`Výsledek: <b>${outcomeLabel(wrapupOutcome)}</b>`);
      lines.push(`Délka: <b>${formatTime(callDuration)}</b>`);
      const qa = aiQualAnswers
        .filter(Boolean)
        .slice(0, 3)
        .map((a, idx) => `• Q${idx + 1}: ${a}`)
        .join('<br>');
      if (qa) lines.push(`<br><b>Kvalifikace:</b><br>${qa}`);
      if (notes?.trim()) lines.push(`<br><b>Poznámky:</b><br>${notes.trim()}`);
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

    setTimeout(() => {
      handleWrapupDone(wrapupOutcome === 'meeting');
    }, 800);
  }, [aiQualAnswers, callDuration, contact, handleWrapupDone, isSupabaseConfigured, notes, wrapupOutcome]);

  const pauseAutoDial = useCallback(() => {
    if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
    setAutoDialCountdown(0);
  }, []);

  useEffect(() => {
    if (!autoDialQueued) return;
    setAutoDialQueued(false);
    nextContact();
    setTimeout(() => {
      startCall();
    }, 600);
  }, [autoDialQueued, nextContact, startCall]);

  const getSmsUrl = useCallback(() => {
    if (!contact?.phone) return '';
    const phone = contact.phone.replace(/[^\d+]/g, '');
    if (!phone) return '';
    return `sms:${phone}?body=${encodeURIComponent(smsTemplate)}`;
  }, [contact?.phone, smsTemplate]);

  const sendSms = useCallback(() => {
    const url = getSmsUrl();
    if (!url) return;
    pauseAutoDial();
    window.location.href = url;
  }, [getSmsUrl, pauseAutoDial]);

  const handleAutoDialNext = useCallback(() => {
    pauseAutoDial();
    nextContact();
    setTimeout(() => {
      startCall();
    }, 600);
  }, [pauseAutoDial, nextContact, startCall]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'c' && phase === 'ready') { e.preventDefault(); startCall(); }
      if (phase === 'calling') {
        if (e.key === '1') { e.preventDefault(); endCall('no-answer'); }
        if (e.key === '2') { e.preventDefault(); endCall('connected'); }
        if (e.key === '3') { e.preventDefault(); endCall('meeting'); }
      }
      if (phase === 'wrapup' && wrapupOutcome === 'no-answer') {
        if (e.key === ' ') { e.preventDefault(); pauseAutoDial(); }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); sendSms(); }
        if (e.key === 'Enter') { e.preventDefault(); handleAutoDialNext(); }
      }
      if (phase === 'wrapup' && wrapupOutcome !== 'no-answer') {
        if (e.key === 'Enter') { e.preventDefault(); saveWrapupAndNext(); }
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, contacts.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contacts.length, endCall, handleAutoDialNext, pauseAutoDial, phase, saveWrapupAndNext, sendSms, startCall, wrapupOutcome]);

  const displayBrief = contact ? (briefsByContactId[contact.id] || brief) : null;

  // ============ RENDER: READY PHASE ============
  const renderReady = () => (
    <div className="seq-ready">
      <div className="seq-lead-card">
        <div className="seq-lead-main">
          <div className="seq-lead-avatar">{contact!.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          <div className="seq-lead-info">
            <h2 className="seq-lead-name">{contact!.name}</h2>
            <p className="seq-lead-role">{contact!.title || '—'} @ {contact!.company}</p>
            {contact!.phone ? (
              <a href={`tel:${contact!.phone}`} className="seq-lead-phone">{contact!.phone}</a>
            ) : (
              <span className="seq-lead-phone muted">Telefon chybí</span>
            )}
          </div>
        </div>

        <div className="seq-brief-compact" aria-live="polite">
          {briefError ? (
            <div className="seq-brief-error">{briefError}</div>
          ) : displayBrief ? (
            <>
              {displayBrief.company?.summary ? (
                <p className="seq-brief-summary">{displayBrief.company.summary}</p>
              ) : null}
              {(displayBrief.signals || []).length > 0 ? (
                <div className="seq-brief-signals">
                  {displayBrief.signals.slice(0, 3).map((s, i) => (
                    <span key={`${s.type}-${i}`} className={`seq-signal seq-signal-${s.type}`}>{s.text}</span>
                  ))}
                </div>
              ) : null}
              {aiScript?.openingVariants?.[0]?.text ? (
                <div className="seq-opening">
                  <span className="seq-opening-label">💬 Opening:</span>
                  <span className="seq-opening-text">{aiScript.openingVariants[0].text}</span>
                </div>
              ) : null}
            </>
          ) : briefLoading ? (
            <div className="seq-brief-loading">⏳ Načítám brief...</div>
          ) : (
            <div className="seq-brief-loading">Brief není k dispozici.</div>
          )}
        </div>
      </div>

      <div className="seq-ready-actions">
        <button className="seq-call-btn" onClick={startCall}>
          📞 Zavolat
        </button>
        <button className="seq-skip-btn" onClick={nextContact}>Přeskočit →</button>
      </div>
      <p className="seq-hint">C = zavolat · → = přeskočit</p>
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
        <div className="script-ai">
          <div className="script-ai-title">Skript hovoru</div>
          <div className="script-ai-block">
            <div className="script-ai-label">Otevírací věta</div>
            <p className="script-ai-quote">Připravte si vlastní otevírací větu v Nastavení.</p>
          </div>
        </div>

        <p className="script-transition">Kvalifikační otázky</p>

        <div className="script-question">
          <span className="script-q-num">1</span>
          <div className="script-q-content">
            <p>Kolik zaměstnanců máte?</p>
            <input
              value={aiQualAnswers[0] || ''}
              onChange={(e) =>
                setAiQualAnswers((prev) => {
                  const next = [...prev];
                  next[0] = e.target.value;
                  return next;
                })
              }
              placeholder="Odpověď…"
            />
          </div>
        </div>

        <div className="script-question">
          <span className="script-q-num">2</span>
          <div className="script-q-content">
            <p>Jaký problém aktuálně řešíte?</p>
            <input
              value={aiQualAnswers[1] || ''}
              onChange={(e) =>
                setAiQualAnswers((prev) => {
                  const next = [...prev];
                  next[1] = e.target.value;
                  return next;
                })
              }
              placeholder="Odpověď…"
            />
          </div>
        </div>

        <div className="script-question">
          <span className="script-q-num">3</span>
          <div className="script-q-content">
            <p>Kdo rozhoduje o nákupu?</p>
            <input
              value={aiQualAnswers[2] || ''}
              onChange={(e) =>
                setAiQualAnswers((prev) => {
                  const next = [...prev];
                  next[2] = e.target.value;
                  return next;
                })
              }
              placeholder="Odpověď…"
            />
          </div>
        </div>

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
  const renderNoAnswerOverlay = () => {
    if (!contact) return null;
    const smsUrl = getSmsUrl();
    const smsDisabled = !smsUrl;

    return (
      <div className="seq-overlay">
        <div className="seq-overlay-card">
          <div className="seq-overlay-icon">📵</div>
          <h2 className="seq-overlay-title">Nedovoláno</h2>
          <p className="seq-overlay-name">{contact.name} – {contact.company}</p>

          <div className="seq-overlay-status">
            <span className="seq-check">✅ Zalogováno do CRM</span>
            <span className="seq-check">📅 Follow-up za 2 dny naplánován</span>
          </div>

          <div className="seq-overlay-actions">
            <button className="seq-sms-btn" onClick={sendSms} disabled={smsDisabled}>
              📱 Odeslat SMS
            </button>
          </div>

          {autoDialCountdown > 0 ? (
            <div className="seq-countdown">
              <div className="seq-countdown-num">{autoDialCountdown}</div>
              <p>Další hovor za {autoDialCountdown}s</p>
              <button className="seq-pause-btn" onClick={pauseAutoDial}>⏸️ Pozastavit</button>
            </div>
          ) : (
            <button className="seq-next-btn" onClick={handleAutoDialNext}>
              📞 Zavolat dalšímu →
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderConnectedWrapup = () => {
    if (!contact) return null;
    const questions = (aiScript?.qualification || [
      { question: 'Kolik zaměstnanců máte?' },
      { question: 'Jaký problém aktuálně řešíte?' },
      { question: 'Kdo rozhoduje o nákupu?' },
    ]).slice(0, 3);

    return (
      <div className="seq-wrapup">
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
          <div className="seq-wrapup-card">
            <div className="seq-wrapup-header">
              <span className="seq-wrapup-outcome">{wrapupOutcome === 'meeting' ? '📅 Demo domluveno' : '✅ Dovoláno'}</span>
              <span className="seq-wrapup-contact">{contact.name} – {contact.company}</span>
              <span className="seq-wrapup-time">⏱️ {formatTime(callDuration)}</span>
            </div>

            <div className="seq-qual">
              <h3 className="seq-qual-title">Kvalifikace</h3>
              {questions.map((q, i) => (
                <div key={`${q.question}-${i}`} className="seq-qual-row">
                  <label className="seq-qual-label">{q.question}</label>
                  <input
                    className="seq-qual-input"
                    value={aiQualAnswers[i] || ''}
                    onChange={(e) =>
                      setAiQualAnswers((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    placeholder="Odpověď..."
                  />
                </div>
              ))}
            </div>

            <div className="seq-notes">
              <label className="seq-notes-label">Poznámky</label>
              <textarea
                className="seq-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Klíčové body z hovoru..."
              />
            </div>

            <div className="seq-wrapup-actions">
              <button className="seq-save-btn" disabled={crmSaving || !isSupabaseConfigured} onClick={saveWrapupAndNext}>
                {crmSaving ? '⏳ Ukládám...' : '💾 Uložit + Další →'}
              </button>
              {wrapupOutcome === 'meeting' && (
                <button className="seq-demo-btn" onClick={() => setShowScheduler(true)}>
                  📅 Naplánovat demo
                </button>
              )}
            </div>

            {crmResult ? (
              <div className={`seq-crm-msg ${crmResult.ok ? 'ok' : 'err'}`}>{crmResult.message}</div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderWrapup = () => (
    wrapupOutcome === 'no-answer' ? renderNoAnswerOverlay() : renderConnectedWrapup()
  );

  // ============ RENDER: EMPTY STATE ============
  const renderEmpty = () => (
    <div className="phase-empty">
      <div className="empty-card">
        <span className="empty-icon">◎</span>
        <h2>Žádné kontakty</h2>
        <p>Importuj 30 leadů z Pipedrive a začni volat.</p>
        <div className="empty-actions">
          <button onClick={handleImport} disabled={importing || !pipedriveConfigured}>
            {importing ? 'Importuji…' : '↓ Importovat 30 leadů'}
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
          <span title="Provoláno dnes">{Object.keys(session.completedOutcomes).length}/{contacts.length} leadů</span>
          <span>{session.stats.calls} hovorů</span>
          <span>{session.stats.connected} spojeno</span>
          <span>{session.stats.meetings} dem</span>
          <span>{formatTime(session.stats.talkTime)}</span>
        </div>

        <div className="header-v2-right">
          <button
            onClick={handleImport}
            disabled={importing || !pipedriveConfigured}
            className="header-btn header-btn-import"
          >
            {importing ? '...' : '↓ Import 30 leadů'}
          </button>
        </div>
      </header>

      {contacts.length > 0 && (
        <div className="seq-progress-bar">
          <span className="seq-progress-label">
            Lead {Math.min(Object.keys(session.completedOutcomes).length + 1, contacts.length)}/{contacts.length}
          </span>
          <div className="seq-progress-track">
            <div
              className="seq-progress-fill"
              style={{ width: `${Math.round((Object.keys(session.completedOutcomes).length / contacts.length) * 100)}%` }}
            />
          </div>
          <div className="seq-progress-stats">
            <span>✅ {contacts.filter(c => session.completedOutcomes[c.id] === 'connected' || session.completedOutcomes[c.id] === 'meeting').length}</span>
            <span>❌ {contacts.filter(c => session.completedOutcomes[c.id] === 'no-answer').length}</span>
            <span>⏱️ {formatTime(session.stats.talkTime)}</span>
          </div>
        </div>
      )}

      {!batchProgress.done && (
        <div className="seq-preload-overlay">
          <div className="seq-preload-card">
            <h3>⏳ Připravuji AI briefy</h3>
            <p>{batchProgress.loaded}/{batchProgress.total} leadů</p>
            <div className="seq-preload-track">
              <div
                className="seq-preload-fill"
                style={{ width: `${Math.round((batchProgress.loaded / Math.max(1, batchProgress.total)) * 100)}%` }}
              />
            </div>
            <button className="seq-preload-skip" onClick={skipPreload}>
              Přeskočit, volat hned →
            </button>
          </div>
        </div>
      )}

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

      {/* Lead sidebar (hover on left edge) */}
      {contacts.length > 0 && (
        <LeadSidebar
          contacts={contacts}
          activeIndex={activeIndex}
          completedOutcomes={session.completedOutcomes}
          onSelect={setActiveIndex}
        />
      )}

      <AnimatePresence>
        {showSettings && (
          <SettingsOverlay
            open={showSettings}
            onClose={() => setShowSettings(false)}
            smsTemplate={smsTemplate}
            onSmsTemplateChange={setSmsTemplate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default DialerApp;
