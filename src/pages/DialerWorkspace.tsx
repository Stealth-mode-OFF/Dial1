import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Copy,
  Flame,
  PhoneCall,
  PlayCircle,
  StopCircle,
  Wand2,
} from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi, type PrecallContextResult } from '../utils/echoApi';
import { dialViaTelLink, getExtensionStatus, listenToExtension, requestExtensionDial, type ExtensionStatus } from '../utils/extensionBridge';
import { buildFunctionUrl, functionsBase, isSupabaseConfigured, publicAnonKey } from '../utils/supabase/info';

type TranscriptEvent = {
  id: string;
  ts: number;
  text: string;
  speaker?: string;
  speakerName?: string;
};

const STORAGE_MEET_CALL_IDS = 'echo.meet_call_ids';

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
  const {
    contacts,
    visibleContacts,
    showCompletedLeads,
    setShowCompletedLeads,
    activeContact,
    setActiveContactId,
    logCall,
    stats,
    isLoading,
  } = useSales();
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
  const [meetCallId, setMeetCallId] = useState('');
  const [meetActive, setMeetActive] = useState(false);
  const [meetEvents, setMeetEvents] = useState<TranscriptEvent[]>([]);
  const [meetError, setMeetError] = useState<string | null>(null);
  const [precallLoading, setPrecallLoading] = useState(false);
  const [precallError, setPrecallError] = useState<string | null>(null);
  const [precallData, setPrecallData] = useState<PrecallContextResult | null>(null);
  const transcriptRef = useRef<Array<{ text: string; ts: number }>>([]);
  const lastCoachAtRef = useRef<number>(0);
  const meetLastTsRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeContact?.id) {
      setMeetCallId('');
      setMeetActive(false);
      setMeetEvents([]);
      meetLastTsRef.current = null;
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_MEET_CALL_IDS);
      const parsed = raw ? JSON.parse(raw) : {};
      const stored = parsed?.[activeContact.id];
      setMeetCallId(stored || '');
      setMeetActive(false);
      setMeetEvents([]);
      meetLastTsRef.current = null;
    } catch {
      setMeetCallId('');
    }
  }, [activeContact?.id]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return visibleContacts;
    const term = search.toLowerCase();
    return visibleContacts.filter((c) =>
      [c.name, c.company, c.title].filter(Boolean).some((val) => val?.toLowerCase().includes(term)),
    );
  }, [visibleContacts, search]);

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
    setPrecallError(null);
    setPrecallData(null);
  };

  const loadPrecall = async (contactId: string, ttlHours = 24) => {
    if (!isSupabaseConfigured) return;
    setPrecallLoading(true);
    setPrecallError(null);
    try {
      const res = await echoApi.precall.context({
        contact_id: contactId,
        language: 'cs',
        include: ['cold_call_prep_card', 'meeting_booking_pack', 'spin_demo_pack'],
        ttl_hours: ttlHours,
        timeline: { activities: 15, notes: 10, deals: 3 },
      });
      setPrecallData(res);
    } catch (e) {
      setPrecallData(null);
      setPrecallError(e instanceof Error ? e.message : 'Pre-call context failed');
    } finally {
      setPrecallLoading(false);
    }
  };

  useEffect(() => {
    if (!activeContact?.id) {
      setPrecallData(null);
      setPrecallError(null);
      setPrecallLoading(false);
      return;
    }

    let cancelled = false;
    setPrecallLoading(true);
    setPrecallError(null);

    echoApi.precall
      .context({
        contact_id: activeContact.id,
        language: 'cs',
        include: ['cold_call_prep_card', 'meeting_booking_pack', 'spin_demo_pack'],
        ttl_hours: 24,
        timeline: { activities: 15, notes: 10, deals: 3 },
      })
      .then((res) => {
        if (cancelled) return;
        setPrecallData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setPrecallData(null);
        setPrecallError(e instanceof Error ? e.message : 'Pre-call context failed');
      })
      .finally(() => {
        if (cancelled) return;
        setPrecallLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeContact?.id]);

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

  const saveMeetCallId = (nextValue?: string) => {
    if (typeof window === 'undefined') return;
    if (!activeContact?.id) return;
    const value = (nextValue ?? meetCallId).trim().toUpperCase();
    setMeetCallId(value);
    try {
      const raw = window.localStorage.getItem(STORAGE_MEET_CALL_IDS);
      const parsed = raw ? JSON.parse(raw) : {};
      if (value) parsed[activeContact.id] = value;
      else delete parsed[activeContact.id];
      window.localStorage.setItem(STORAGE_MEET_CALL_IDS, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  };

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMeetError('Copied to clipboard.');
      window.setTimeout(() => setMeetError(null), 1600);
    } catch {
      setMeetError('Copy failed.');
    }
  };

  const handleMeetConnect = () => {
    const value = meetCallId.trim().toUpperCase();
    if (!value || value.length < 8) {
      setMeetError('Call ID musí mít alespoň 8 znaků.');
      return;
    }
    if (!isSupabaseConfigured) {
      setMeetError('Supabase není nakonfigurovaný.');
      return;
    }
    saveMeetCallId(value);
    setMeetEvents([]);
    meetLastTsRef.current = null;
    setMeetActive(true);
    setMeetError(null);
  };

  const handleMeetStop = () => {
    setMeetActive(false);
  };

  useEffect(() => {
    if (!meetActive || !meetCallId.trim() || !isSupabaseConfigured) return;
    let mounted = true;

    const fetchTranscript = async () => {
      const since = meetLastTsRef.current;
      const url = buildFunctionUrl(`meet/transcript/${meetCallId.trim().toUpperCase()}${since ? `?since=${since}` : ''}`);
      if (!url) return;
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'x-echo-user': meetCallId.trim().toUpperCase(),
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: TranscriptEvent[] = data.events || [];
        if (!incoming.length || !mounted) return;
        const last = incoming[incoming.length - 1];
        meetLastTsRef.current = last.ts;
        setMeetEvents((prev) => [...prev, ...incoming].slice(-120));
        incoming.forEach((event) => {
          transcriptRef.current = [...transcriptRef.current, { text: event.text, ts: event.ts }].slice(-24);
        });
        setLastCaption(last.text);
      } catch {
        // ignore polling errors
      }
    };

    const interval = window.setInterval(fetchTranscript, 2000);
    void fetchTranscript();
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [meetActive, meetCallId]);

  const handleLog = async (disposition: string) => {
    if (!activeContact) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await logCall({
        contactId: activeContact.id,
        contactName: activeContact.name,
        companyName: activeContact.company || undefined,
        disposition,
        notes: notes.trim(),
        duration: seconds,
      });
      const pd = res?.pipedrive;
      if (pd?.synced) {
        setStatus(`Logged: ${disposition} · Synced to Pipedrive${pd.activity_id ? ` (#${pd.activity_id})` : ''}`);
      } else if (pd) {
        setStatus(`Logged: ${disposition} · Pipedrive not synced`);
      } else {
        setStatus(`Logged: ${disposition}`);
      }
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

  const latestPipedriveTouch = useMemo(() => {
    const timeline = precallData?.pipedrive?.timeline;
    if (!timeline) return null;
    const candidates: Array<{ ts: number; label: string }> = [];
    for (const a of timeline.activities || []) {
      const ts = Date.parse((a.update_time || a.add_time || '') as string);
      if (Number.isFinite(ts)) candidates.push({ ts, label: `${a.type || 'activity'} · ${a.subject || '—'}` });
    }
    for (const n of timeline.notes || []) {
      const ts = Date.parse((n.update_time || n.add_time || '') as string);
      if (Number.isFinite(ts)) candidates.push({ ts, label: `note · ${String(n.content || '').slice(0, 80)}` });
    }
    for (const d of timeline.deals || []) {
      const ts = Date.parse((d as any).update_time || (d as any).add_time || '');
      if (Number.isFinite(ts)) candidates.push({ ts, label: `deal · ${d.title || '—'}` });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.ts - a.ts);
    const top = candidates[0];
    return { when: new Date(top.ts).toLocaleString(), label: top.label };
  }, [precallData]);

  const packPreview = useMemo(() => {
    if (!precallData?.pack) return null;
    const pack = precallData.pack as any;
    return {
      id: pack.id,
      created_at: pack.created_at,
      quality_report: pack.quality_report,
      approved_facts: Array.isArray(pack.approved_facts) ? pack.approved_facts.slice(0, 3) : [],
      hypotheses: Array.isArray(pack.hypotheses) ? pack.hypotheses.slice(0, 3) : [],
    };
  }, [precallData]);

  return (
    <div className="workspace" data-testid="demo-workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Contacts ready</h2>
          </div>
          <div className="button-row">
            <button
              className="btn ghost sm"
              onClick={() => setShowCompletedLeads(!showCompletedLeads)}
              type="button"
            >
              {showCompletedLeads ? 'Hide done' : 'Show done'}
            </button>
            <button
              className="btn ghost"
              onClick={() => setQueueOpen((prev) => !prev)}
              aria-expanded={queueOpen}
              type="button"
            >
              {queueOpen ? 'Hide' : 'Show'} <ChevronDown size={14} className={queueOpen ? 'chev open' : 'chev'} />
            </button>
          </div>
        </div>

        {!queueOpen && (
          <div className="queue-summary">
            <div className="chip-row">
              <span className="pill subtle">{filteredContacts.length} leads</span>
              {contacts.length !== filteredContacts.length && (
                <span className="pill subtle">{contacts.length - filteredContacts.length} done</span>
              )}
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
          <span className="muted flex gap-2 items-center">
            <Clock3 size={14} />
            {isCalling ? 'On call' : 'Idle'}
          </span>
          <span className="pill subtle">Ext: {extensionStatus.connected ? 'on' : 'off'}</span>
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
            <div className="button-row mt-3">
              <button
                className="btn outline"
                onClick={() => nextContact && setActiveContactId(nextContact.id)}
                disabled={!nextContact}
                type="button"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
            <div className="muted text-xs mt-2">No scrolling: only the next lead + one action.</div>
          </div>
        )}
        {rightMode === 'intel' && (
          <div className="panel soft">
            <p className="eyebrow">Intel</p>
            <div className="button-row wrap mt-2">
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
                <div className="panel-head tight mt-3">
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
                {whisper && <div className="muted text-sm mt-2">{whisper.objection_id} · {whisper.core_fear} · {whisper.confidence}</div>}
                {whisper?.whisper?.next_step?.text && (
                  <div className="coach-box focus">
                    <p className="say-next">{whisper.whisper.next_step.text}</p>
                  </div>
                )}
              </>
            )}

            {intelTab === 'coaching' && (
              <>
                <div className="panel-head tight mt-3">
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

                <div className="panel soft mt-3">
                  <div className="panel-head tight">
                    <span className="eyebrow">Meet Coach (Chrome)</span>
                    <div className="button-row">
                      <button className="btn outline sm" onClick={handleMeetConnect} type="button">
                        Connect
                      </button>
                      <button className="btn ghost sm" onClick={handleMeetStop} disabled={!meetActive} type="button">
                        Stop
                      </button>
                    </div>
                  </div>

                  <input
                    value={meetCallId}
                    onChange={(e) => setMeetCallId(e.target.value)}
                    placeholder="Call ID (např. ABCD1234)"
                  />
                  <div className="button-row wrap mt-2">
                    <button className="btn ghost sm" onClick={() => saveMeetCallId()} disabled={!meetCallId.trim()} type="button">
                      Save for lead
                    </button>
                    <button className="btn ghost sm" onClick={() => void copyText(meetCallId.trim().toUpperCase())} disabled={!meetCallId.trim()} type="button">
                      <Copy size={14} /> Copy Call ID
                    </button>
                    <button className="btn ghost sm" onClick={() => void copyText(functionsBase)} disabled={!functionsBase} type="button">
                      <Copy size={14} /> Copy Endpoint
                    </button>
                    <button className="btn ghost sm" onClick={() => void copyText(publicAnonKey)} disabled={!publicAnonKey} type="button">
                      <Copy size={14} /> Copy Auth Token
                    </button>
                  </div>
                  <div className="muted text-xs break-all mt-2">
                    Endpoint: {functionsBase || 'Supabase functions endpoint not configured.'}
                  </div>
                  <div className="muted text-xs break-all">
                    Auth token: {publicAnonKey ? 'Anon key ready (paste into extension Advanced).' : 'Missing VITE_SUPABASE_ANON_KEY.'}
                  </div>
                  <div className="muted text-xs">
                    Vlož Call ID + Endpoint + Auth token do popupu Meet Coach extension. Bude platit pro tento Google Meet.
                  </div>
                  {meetActive && <div className="muted text-xs">Captions: {meetEvents.length} lines</div>}
                  {meetError && <div className="status-line small">{meetError}</div>}
                </div>
              </>
            )}

            {intelTab === 'battle' && (
              <>
                <div className="panel-head tight mt-3">
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
                    <p className="muted text-sm mt-2">{battleCard.strategy_insight}</p>
                  </div>
                ) : (
                  <div className="muted text-sm">Generate when needed (hypothesis-only).</div>
                )}
              </>
            )}

            {intelTab === 'packs' && (
              <>
                <div className="panel-head tight mt-3">
                  <span className="eyebrow">Pre-call</span>
                  <div className="button-row">
                    <button
                      className="btn ghost sm"
                      onClick={() => activeContact && void loadPrecall(activeContact.id, 0)}
                      disabled={!activeContact || precallLoading}
                      type="button"
                    >
                      Refresh
                    </button>
                    <button
                      className="btn outline sm"
                      onClick={() => void copyText(precallData?.precall?.opener || '')}
                      disabled={!precallData?.precall?.opener}
                      type="button"
                    >
                      <Copy size={14} /> Copy opener
                    </button>
                  </div>
                </div>
                <div className="muted text-xs">Auto-loads on lead select. Evidence-gated (no guessing without facts).</div>

                {!activeContact && <div className="muted text-sm mt-2">Select a lead to load context.</div>}
                {activeContact && precallLoading && !precallData && <div className="muted text-sm mt-2">Loading context…</div>}
                {precallError && <div className="status-line small mt-2">{precallError}</div>}

                {precallData && (
                  <>
                    <div className="mt-2 muted text-xs">
                      Pipedrive:{' '}
                      {precallData.pipedrive.configured
                        ? precallData.pipedrive.person_id
                          ? `connected (person #${precallData.pipedrive.person_id})`
                          : 'connected (person unresolved)'
                        : 'not connected'}
                      {latestPipedriveTouch ? ` · last: ${latestPipedriveTouch.when} · ${latestPipedriveTouch.label}` : ''}
                    </div>

                    {precallData.precall ? (
                      <div className="coach-box mt-3">
                        <div className="tagline">Brief</div>
                        <p className="muted text-sm mt-2">{precallData.precall.brief}</p>
                        {precallData.precall.why_now && (
                          <p className="muted text-sm mt-2">
                            <span className="tagline">Why now</span> {precallData.precall.why_now}
                          </p>
                        )}
                        {precallData.precall.opener && (
                          <p className="say-next mt-3">{precallData.precall.opener}</p>
                        )}
                        {!!precallData.precall.questions?.length && (
                          <div className="muted text-sm mt-3">
                            <div className="tagline">Top questions</div>
                            {precallData.precall.questions.slice(0, 3).map((q) => (
                              <div key={q}>- {q}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="muted text-sm mt-3">
                        Pre-call brief unavailable (check backend `OPENAI_API_KEY`, or refresh).
                      </div>
                    )}

                    <details className="mt-3">
                      <summary className="details-summary">Open full pack</summary>
                      <pre className="muted text-xs mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(packPreview, null, 2)}
                      </pre>
                    </details>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
