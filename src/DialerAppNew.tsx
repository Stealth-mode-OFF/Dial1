import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSales } from './contexts/SalesContext';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { SettingsWorkspace } from './pages/SettingsWorkspace';

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

// ============ STORAGE ============
const STORAGE_KEY = 'dial1.v4';

interface Session {
  stats: DailyStats;
  completedIds: string[];
  notesByContact: Record<string, string>;
  currentIndex: number;
}

const loadSession = (): Session => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { stats: { calls: 0, connected: 0, meetings: 0, talkTime: 0 }, completedIds: [], notesByContact: {}, currentIndex: 0 };
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
        <span>⚡ Whisper</span>
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
          <span>Queue ({contacts.length})</span>
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
          <h2>Settings</h2>
          <button onClick={onClose}>Esc</button>
        </div>
        <SettingsWorkspace />
      </motion.div>
    </motion.div>
  );
}

// ============ MAIN APP ============
export function DialerApp({ onSwitchMode }: { onSwitchMode?: () => void }) {
  const { contacts: salesContacts, isLoading, pipedriveConfigured, refresh } = useSales();
  
  const contacts: Contact[] = useMemo(() => {
    if (!salesContacts?.length) return [];
    return salesContacts.map(c => ({
      id: c.id,
      name: c.name || 'Unknown',
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
  const [notes, setNotes] = useState('');
  const [showQueue, setShowQueue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [importing, setImporting] = useState(false);

  // Script fields
  const [companySize, setCompanySize] = useState('');
  const [engagement, setEngagement] = useState('');
  const [lateInfo, setLateInfo] = useState('');

  const contact = contacts[activeIndex] || null;
  const externalNavDisabled = import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true';

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
      setCompanySize('');
      setEngagement('');
      setLateInfo('');
      setPhase('ready');
    }
  }, [contact?.id]);

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
    setCallDuration(0);
    setPhase('wrapup');
  }, [callStart, contact, notes]);

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

      <button className="btn-call" onClick={startCall}>
        <span className="btn-call-icon">●</span>
        Zavolat
        <kbd>C</kbd>
      </button>

      <div className="ready-actions">
        <button onClick={nextContact}>Přeskočit →</button>
        <button onClick={() => setShowQueue(true)}>Queue (Q)</button>
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
          <button className="btn-end btn-end-skip" onClick={() => endCall('no-answer')}>Skip</button>
          <button className="btn-end btn-end-done" onClick={() => endCall('connected')}>Done</button>
          <button className="btn-end btn-end-meeting" onClick={() => endCall('meeting')}>📅 Meeting</button>
        </div>
      </div>

      {/* Script */}
      <div className="script">
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
            <input
              value={companySize}
              onChange={e => setCompanySize(e.target.value)}
              placeholder="např. 120 lidí"
            />
          </div>
        </div>

        <div className="script-question">
          <span className="script-q-num">2</span>
          <div className="script-q-content">
            <p>Zjišťujete nějak pravidelně náladu nebo spokojenost týmů?</p>
            <input
              value={engagement}
              onChange={e => setEngagement(e.target.value)}
              placeholder="Ano / Ne / Jak?"
            />
          </div>
        </div>

        <div className="script-question">
          <span className="script-q-num">3</span>
          <div className="script-q-content">
            <p>Jak často se k vám dostane informace o problému až pozdě?</p>
            <input
              value={lateInfo}
              onChange={e => setLateInfo(e.target.value)}
              placeholder="Stává se / Občas / Ne"
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

  // ============ RENDER: WRAPUP PHASE ============
  const renderWrapup = () => (
    <div className="phase-wrapup">
      <div className="wrapup-card">
        <h2>Hovor ukončen</h2>
        <p className="wrapup-contact">{contact!.name} · {contact!.company}</p>
        <p className="wrapup-duration">{formatTime(callDuration)} min</p>

        <div className="wrapup-summary">
          {companySize && <div><strong>Velikost:</strong> {companySize}</div>}
          {engagement && <div><strong>Engagement:</strong> {engagement}</div>}
          {lateInfo && <div><strong>Pozdní info:</strong> {lateInfo}</div>}
          {notes && <div><strong>Poznámky:</strong> {notes}</div>}
        </div>

        <div className="wrapup-actions">
          <button className="btn-wrapup btn-wrapup-next" onClick={() => handleWrapupDone(false)}>
            Další kontakt →
          </button>
          <button className="btn-wrapup btn-wrapup-meeting" onClick={() => handleWrapupDone(true)}>
            📅 Naplánované demo
          </button>
        </div>
      </div>
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
            {importing ? 'Importuji…' : 'Import 30 leads'}
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
          {onSwitchMode && <button onClick={onSwitchMode} className="header-btn">→ Meet</button>}
          <button onClick={() => setShowSettings(true)} className="header-btn">⚙</button>
        </div>

        <div className="header-v2-stats">
          <span>{session.stats.calls} calls</span>
          <span>{session.stats.meetings} meetings</span>
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
          <div className="loading">Loading…</div>
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
