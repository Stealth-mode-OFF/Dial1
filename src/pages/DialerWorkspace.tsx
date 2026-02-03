import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Flame,
  PhoneCall,
  PlayCircle,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi } from '../utils/echoApi';

const DISPOSITIONS = [
  { id: 'connected', label: 'Connected' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'callback', label: 'Callback' },
  { id: 'not-interested', label: 'Not interested' },
  { id: 'no-answer', label: 'No answer' },
  { id: 'sent', label: 'Sent email' },
];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export function DialerWorkspace() {
  const { contacts, activeContact, setActiveContactId, logCall, stats, isLoading } = useSales();
  const [search, setSearch] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [battleCard, setBattleCard] = useState<any | null>(null);
  const [coachTip, setCoachTip] = useState<string>('');
  const [stage, setStage] = useState('situation');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isCalling) return;
    const timer = window.setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isCalling]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const term = search.toLowerCase();
    return contacts.filter((c) =>
      [c.name, c.company, c.title].filter(Boolean).some((val) => val?.toLowerCase().includes(term)),
    );
  }, [contacts, search]);

  const activeIndex = filteredContacts.findIndex((c) => c.id === activeContact?.id);
  const nextContact = activeIndex >= 0 ? filteredContacts[activeIndex + 1] : null;

  const handleSelect = (id: string) => {
    setActiveContactId(id);
    setBattleCard(null);
    setCoachTip('');
    setSeconds(0);
    setIsCalling(false);
    setStatus(null);
  };

  const handleLog = async (disposition: string) => {
    if (!activeContact) return;
    setSaving(true);
    setStatus(null);
    try {
      await logCall({
        contactId: activeContact.id,
        contactName: activeContact.name,
        companyName: activeContact.company || undefined,
        disposition,
        notes: notes.trim(),
        duration: seconds,
      });
      setStatus(`Logged: ${disposition}`);
      setIsCalling(false);
      setSeconds(0);
      setNotes('');
      if (nextContact) {
        setActiveContactId(nextContact.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log call';
      setStatus(message);
    } finally {
      setSaving(false);
    }
  };

  const fetchBattleCard = async () => {
    if (!activeContact) return;
    setAiLoading(true);
    setStatus(null);
    try {
      const card = await echoApi.ai.sectorBattleCard({
        companyName: activeContact.company || activeContact.name,
        personTitle: activeContact.title,
      });
      setBattleCard(card);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Battle card failed';
      setStatus(message);
    } finally {
      setAiLoading(false);
    }
  };

  const askCoach = async () => {
    setAiLoading(true);
    setStatus(null);
    try {
      const transcriptWindow = notes
        ? notes.split('\n').slice(-12).map((line) => `rep: ${line}`)
        : [`stage: ${stage}`, 'rep: Intro ready'];
      const res = await echoApi.ai.spinNext({
        stage,
        mode: 'live',
        transcriptWindow,
        recap: '',
        dealState: '',
      });
      const say = res?.output?.say_next || res?.say_next || 'Pause and ask one more question.';
      setCoachTip(say);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Coach is offline';
      setCoachTip(message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Contacts ready</h2>
          </div>
          <span className="pill subtle">{filteredContacts.length} leads</span>
        </div>

        <div className="search-box">
          <input
            placeholder="Search company, name, title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="list">
          {isLoading && <div className="muted">Loading contacts...</div>}
          {!isLoading && filteredContacts.length === 0 && (
            <div className="muted">No contacts found. Connect Pipedrive and refresh.</div>
          )}
          {filteredContacts.map((contact) => {
            const active = contact.id === activeContact?.id;
            return (
              <button
                key={contact.id}
                className={`list-item ${active ? 'active' : ''}`}
                onClick={() => handleSelect(contact.id)}
              >
                <div>
                  <div className="item-title">{contact.name}</div>
                  <div className="muted text-sm">
                    {contact.title || '—'} {contact.company ? `· ${contact.company}` : ''}
                  </div>
                </div>
                <div className="pill">{contact.status || 'queued'}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Live call</p>
            <h2>{activeContact?.name || 'Select a contact'}</h2>
            <p className="muted">
              {activeContact?.title || 'Role'} {activeContact?.company ? `· ${activeContact.company}` : ''}
            </p>
          </div>
          <div className="chip-row">
            <span className="pill">{stats.callsToday} calls today</span>
            <span className="pill">{stats.connectRate}% connect</span>
            <span className="pill warning">{formatTime(seconds)}</span>
          </div>
        </div>

        <div className="call-controls">
          <button
            className="btn primary"
            onClick={() => setIsCalling(true)}
            disabled={!activeContact || isCalling}
          >
            <PlayCircle size={16} /> Start
          </button>
          <button
            className="btn ghost"
            onClick={() => setIsCalling(false)}
            disabled={!isCalling}
          >
            <StopCircle size={16} /> Stop
          </button>
          <div className="muted flex gap-2 items-center">
            <Clock3 size={14} />
            {isCalling ? 'On call' : 'Idle'}
          </div>
        </div>

        <div className="split">
          <div className="panel soft">
            <div className="panel-head tight">
              <span className="eyebrow">Call notes</span>
              <span className="muted">{notes.length} chars</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key moments, objections, commitments..."
            />
            <div className="button-row wrap">
              {DISPOSITIONS.map((d) => (
                <button
                  key={d.id}
                  className="btn outline"
                  onClick={() => void handleLog(d.id)}
                  disabled={!activeContact || saving}
                >
                  <PhoneCall size={14} /> {d.label}
                </button>
              ))}
            </div>
            {status && <div className="status-line">{status}</div>}
          </div>

          <div className="panel soft">
            <div className="panel-head tight">
              <span className="eyebrow">AI help</span>
              <div className="flex gap-2">
                <select value={stage} onChange={(e) => setStage(e.target.value)}>
                  {['situation', 'problem', 'implication', 'need_payoff', 'close'].map((stage) => (
                    <option key={stage}>{stage}</option>
                  ))}
                </select>
                <button className="btn ghost" onClick={askCoach} disabled={aiLoading}>
                  <Sparkles size={14} /> Ask coach
                </button>
                <button className="btn ghost" onClick={fetchBattleCard} disabled={aiLoading}>
                  <Flame size={14} /> Battle card
                </button>
              </div>
            </div>
            <div className="coach-box">
              <p className="muted text-sm">Coach</p>
              <p>{coachTip || 'Ask the coach to get the next best line.'}</p>
            </div>
            <div className="coach-box">
              <p className="muted text-sm">Battle card</p>
              {battleCard ? (
                <div className="battle-grid">
                  <div className="tagline">
                    {battleCard.detected_sector} {battleCard.sector_emoji}
                  </div>
                  <p className="muted">{battleCard.strategy_insight}</p>
                  <ul className="list-disc ml-4 mt-2">
                    {(battleCard.objections || []).map((item: any, idx: number) => (
                      <li key={idx}>
                        <strong>{item.trigger}:</strong> {item.rebuttal}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="muted">Generate a sector card to see objections.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Next</p>
            <h3>{nextContact ? nextContact.name : 'Queue end'}</h3>
            {nextContact && (
              <p className="muted">
                {nextContact.title || '—'} {nextContact.company ? `· ${nextContact.company}` : ''}
              </p>
            )}
          </div>
          <button
            className="btn ghost"
            onClick={() => nextContact && setActiveContactId(nextContact.id)}
            disabled={!nextContact}
          >
            Next <ArrowRight size={14} />
          </button>
        </div>
        <div className="panel soft">
          <p className="eyebrow">Checklist</p>
          <div className="grid checklist">
            {['Confirm need', 'Surface metrics', 'Offer next step', 'Send recap'].map((item) => (
              <div key={item} className="chip">
                <ChevronDown size={14} /> {item}
              </div>
            ))}
          </div>
          <div className="muted text-xs mt-3">
            Tip: push for concrete time/date before hanging up.
          </div>
        </div>
      </div>
    </div>
  );
}
