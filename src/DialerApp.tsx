import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSales } from './contexts/SalesContext';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';

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
  isFromApi: boolean;
}

interface DailyStats {
  calls: number;
  connected: number;
  meetings: number;
  talkTime: number;
  goal: number;
}

// ============ FALLBACK DATA ============
const FALLBACK_CONTACTS: Contact[] = [
  { id: '1', name: 'Jan Novák', company: 'TechCorp s.r.o.', phone: '+420 777 123 456', email: 'jan@techcorp.cz', title: 'CEO', status: 'new', priority: 'high', industry: 'Software' },
  { id: '2', name: 'Marie Svobodová', company: 'Digital Solutions', phone: '+420 608 234 567', email: 'marie@digital.cz', title: 'Marketing Director', status: 'new', priority: 'high', industry: 'Marketing' },
  { id: '3', name: 'Petr Kučera', company: 'Innovation Hub', phone: '+420 721 345 678', email: 'petr@innovhub.cz', title: 'CTO', status: 'contacted', priority: 'medium', industry: 'Technology' },
  { id: '4', name: 'Eva Procházková', company: 'StartUp Factory', phone: '+420 602 456 789', email: 'eva@startup.cz', title: 'Founder', status: 'new', priority: 'high', industry: 'Venture Capital' },
  { id: '5', name: 'Tomáš Veselý', company: 'Cloud Systems', phone: '+420 773 567 890', email: 'tomas@cloud.cz', title: 'VP Sales', status: 'interested', priority: 'high', industry: 'Cloud Services' },
];

// ============ AI PREP - Real API + Fallback ============
const generateAIPrep = async (contact: Contact): Promise<AIPrep> => {
  // Try real OpenAI API first
  if (isSupabaseConfigured) {
    try {
      const result = await echoApi.ai.sectorBattleCard({
        companyName: contact.company,
        industry: contact.industry,
        personTitle: contact.title,
      });
      
      if (result) {
        return {
          companyInsight: result.companyContext || result.insight || `${contact.company} v oboru ${contact.industry}`,
          painPoints: result.painPoints || result.challenges || [],
          openingLine: result.openingLine || result.opener || '',
          qualifyingQuestions: result.qualifyingQuestions || result.questions || [],
          objectionHandlers: result.objectionHandlers || result.objections || [],
          competitorMentions: result.competitors || [],
          recentNews: result.recentNews || result.news,
          decisionMakerTips: result.decisionMakerTips || result.dmTips || '',
          isFromApi: true,
        };
      }
    } catch (err) {
      console.warn('AI API failed, using fallback:', err);
    }
  }

  // Intelligent fallback
  await new Promise(r => setTimeout(r, 400));
  const firstName = contact.name.split(' ')[0];

  const industryData: Record<string, { pains: string[]; competitors: string[] }> = {
    'Software': {
      pains: ['Dlouhé sales cykly snižující cash flow', 'Nízká konverze leadů na demo', 'Nedostatek kvalitních dat pro personalizaci'],
      competitors: ['Salesforce', 'HubSpot', 'Pipedrive'],
    },
    'Marketing': {
      pains: ['Obtížné měření ROI kampaní', 'Fragmentace dat mezi platformami', 'Slabý alignment se sales'],
      competitors: ['HubSpot', 'Marketo', 'Mailchimp'],
    },
    'Technology': {
      pains: ['Škálování bez ztráty kvality', 'Technický dluh v legacy systémech', 'Hiring a retence talentů'],
      competitors: ['Microsoft', 'Google', 'AWS'],
    },
    'Cloud Services': {
      pains: ['Konkurence hyperscalerů', 'Security compliance', 'Churn enterprise klientů'],
      competitors: ['AWS', 'Azure', 'Google Cloud'],
    },
    'default': {
      pains: ['Efektivita obchodního týmu', 'Kvalifikace leadů', 'Zkrácení sales cyklu'],
      competitors: ['Salesforce', 'HubSpot', 'Outreach'],
    },
  };

  const data = industryData[contact.industry || 'default'] || industryData['default'];

  const openingByTitle: Record<string, string> = {
    'CEO': `${firstName}, volám protože spolupracuji s CEO v ${contact.industry || 'B2B'} a řeším s nimi růst revenue. Máte 90 sekund?`,
    'CTO': `${firstName}, jako CTO jistě řešíte jak dát sales týmu lepší nástroje. Mám konkrétní řešení - máte chvíli?`,
    'VP Sales': `${firstName}, pracuji s VP Sales podobných firem. Vím, že řešíte prediktabilitu pipeline. Krátký call?`,
    'Founder': `${firstName}, jako founder ${contact.company} víte, že každý deal je klíčový. Ukážu vám jak zvýšit close rate.`,
    'Marketing Director': `${firstName}, marketing a sales alignment je věčná výzva. Mám řešení - stojí za 2 minuty?`,
  };

  const decisionTips: Record<string, string> = {
    'CEO': 'DECISION MAKER - Mluv strategicky. ROI, růst, konkurenční výhoda. Respektuj jeho čas.',
    'CTO': 'TECHNICAL INFLUENCER - Zajímá ho integrace, security, maintenance. Zjisti kdo má budget.',
    'VP Sales': 'DIRECT BUYER - Zná pain přesně. Mluv o metrikách: connect rate, pipeline velocity, win rate.',
    'Founder': 'ULTIMATE DECISION MAKER - Rychlý, pragmatický. Chce výsledky, ne features.',
    'Marketing Director': 'INFLUENCER - Spolupracuje se sales. Zjisti vztah s VP Sales nebo CRO.',
  };

  return {
    companyInsight: `${contact.company} působí v ${contact.industry || 'B2B'}. ${contact.title} má pravděpodobně přehled o sales výzvách. Zaměř se na byznysový dopad, ne technické detaily.`,
    painPoints: data.pains,
    openingLine: openingByTitle[contact.title || ''] || `${firstName}, spolupracuji s firmami v ${contact.industry || 'vašem oboru'}. Máte 2 minuty na krátký insight?`,
    qualifyingQuestions: [
      'Jaká je vaše priorita pro tento kvartál?',
      'Jak vypadá váš současný sales proces?',
      'Kdo ještě rozhoduje o nástrojích pro sales?',
    ],
    objectionHandlers: [
      { objection: '"Nemám čas"', response: `Rozumím. Právě proto volám - ukážu vám jak ušetřit 5h týdně. Kdy se hodí 15 minut?` },
      { objection: '"Pošlete email"', response: 'Jasně. Co konkrétně teď řešíte v sales? Pošlu vám relevantní case study.' },
      { objection: '"Už něco máme"', response: 'Co používáte? Většina klientů k nám přešla právě od podobných řešení.' },
      { objection: '"Je to drahé"', response: 'Kolik stojí jeden ztracený deal? ROI vidíte první měsíc.' },
    ],
    competitorMentions: data.competitors,
    decisionMakerTips: decisionTips[contact.title || ''] || 'Zjisti rozhodovací proces a kdo má budget.',
    isFromApi: false,
  };
};

