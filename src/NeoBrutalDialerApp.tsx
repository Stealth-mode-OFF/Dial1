import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSales } from './contexts/SalesContext';

type Contact = {
  id: string;
  name: string;
  company: string;
  phone: string;
};

type Outcome = 'called' | 'no-answer' | 'demo-booked' | 'not-interested';

type SessionState = {
  version: 1;
  activeIndex: number;
  notesByContactId: Record<string, string>;
  callsMade: number;
  demosBooked: number;
  talkTimeSec: number;
};

const STORAGE_KEY = 'dial1.neo.session.v1';

const defaultContacts: Contact[] = [
  { id: 'c1', name: 'Jan Novák', company: 'TechCorp s.r.o.', phone: '+420 123 456 789' },
  { id: 'c2', name: 'Marie K.', company: 'Beta Logistics', phone: '+420 777 987 654' },
  { id: 'c3', name: 'Pavel S.', company: 'ACME s.r.o.', phone: '+420 777 123 456' },
  { id: 'c4', name: 'Lucie R.', company: 'Delta Systems', phone: '+420 606 111 222' },
];

const loadSession = (): SessionState => {
  const fallback: SessionState = {
    version: 1,
    activeIndex: 0,
    notesByContactId: {},
    callsMade: 0,
    demosBooked: 0,
    talkTimeSec: 0,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      version: 1,
      notesByContactId: { ...(parsed?.notesByContactId || {}) },
    } as SessionState;
  } catch {
    return fallback;
  }
};

const saveSession = (next: SessionState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const isEditable = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return Boolean((el as any).isContentEditable);
};

const confettiPieces = Array.from({ length: 18 }).map((_, i) => i);

function NeoPill({ tone, children }: { tone: 'primary' | 'secondary' | 'accent' | 'success'; children: React.ReactNode }) {
  return <span className={`neo-pill neo-${tone}`}>{children}</span>;
}

function Shortcut({ k, label }: { k: string; label: string }) {
  return (
    <span className="neo-hint">
      <span className="neo-key">{k}</span>
      <span className="neo-hint-label">{label}</span>
    </span>
  );
}

