import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  FileText,
  Grid3x3,
  Linkedin,
  LogOut,
  Mic,
  MicOff,
  PhoneCall,
} from 'lucide-react';
import { supabase as supabaseClient } from '../utils/supabase/client';

interface Contact {
  id: string;
  name: string;
  role?: string;
  company: string;
  phone: string;
  aiSummary?: string;
  lastTouch?: string;
  source?: string;
  location?: string;
}

export function LiveCampaigns() {
  const [activeTab, setActiveTab] = useState<'script' | 'notes'>('script');
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [queueContacts, setQueueContacts] = useState<Contact[]>([]);
  const [queueFilter, setQueueFilter] = useState<'priority' | 'follow-up' | 'cold'>('priority');
  const [queueSearch, setQueueSearch] = useState('');
  const [callDuration, setCallDuration] = useState('00:00');
  const [dailyGoal, setDailyGoal] = useState({ current: 0, target: 60 });
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scriptStep, setScriptStep] = useState(1);
  const [notes, setNotes] = useState('');
  const [scriptSection, setScriptSection] = useState<'opener' | 'pitch' | 'closing'>('opener');

  useEffect(() => {
    loadCampaignData();
    loadDailyStats();
  }, []);

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setCallDuration((prev) => {
          const [min, sec] = prev.split(':').map(Number);
          const totalSec = min * 60 + sec + 1;
          const newMin = Math.floor(totalSec / 60);
          const newSec = totalSec % 60;
          return `${String(newMin).padStart(2, '0')}:${String(newSec).padStart(2, '0')}`;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  async function loadCampaignData() {
    try {
      if (!supabaseClient) {
        setLoading(false);
        return;
      }

      const { data: contacts } = await supabaseClient
        .from('contacts')
        .select('*')
        .eq('status', 'queued')
        .limit(8);

      if (contacts && contacts.length > 0) {
        setQueueContacts(contacts);
        setCurrentContact(contacts[0]);
      }
    } catch (error) {
      console.error('Failed to load campaign data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDailyStats() {
    try {
      if (!supabaseClient) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: calls } = await supabaseClient.from('calls').select('*').gte('created_at', today);

      if (calls) {
        setDailyGoal({ current: calls.length, target: 60 });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  const handleStartCall = () => {
    setIsLive(true);
    setCallDuration('00:00');
  };

  const handleEndCall = () => {
    setIsLive(false);
  };

  const progress = useMemo(() => {
    if (dailyGoal.target <= 0) return 0;
    return Math.max(0, Math.min(1, dailyGoal.current / dailyGoal.target));
  }, [dailyGoal.current, dailyGoal.target]);

  const fallbackQueue: Contact[] = [
    { id: 'q1', name: 'John Doe', role: 'VP of Sales', company: 'TechCorp', phone: '+420 777 111 222', source: 'LinkedIn', location: 'Prague, CZ' },
    { id: 'q2', name: 'Mia Novak', role: 'Head of RevOps', company: 'Cloudwise', phone: '+420 777 111 333', source: 'Inbound', location: 'Brno, CZ' },
    { id: 'q3', name: 'Peter Lane', role: 'CRO', company: 'Launchly', phone: '+420 777 111 444', source: 'Outbound', location: 'Vienna, AT' },
    { id: 'q4', name: 'Sara Holt', role: 'VP Growth', company: 'Nextframe', phone: '+420 777 111 555', source: 'Referral', location: 'Berlin, DE' },
  ];

  const baseQueue = queueContacts.length ? queueContacts : fallbackQueue;
  const visibleQueue = baseQueue.filter((contact) => {
    const term = queueSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      contact.name.toLowerCase().includes(term) ||
      contact.company.toLowerCase().includes(term) ||
      (contact.role || '').toLowerCase().includes(term)
    );
  });

  const filteredQueue = visibleQueue.filter((contact) => {
    if (queueFilter === 'priority') return true;
    if (queueFilter === 'follow-up') return Boolean(contact.lastTouch);
    return !contact.lastTouch;
  });

  const getScore = (contact: Contact) => {
    const base = (contact.name.length * 7 + contact.company.length * 3) % 30;
    return 70 + base;
  };

  const localTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const activeContact = currentContact ?? fallbackQueue[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full figma-grid-bg">
        <div className="neo-panel-shadow px-6 py-5 text-center bg-white">
          <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-black uppercase tracking-wider text-sm text-black">Načítání kontaktů…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full figma-grid-bg font-sans text-black">
      <div className="figma-shell w-full space-y-5">
        {/* Session Bar */}
        <div className="neo-panel bg-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-3 font-mono font-bold text-sm" onClick={handleEndCall}>
              <LogOut size={16} />
              EJECT_SESSION
            </button>

            <div className="w-px bg-black" style={{ height: 24 }} />

            <div className="flex items-center gap-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">GOAL PROGRESS</div>
              <div className="w-40 border-2 border-black bg-white" style={{ height: 10 }}>
                <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'var(--neo-yellow)' }} />
              </div>
              <div className="font-mono font-bold">
                {dailyGoal.current}/{dailyGoal.target}
              </div>
            </div>
          </div>

          {isLive ? (
            <div className="neo-tag neo-bg-red" style={{ color: 'white' }}>
              <span className="mr-2" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'white' }} />
                REC
              </span>
              • {callDuration}
            </div>
          ) : (
            <button className="neo-btn neo-bg-yellow px-5 py-2 text-sm" onClick={handleStartCall}>
              START CALL
            </button>
          )}
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Lead Queue */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="neo-panel-shadow bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="neo-tag neo-tag-yellow">LEAD QUEUE</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {(['priority', 'follow-up', 'cold'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setQueueFilter(filter)}
                    className="neo-btn px-3 py-1 text-xs font-black uppercase"
                    style={{
                      background: queueFilter === filter ? 'var(--neo-yellow)' : 'white',
                    }}
                  >
                    {filter === 'follow-up' ? 'FOLLOW-UP' : filter.toUpperCase()}
                  </button>
                ))}
              </div>
              <input
                className="neo-input w-full px-3 py-2 text-sm font-mono"
                placeholder="Search leads..."
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredQueue.map((contact) => {
                const score = getScore(contact);
                const isActive = activeContact?.id === contact.id;
                return (
                  <button
                    key={contact.id}
                    onClick={() => setCurrentContact(contact)}
                    className="neo-panel-shadow w-full text-left p-4"
                    style={{
                      background: isActive ? 'var(--neo-yellow)' : 'white',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-black text-sm">{contact.name}</div>
                        <div className="text-xs font-mono uppercase opacity-70">{contact.company}</div>
                      </div>
                      <div className="border-2 border-black px-2 py-1 text-[10px] font-bold uppercase">
                        {score}/100
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono uppercase opacity-70">
                      <span>{contact.source || 'Priority'}</span>
                      <span>{contact.location || 'HQ'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Active Call Interface */}
          <section className="col-span-12 lg:col-span-6 space-y-4">
            <div className="neo-panel-shadow bg-white p-4 flex items-start justify-between gap-4">
              <div>
                <div className="neo-display text-4xl font-black leading-none">{activeContact.name}</div>
                <div className="font-mono font-bold uppercase text-xs opacity-70 mt-1">
                  {activeContact.role || 'VP of Sales'} · {activeContact.company}
                </div>
                <div className="font-mono text-xs font-bold uppercase opacity-60 mt-2">Local Time: {localTime}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="neo-btn bg-white px-3 py-2 text-xs font-black uppercase">Open CRM</button>
                <button className="neo-btn bg-white px-3 py-2 text-xs font-black uppercase flex items-center gap-2">
                  <Linkedin size={14} /> LinkedIn
                </button>
              </div>
            </div>

            <div className="neo-panel-shadow bg-white overflow-hidden">
              <div className="grid grid-cols-2 border-b-2 border-black">
                <Tab active={activeTab === 'script'} label="SCRIPT" icon={<FileText size={16} />} onClick={() => setActiveTab('script')} />
                <Tab active={activeTab === 'notes'} label="NOTES" icon={<Mic size={16} />} onClick={() => setActiveTab('notes')} />
              </div>

              <div className="p-5 space-y-5">
                {activeTab === 'script' && (
                  <>
                    <div className="flex items-center gap-2">
                      {(['opener', 'pitch', 'closing'] as const).map((section) => (
                        <button
                          key={section}
                          onClick={() => setScriptSection(section)}
                          className="neo-btn px-3 py-1 text-xs font-black uppercase"
                          style={{
                            background: scriptSection === section ? 'var(--neo-yellow)' : 'white',
                          }}
                        >
                          {section}
                        </button>
                      ))}
                    </div>

                    <div className="neo-panel-shadow bg-white p-5 relative">
                      <div className="neo-tag neo-tag-black" style={{ position: 'absolute', top: -2, left: -2 }}>
                        STEP {scriptStep}/3
                      </div>
                      <div className="neo-display font-black leading-snug mt-6" style={{ fontSize: '1.6rem', lineHeight: 1.25 }}>
                        {scriptSection === 'opener' &&
                          `“Viděl jsem vaši zprávu o expanzi, ${firstNameFromContact(activeContact.name)}. Jak momentálně řešíte onboarding nových obchodníků v regionu?”`}
                        {scriptSection === 'pitch' &&
                          '“Pomáháme týmům škálovat 3× rychleji díky automatizaci a AI prioritizaci leadů.”'}
                        {scriptSection === 'closing' &&
                          '“Dává smysl domluvit 15 minut, abych vám ukázal konkrétní workflow?”'}
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-4">
                        <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">
                          MISSION: UNCOVER PAIN POINTS REGARDING SPEED TO RAMP-UP.
                        </div>
                        <button
                          className="font-mono font-bold flex items-center gap-2"
                          onClick={() => setScriptStep((s) => Math.min(3, s + 1))}
                        >
                          NEXT <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <textarea
                      className="neo-panel w-full p-4 font-mono text-sm font-bold"
                      style={{ minHeight: 220 }}
                      placeholder="Notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <button className="neo-btn neo-bg-yellow px-5 py-3 text-sm">SAVE NOTES</button>
                  </div>
                )}
              </div>
            </div>

            <div className="neo-panel-shadow bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  className="neo-btn px-6 py-3 text-sm font-black uppercase flex items-center gap-2"
                  style={{ background: isLive ? 'black' : 'var(--neo-yellow)', color: isLive ? 'white' : 'black' }}
                  onClick={isLive ? handleEndCall : handleStartCall}
                >
                  <PhoneCall size={18} /> {isLive ? 'END CALL' : 'DIAL'}
                </button>
                <div className="flex items-center gap-2">
                  <button className="neo-btn bg-white px-3 py-3">
                    {isLive ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button className="neo-btn bg-white px-3 py-3">
                    <Grid3x3 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="neo-btn bg-white px-4 py-3 text-xs font-black uppercase">Meeting Booked</button>
                <button className="neo-btn bg-white px-4 py-3 text-xs font-black uppercase">No Answer</button>
                <button className="neo-btn bg-white px-4 py-3 text-xs font-black uppercase">Gatekeeper</button>
                <button className="neo-btn bg-white px-4 py-3 text-xs font-black uppercase">Not Interested</button>
              </div>
            </div>
          </section>

          {/* Context Panel */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="neo-panel-shadow bg-white p-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70 mb-3">Quick Info</div>
              <div className="space-y-2 text-sm font-bold">
                <div>📞 {activeContact.phone || '+420 777 000 000'}</div>
                <div>
                  ✉️ {`${firstNameFromContact(activeContact.name).toLowerCase()}@${activeContact.company.toLowerCase()}.com`}
                </div>
                <div>📍 {activeContact.location || 'Prague, CZ'}</div>
              </div>
            </div>

            <div className="neo-panel-shadow bg-white p-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70 mb-3">History</div>
              <div className="space-y-3 text-sm font-bold">
                <div>
                  <div className="text-xs uppercase opacity-60">Yesterday</div>
                  Gatekeeper asked for callback after 2PM.
                </div>
                <div>
                  <div className="text-xs uppercase opacity-60">Last Week</div>
                  Opened sequence email #2.
                </div>
              </div>
            </div>

            <div className="neo-panel-shadow bg-white p-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70 mb-3">Tags</div>
              <div className="flex flex-wrap gap-2">
                {['Decision Maker', 'Budget Approved', 'Expansion'].map((tag) => (
                  <span key={tag} className="neo-tag" style={{ background: 'var(--neo-yellow)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Tab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 border-r-2 border-black flex items-center justify-center gap-3 font-mono font-bold uppercase tracking-wider"
      style={{
        background: active ? 'white' : '#f1f5f9',
        opacity: active ? 1 : 0.75,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function firstNameFromContact(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[0] || name;
}
