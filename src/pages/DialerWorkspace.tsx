import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Flame,
  PhoneCall,
  PlayCircle,
  Sparkles,
  StopCircle,
  Wand2,
} from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi } from '../utils/echoApi';
import { dialViaTelLink, getExtensionStatus, listenToExtension, requestExtensionDial, type ExtensionStatus } from '../utils/extensionBridge';

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
  const [queueOpen, setQueueOpen] = useState(false);
  const [queuePage, setQueuePage] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [disposition, setDisposition] = useState(DISPOSITIONS[0].id);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rightMode, setRightMode] = useState<'next' | 'intel'>('next');
  const [intelTab, setIntelTab] = useState<'whisper' | 'coaching' | 'battle' | 'packs'>('whisper');
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>(() => getExtensionStatus());
  const [lastCaption, setLastCaption] = useState('');
  const [liveCoachingEnabled, setLiveCoachingEnabled] = useState(false);
  const [coachTip, setCoachTip] = useState('');
  const [whisperInput, setWhisperInput] = useState('');
  const [whisper, setWhisper] = useState<any | null>(null);
  const [battleCard, setBattleCard] = useState<any | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const transcriptRef = useRef<Array<{ text: string; ts: number }>>([]);
  const lastCoachAtRef = useRef<number>(0);

  useEffect(() => {
    if (!isCalling) return;
    const timer = window.setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isCalling]);

  useEffect(() => {
    const unsub = listenToExtension({
      onStatus: (s) => setExtensionStatus(s),
      onMeetCaption: (chunk) => {
        setLastCaption(chunk.text);
        transcriptRef.current = [...transcriptRef.current, { text: chunk.text, ts: chunk.captured_at }].slice(-24);
      },
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeContact) setQueueOpen(true);
  }, [activeContact]);

  useEffect(() => {
    setQueuePage(0);
  }, [search]);

  useEffect(() => {
    setDisposition(DISPOSITIONS[0].id);
  }, [activeContact?.id]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const term = search.toLowerCase();
    return contacts.filter((c) =>
      [c.name, c.company, c.title].filter(Boolean).some((val) => val?.toLowerCase().includes(term)),
    );
  }, [contacts, search]);

  const activeIndex = filteredContacts.findIndex((c) => c.id === activeContact?.id);
  const nextContact = activeIndex >= 0 ? filteredContacts[activeIndex + 1] : null;

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const safeQueuePage = Math.min(queuePage, totalPages - 1);
  const pagedContacts = filteredContacts.slice(safeQueuePage * pageSize, safeQueuePage * pageSize + pageSize);

  const stepIndex = !activeContact
    ? 0
    : status?.startsWith('Logged:')
      ? 3
      : isCalling
        ? 1
        : notes.trim()
          ? 2
          : 1;

  const handleSelect = (id: string) => {
    setActiveContactId(id);
    setSeconds(0);
    setIsCalling(false);
    setStatus(null);
    setWhisper(null);
    setBattleCard(null);
    setCoachTip('');
  };

  const startCall = async () => {
    if (!activeContact) return;
    if (isCalling) return;
    const phone = activeContact.phone || '';
    if (!phone.trim()) {
      setStatus('Missing phone number for this lead.');
      return;
    }

    setStatus(null);
    // 1) Prefer extension dial if connected
    const dialRes = await requestExtensionDial(
      { phone, contact: { id: activeContact.id, name: activeContact.name, company: activeContact.company } },
      900,
    );
    if (!dialRes.ok) {
      // 2) Fallback to tel: link
      dialViaTelLink(phone);
    }

    setIsCalling(true);
    setSeconds(0);
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

  const runWhisper = async () => {
    if (!activeContact) return;
    const text = whisperInput.trim();
    if (!text) return;
    setAiBusy(true);
    setStatus(null);
    try {
      const res = await echoApi.whisper.objection({ contact_id: activeContact.id, prospect_text: text });
      setWhisper(res);
      setRightMode('intel');
      setIntelTab('whisper');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Whisper failed');
    } finally {
      setAiBusy(false);
    }
  };

  const runBattleCard = async () => {
    if (!activeContact) return;
    setAiBusy(true);
    setStatus(null);
    try {
      const res = await echoApi.ai.sectorBattleCard({
        companyName: activeContact.company || activeContact.name,
        personTitle: activeContact.title,
      });
      setBattleCard(res);
      setRightMode('intel');
      setIntelTab('battle');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Battle card failed');
    } finally {
      setAiBusy(false);
    }
  };

  useEffect(() => {
    if (!liveCoachingEnabled) return;
    const now = Date.now();
    if (now - lastCoachAtRef.current < 9000) return;
    if (transcriptRef.current.length < 2) return;
    lastCoachAtRef.current = now;

    const run = async () => {
      setAiBusy(true);
      try {
        const transcriptWindow = transcriptRef.current.slice(-12).map((x) => `prospect: ${x.text}`);
        const res = await echoApi.ai.spinNext({
          stage: 'situation',
          mode: 'live',
          transcriptWindow,
          recap: '',
          dealState: '',
          strict: true,
        });
        const say = res?.output?.say_next || res?.say_next || res?.say_next || '';
        const whisper = res?.output?.coach_whisper || res?.coach_whisper || '';
        setCoachTip(whisper || say || '');
      } catch {
        // ignore coaching errors in live mode
      } finally {
        setAiBusy(false);
      }
    };

    void run();
  }, [lastCaption, liveCoachingEnabled]);

  return (
    <div className="workspace" data-testid="demo-workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Contacts ready</h2>
          </div>
          <button
            className="btn ghost"
            onClick={() => setQueueOpen((prev) => !prev)}
            aria-expanded={queueOpen}
            type="button"
          >
            {queueOpen ? 'Hide' : 'Show'} <ChevronDown size={14} className={queueOpen ? 'chev open' : 'chev'} />
          </button>
        </div>

        {!queueOpen && (
          <div className="queue-summary">
            <div className="chip-row">
              <span className="pill subtle">{filteredContacts.length} leads</span>
              <span className="pill subtle">{activeContact ? 'Selected' : 'Pick one'}</span>
            </div>
            <div className="muted text-sm">
              {nextContact
                ? `Up next: ${nextContact.name}${nextContact.company ? ` · ${nextContact.company}` : ''}`
                : filteredContacts.length
                  ? 'Queue ready'
                  : 'No leads loaded'}
            </div>
            <div className="button-row">
              <button className="btn outline" onClick={() => setQueueOpen(true)} type="button">
                Show queue
              </button>
              <button
                className="btn ghost"
                onClick={() => nextContact && setActiveContactId(nextContact.id)}
                disabled={!nextContact}
                type="button"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {queueOpen && (
          <>
            <div className="search-box">
              <input
                placeholder="Search company, name, title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="list paged">
              {isLoading && <div className="muted">Loading contacts...</div>}
              {!isLoading && filteredContacts.length === 0 && (
                <div className="muted">No contacts found. Connect Pipedrive and refresh.</div>
              )}
              {pagedContacts.map((contact) => {
                const active = contact.id === activeContact?.id;
                return (
                  <button
                    key={contact.id}
                    className={`list-item ${active ? 'active' : ''}`}
                    onClick={() => handleSelect(contact.id)}
                    type="button"
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

            <div className="pager">
              <button
                className="btn ghost"
                onClick={() => setQueuePage((p) => Math.max(0, p - 1))}
                disabled={safeQueuePage === 0}
                type="button"
              >
                Prev
              </button>
              <div className="muted text-sm">
                Page {safeQueuePage + 1} / {totalPages}
              </div>
              <button
                className="btn ghost"
                onClick={() => setQueuePage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safeQueuePage >= totalPages - 1}
                type="button"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Live call</p>
            <h2>{activeContact?.name || 'Select a lead'}</h2>
            <p className="muted">
              {activeContact?.title || 'Role'} {activeContact?.company ? `· ${activeContact.company}` : ''}
            </p>
          </div>
          <div className="call-metrics">
            <span className="pill warning">{formatTime(seconds)}</span>
            <div className="muted text-sm">
              {stats.callsToday} calls · {stats.connectRate}% connect
            </div>
          </div>
        </div>

        <ol className="stepper" aria-label="Workflow">
          {['Select', 'Call', 'Notes', 'Log'].map((label, idx) => (
            <li key={label} className={`step ${idx === stepIndex ? 'active' : ''} ${idx < stepIndex ? 'done' : ''}`}>
              <span className="step-dot" aria-hidden="true" />
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ol>

	        <div className="call-controls">
	          <button
	            className="btn primary"
	            onClick={() => void startCall()}
	            disabled={!activeContact || isCalling}
	            type="button"
	          >
	            <PlayCircle size={16} /> Start
	          </button>
          <button className="btn ghost" onClick={() => setIsCalling(false)} disabled={!isCalling} type="button">
            <StopCircle size={16} /> Stop
          </button>
	          <div className="muted flex gap-2 items-center">
	            <Clock3 size={14} />
	            {isCalling ? 'On call' : 'Idle'}
	          </div>
            <span className={`pill subtle`}>Ext: {extensionStatus.connected ? 'on' : 'off'}</span>
	        </div>

        <div className="split">
          <div className="panel soft">
            <div className="panel-head tight">
              <span className="eyebrow">Call notes</span>
              <span className="muted">{notes.length} chars</span>
            </div>
            <textarea
              className="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key moments, objections, commitments..."
            />
            <div className="action-row">
              <select value={disposition} onChange={(e) => setDisposition(e.target.value)} disabled={!activeContact}>
                {DISPOSITIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                className="btn outline"
                onClick={() => void handleLog(disposition)}
                disabled={!activeContact || saving}
                type="button"
              >
                <PhoneCall size={14} /> Log
              </button>
            </div>
            <div className="quick-row" aria-label="Quick dispositions">
              {['connected', 'callback', 'no-answer'].map((id) => (
                <button
                  key={id}
                  className="btn ghost sm"
                  onClick={() => void handleLog(id)}
                  disabled={!activeContact || saving}
                  type="button"
                >
                  {DISPOSITIONS.find((d) => d.id === id)?.label}
                </button>
              ))}
            </div>
            {status && <div className="status-line">{status}</div>}
          </div>
        </div>
      </div>

	      <div className="panel stack">
	        <div className="panel-head">
	          <div className="button-row">
	            <button
	              className={`btn ghost sm ${rightMode === 'next' ? 'active' : ''}`}
	              onClick={() => setRightMode('next')}
	              type="button"
	            >
	              Next
	            </button>
	            <button
	              className={`btn ghost sm ${rightMode === 'intel' ? 'active' : ''}`}
	              onClick={() => setRightMode('intel')}
	              type="button"
	            >
	              Intel
	            </button>
	          </div>
	          <span className="pill subtle">{aiBusy ? 'Working…' : 'Ready'}</span>
	        </div>
	        {rightMode === 'next' && (
	          <div className="panel soft">
	            <p className="eyebrow">Next</p>
	            <h3>{nextContact ? nextContact.name : 'Queue end'}</h3>
	            {nextContact && (
	              <p className="muted">
	                {nextContact.title || '—'} {nextContact.company ? `· ${nextContact.company}` : ''}
	              </p>
	            )}
	            <div className="button-row">
	              <button
	                className="btn outline"
	                onClick={() => nextContact && setActiveContactId(nextContact.id)}
	                disabled={!nextContact}
	                type="button"
	              >
	                Next <ArrowRight size={14} />
	              </button>
	            </div>
	            <div className="muted text-xs">No scrolling: only the next lead + one action.</div>
	          </div>
	        )}
	        {rightMode === 'intel' && (
	          <div className="panel soft">
	            <p className="eyebrow">Intel</p>
	            <div className="button-row wrap">
	              <button className={`btn ghost sm ${intelTab === 'whisper' ? 'active' : ''}`} onClick={() => setIntelTab('whisper')} type="button">
	                Whisper
	              </button>
	              <button className={`btn ghost sm ${intelTab === 'coaching' ? 'active' : ''}`} onClick={() => setIntelTab('coaching')} type="button">
	                Coaching
	              </button>
	              <button className={`btn ghost sm ${intelTab === 'battle' ? 'active' : ''}`} onClick={() => setIntelTab('battle')} type="button">
	                Battle
	              </button>
	              <button className={`btn ghost sm ${intelTab === 'packs' ? 'active' : ''}`} onClick={() => setIntelTab('packs')} type="button">
	                Packs
	              </button>
	            </div>

	            {intelTab === 'whisper' && (
	              <>
	                <div className="panel-head tight">
	                  <span className="eyebrow">Whisper</span>
	                  <button className="btn outline sm" onClick={() => void runWhisper()} disabled={!activeContact || aiBusy} type="button">
	                    <Wand2 size={14} /> Run
	                  </button>
	                </div>
	                <textarea
	                  className="notes"
	                  value={whisperInput}
	                  onChange={(e) => setWhisperInput(e.target.value)}
	                  placeholder="Paste objection (exact words)."
	                />
	                {whisper && <div className="muted text-sm">{whisper.objection_id} · {whisper.core_fear} · {whisper.confidence}</div>}
	                {whisper?.whisper?.next_step?.text && (
	                  <div className="coach-box focus">
	                    <p className="say-next">{whisper.whisper.next_step.text}</p>
	                  </div>
	                )}
	              </>
	            )}

	            {intelTab === 'coaching' && (
	              <>
	                <div className="panel-head tight">
	                  <span className="eyebrow">Live coaching</span>
	                  <button className="btn ghost sm" onClick={() => setLiveCoachingEnabled((v) => !v)} type="button">
	                    {liveCoachingEnabled ? 'On' : 'Off'}
	                  </button>
	                </div>
	                <div className="muted text-xs">Source: Chrome extension → Google Meet captions.</div>
	                {!extensionStatus.capabilities.meetCaptions && (
	                  <div className="muted text-sm">Captions not connected (check Settings → Chrome Extension).</div>
	                )}
	                {lastCaption && <div className="muted text-sm">Last: {lastCaption}</div>}
	                {coachTip && (
	                  <div className="coach-box focus">
	                    <p className="say-next">{coachTip}</p>
	                  </div>
	                )}
	              </>
	            )}

	            {intelTab === 'battle' && (
	              <>
	                <div className="panel-head tight">
	                  <span className="eyebrow">Battle card</span>
	                  <button className="btn ghost sm" onClick={() => void runBattleCard()} disabled={!activeContact || aiBusy} type="button">
	                    <Flame size={14} /> Gen
	                  </button>
	                </div>
	                {battleCard ? (
	                  <div className="coach-box">
	                    <div className="tagline">
	                      {battleCard.detected_sector} {battleCard.sector_emoji}
	                    </div>
	                    <p className="muted text-sm">{battleCard.strategy_insight}</p>
	                  </div>
	                ) : (
	                  <div className="muted text-sm">Generate when needed (hypothesis-only).</div>
	                )}
	              </>
	            )}

	            {intelTab === 'packs' && (
	              <>
	                <div className="panel-head tight">
	                  <span className="eyebrow">Packs</span>
	                </div>
	                <div className="muted text-sm">Evidence-gated: if missing, pack becomes validation questions only.</div>
	                <div className="button-row wrap">
	                  <button
	                    className="btn outline"
	                    onClick={() =>
	                      activeContact &&
	                      void echoApi.packs.generate({ contact_id: activeContact.id, include: ['cold_call_prep_card'], language: 'cs' })
	                    }
	                    disabled={!activeContact || aiBusy}
	                    type="button"
	                  >
	                    <Sparkles size={14} /> Cold call
	                  </button>
	                  <button
	                    className="btn ghost"
	                    onClick={() =>
	                      activeContact &&
	                      void echoApi.packs.generate({ contact_id: activeContact.id, include: ['meeting_booking_pack'], language: 'cs' })
	                    }
	                    disabled={!activeContact || aiBusy}
	                    type="button"
	                  >
	                    Meeting
	                  </button>
	                </div>
	              </>
	            )}
	          </div>
	        )}
	      </div>
    </div>
  );
}