function useMeetNewTab() {
  return () => {
    if (typeof window === 'undefined') return;
    if (import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true') return;
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
  };
}

export function NeoBrutalDialerApp() {
  const { contacts: salesContacts } = useSales();
  const contacts: Contact[] = useMemo(() => {
    const mapped =
      (salesContacts || [])
        .filter((c) => Boolean(c.phone))
        .slice(0, 60)
        .map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company || '—',
          phone: c.phone || '',
        })) || [];
    return mapped.length ? mapped : defaultContacts;
  }, [salesContacts]);

  const [session, setSession] = useState<SessionState>(() => loadSession());
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const openMeet = useMeetNewTab();

  const activeIndex = Math.min(Math.max(0, session.activeIndex), Math.max(0, contacts.length - 1));
  const current = contacts[activeIndex] || null;
  const currentNotes = current ? session.notesByContactId[current.id] || '' : '';

  useEffect(() => {
    saveSession({ ...session, activeIndex });
  }, [session, activeIndex]);

  useEffect(() => {
    if (!callStartedAt) return;
    const t = window.setInterval(() => setTick((x) => x + 1), 250);
    return () => window.clearInterval(t);
  }, [callStartedAt]);

  const callTimeSec = useMemo(() => {
    if (!callStartedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000));
  }, [callStartedAt, tick]);

  const setActiveIndex = (idx: number) => {
    setSession((prev) => ({ ...prev, activeIndex: Math.max(0, Math.min(idx, contacts.length - 1)) }));
  };

  const moveNext = () => setActiveIndex((activeIndex + 1) % Math.max(1, contacts.length));
  const movePrev = () => setActiveIndex((activeIndex - 1 + Math.max(1, contacts.length)) % Math.max(1, contacts.length));

  const updateNotes = (value: string) => {
    if (!current) return;
    setSession((prev) => ({
      ...prev,
      notesByContactId: { ...prev.notesByContactId, [current.id]: value },
    }));
  };

  const dial = () => {
    if (!current?.phone) return;
    if (import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV !== 'true') {
      const normalized = current.phone.replace(/[^\d+]/g, '');
      window.location.href = `tel:${normalized}`;
    }
    if (!callStartedAt) setCallStartedAt(Date.now());
    setSession((prev) => ({ ...prev, callsMade: prev.callsMade + 1 }));
  };

  const applyOutcome = (outcome: Outcome) => {
    const started = callStartedAt;
    if (started) {
      const dur = Math.max(0, Math.floor((Date.now() - started) / 1000));
      setSession((prev) => ({ ...prev, talkTimeSec: prev.talkTimeSec + dur }));
    }
    setCallStartedAt(null);

    if (outcome === 'demo-booked') {
      setSession((prev) => ({ ...prev, demosBooked: prev.demosBooked + 1 }));
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 900);
    }

    moveNext();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target) && e.key.toLowerCase() !== 'escape') return;
      const key = e.key.toLowerCase();

      if (key === 'arrowdown') {
        e.preventDefault();
        moveNext();
        return;
      }
      if (key === 'arrowup') {
        e.preventDefault();
        movePrev();
        return;
      }

      if (key === 'c') {
        e.preventDefault();
        dial();
        return;
      }
      if (key === 's') {
        e.preventDefault();
        moveNext();
        return;
      }
      if (key === 'd') {
        e.preventDefault();
        applyOutcome('demo-booked');
        return;
      }
      if (key === 'n') {
        e.preventDefault();
        notesRef.current?.focus();
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        openMeet();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, callStartedAt, current?.id, openMeet]);

  return (
    <div className="neo-app" data-testid="neo-dialer">
      <header className="neo-stats">
        <div className="neo-stats-left">
          <div className="neo-brand">
            <span className="neo-logo">D1</span>
            <div className="neo-brand-text">
              <div className="neo-title">Dial1 Dialer</div>
              <div className="neo-subtitle">Single screen · zero scroll</div>
            </div>
          </div>
        </div>

        <div className="neo-stats-right">
          <NeoPill tone="primary">📞 Calls: {session.callsMade}</NeoPill>
          <NeoPill tone="success">✅ Demos: {session.demosBooked}</NeoPill>
          <NeoPill tone="secondary">⏱ Talk: {formatTimer(session.talkTimeSec)}</NeoPill>
          <NeoPill tone="accent">⏳ Live: {formatTimer(callTimeSec)}</NeoPill>
        </div>
      </header>

      <main className="neo-main" role="main">
        <section className="neo-focus">
          <motion.div
            className="neo-card"
            whileHover={{ rotate: 0.5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            aria-label="Current contact"
          >
            <div className="neo-card-head">CURRENT CONTACT</div>
            <div className="neo-card-body">
              <div className="neo-row">
                <div className="neo-label">Name</div>
                <div className="neo-value">{current?.name || '—'}</div>
              </div>
              <div className="neo-row">
                <div className="neo-label">Company</div>
                <div className="neo-value">{current?.company || '—'}</div>
              </div>
              <div className="neo-row">
                <div className="neo-label">Phone</div>
                <div className="neo-value neo-mono">{current?.phone || '—'}</div>
              </div>
            </div>
          </motion.div>

          <div className="neo-actions" aria-label="Actions">
            <motion.button className="neo-btn neo-call" whileHover={{ y: -2 }} whileTap={{ y: 1 }} onClick={dial} type="button">
              <div className="neo-btn-label">CALL</div>
              <div className="neo-btn-emoji">📞</div>
              <div className="neo-btn-kbd">C</div>
            </motion.button>

            <motion.button className="neo-btn neo-skip" whileHover={{ y: -2 }} whileTap={{ y: 1 }} onClick={moveNext} type="button">
              <div className="neo-btn-label">SKIP</div>
              <div className="neo-btn-emoji">⏭️</div>
              <div className="neo-btn-kbd">S</div>
            </motion.button>

            <motion.button
              className="neo-btn neo-demo"
              whileHover={{ y: -2 }}
              whileTap={{ y: 1 }}
              onClick={() => applyOutcome('demo-booked')}
              type="button"
            >
              <div className="neo-btn-label">DEMO</div>
              <div className="neo-btn-emoji">✅</div>
              <div className="neo-btn-kbd">D</div>
            </motion.button>

            <motion.button className="neo-btn neo-meet" whileHover={{ y: -2 }} whileTap={{ y: 1 }} onClick={openMeet} type="button">
              <div className="neo-btn-label">MEET</div>
              <div className="neo-btn-emoji">🎥</div>
              <div className="neo-btn-kbd">M</div>
            </motion.button>
          </div>

          <div className="neo-notes">
            <div className="neo-notes-label">Quick Notes</div>
            <textarea
              ref={notesRef}
              className="neo-notes-input"
              value={currentNotes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Type notes… (N to focus)"
              rows={2}
            />
          </div>

          <div className="neo-outcomes" aria-label="Quick outcomes">
            <button className="neo-chip" onClick={() => applyOutcome('called')} type="button">
              Called
            </button>
            <button className="neo-chip" onClick={() => applyOutcome('no-answer')} type="button">
              No Answer
            </button>
            <button className="neo-chip" onClick={() => applyOutcome('not-interested')} type="button">
              Not Interested
            </button>
          </div>
        </section>
      </main>

      <footer className="neo-queue" aria-label="Queue">
        <div className="neo-queue-left">
          <span className="neo-queue-title">Queue</span>
          <span className="neo-queue-sep">·</span>
          <span className="neo-queue-next">
            Next:{' '}
            {contacts
              .slice(activeIndex + 1, activeIndex + 4)
              .map((c) => c.name)
              .join(' → ') || '—'}
          </span>
          <span className="neo-queue-more">
            → {Math.max(0, contacts.length - (activeIndex + 1 + 3))} more
          </span>
        </div>

        <div className="neo-queue-right">
          <Shortcut k="C" label="call" />
          <Shortcut k="S" label="skip" />
          <Shortcut k="D" label="demo" />
          <Shortcut k="N" label="notes" />
          <Shortcut k="↑/↓" label="queue" />
        </div>
      </footer>

      {showConfetti ? (
        <div className="neo-confetti" aria-hidden="true">
          {confettiPieces.map((i) => (
            <span key={i} className="neo-confetti-piece" style={{ ['--i' as any]: i }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