// ============ UTILITIES ============
const formatTime = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

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

function AIPrepPanel({ prep, isLoading, onRefresh }: { prep: AIPrep | null; isLoading: boolean; onRefresh: () => void }) {
  const [tab, setTab] = useState<'prep' | 'objections' | 'qualify'>('prep');
  const [copied, setCopied] = useState(false);

  const copyOpener = () => {
    if (prep?.openingLine) {
      navigator.clipboard.writeText(prep.openingLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
        {(['prep', 'objections', 'qualify'] as const).map(t => (
          <button key={t} className={`ai-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'prep' ? 'Brief' : t === 'objections' ? 'Objections' : 'Qualify'}
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
                  <span className="ai-card-label">Discovery Questions</span>
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
                  <span className="ai-card-label">Booking Script</span>
                  <p className="ai-script">"Super, vidím že to dává smysl. Co takhle si dát 20 minut příští týden? Hodí se úterý nebo čtvrtek?"</p>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="ai-empty">Select a contact to load intelligence</div>
        )}
      </div>
    </aside>
  );
}

// ============ MAIN ============
export function DialerApp() {
  const { contacts: salesContacts, isLoading: contactsLoading } = useSales();
  
  // Map sales contacts or use fallback
  const contacts: Contact[] = useMemo(() => {
    if (salesContacts && salesContacts.length > 0) {
      return salesContacts
        .filter(c => c.phone)
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
    return FALLBACK_CONTACTS;
  }, [salesContacts]);

  const [session, setSession] = useState<StoredSession>(loadSession);
  const [activeIndex, setActiveIndex] = useState(Math.min(session.currentIndex, contacts.length - 1));
  const [isInCall, setIsInCall] = useState(false);
  const [callStart, setCallStart] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [aiPrep, setAiPrep] = useState<AIPrep | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const notesRef = useRef<HTMLTextAreaElement>(null);
  const contact = contacts[activeIndex] || null;
  const activeContacts = useMemo(() => contacts.filter(c => !session.completedIds.includes(c.id)), [contacts, session.completedIds]);

  // Load AI prep
  const loadAiPrep = useCallback(async () => {
    if (!contact) return;
    setAiLoading(true);
    try {
      const prep = await generateAIPrep(contact);
      setAiPrep(prep);
    } finally {
      setAiLoading(false);
    }
  }, [contact?.id]);

  useEffect(() => { loadAiPrep(); }, [contact?.id]);
  useEffect(() => { saveSession({ ...session, currentIndex: activeIndex }); }, [session, activeIndex]);
  useEffect(() => { if (contact) setNotes(session.notesByContact[contact.id] || ''); }, [contact?.id]);
  
  useEffect(() => {
    if (!callStart) return;
    const t = setInterval(() => setCallDuration(Math.floor((Date.now() - callStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [callStart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'c') { e.preventDefault(); handleCall(); }
      if (k === 's') { e.preventDefault(); handleSkip(); }
      if (k === 'd') { e.preventDefault(); handleMeeting(); }
      if (k === 'n') { e.preventDefault(); notesRef.current?.focus(); }
      if (k === 'arrowdown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, contacts.length - 1)); }
      if (k === 'arrowup') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [contacts.length, isInCall]);

  const handleCall = useCallback(() => {
    if (!contact) return;
    if (!isInCall) {
      setIsInCall(true);
      setCallStart(Date.now());
      setSession(s => ({ ...s, stats: { ...s.stats, calls: s.stats.calls + 1 } }));
      window.location.href = `tel:${contact.phone.replace(/\s/g, '')}`;
    } else {
      endCall('connected');
    }
  }, [contact, isInCall]);

  const endCall = useCallback((outcome: string) => {
    if (callStart) {
      const dur = Math.floor((Date.now() - callStart) / 1000);
      setSession(s => ({
        ...s,
        stats: { ...s.stats, talkTime: s.stats.talkTime + dur, connected: outcome === 'connected' ? s.stats.connected + 1 : s.stats.connected },
      }));
    }
    setIsInCall(false);
    setCallStart(null);
    setCallDuration(0);
  }, [callStart]);

  const handleSkip = useCallback(() => {
    if (isInCall) endCall('no-answer');
    setActiveIndex(i => (i + 1) % contacts.length);
  }, [isInCall, contacts.length, endCall]);

  const handleMeeting = useCallback(() => {
    if (!contact) return;
    setSession(s => ({ ...s, stats: { ...s.stats, meetings: s.stats.meetings + 1 }, completedIds: [...s.completedIds, contact.id] }));
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
    if (isInCall) endCall('connected');
    setActiveIndex(i => Math.min(i + 1, contacts.length - 1));
  }, [contact, isInCall, contacts.length, endCall]);

  const handleNotInterested = useCallback(() => {
    if (!contact) return;
    setSession(s => ({ ...s, completedIds: [...s.completedIds, contact.id] }));
    if (isInCall) endCall('connected');
    setActiveIndex(i => Math.min(i + 1, contacts.length - 1));
  }, [contact, isInCall, contacts.length, endCall]);

  const saveNotes = useCallback(() => {
    if (contact) setSession(s => ({ ...s, notesByContact: { ...s.notesByContact, [contact.id]: notes } }));
  }, [contact, notes]);

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
            <span className="queue-count">{activeContacts.length}</span>
          </div>
          <div className="queue-list">
            {contactsLoading ? (
              <div className="queue-loading">Loading contacts...</div>
            ) : (
              contacts.map((c, i) => (
                <ContactRow key={c.id} contact={c} isActive={i === activeIndex} onClick={() => setActiveIndex(i)} />
              ))
            )}
          </div>
          <div className="queue-footer">
            <span className="api-status">{isSupabaseConfigured ? '● Connected' : '○ Demo Mode'}</span>
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
                <a href={`tel:${contact.phone}`} className="phone">{contact.phone}</a>
                {contact.email && <a href={`mailto:${contact.email}`} className="email">{contact.email}</a>}
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
                  placeholder="Add notes..."
                />
              </div>
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
        <AIPrepPanel prep={aiPrep} isLoading={aiLoading} onRefresh={loadAiPrep} />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="shortcuts">
          <span><kbd>C</kbd> Call</span>
          <span><kbd>S</kbd> Skip</span>
          <span><kbd>D</kbd> Meeting</span>
          <span><kbd>N</kbd> Notes</span>
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
    </div>
  );
}

export default DialerApp;
