import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  PhoneCall,
  PlayCircle,
  StopCircle,
} from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

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

  useEffect(() => {
    if (!isCalling) return;
    const timer = window.setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isCalling]);

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

  return (
    <div className="workspace">
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
            onClick={() => setIsCalling(true)}
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

          <div className="panel soft">
            <div className="panel-head tight">
              <span className="eyebrow">Coach</span>
              <button className="btn ghost sm" onClick={askCoach} disabled={aiLoading} type="button">
                <Sparkles size={14} /> Ask
              </button>
            </div>
            <div className="stage-row">
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                {['situation', 'problem', 'implication', 'need_payoff', 'close'].map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </div>
            <div className="coach-box focus">
              <p className="muted text-sm">Say next</p>
              <p className="say-next">{coachTip || 'Ask for the next best line.'}</p>
            </div>

            <details className="details">
              <summary className="details-summary">Battle card</summary>
              <div className="details-body">
                <button className="btn ghost sm" onClick={fetchBattleCard} disabled={aiLoading} type="button">
                  <Flame size={14} /> Generate
                </button>
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
                  <p className="muted text-sm">Generate to see objections + rebuttals.</p>
                )}
              </div>
            </details>

            <details className="details">
              <summary className="details-summary">Whisper (objections)</summary>
              <div className="details-body">
                <textarea
                  className="notes"
                  value={whisperInput}
                  onChange={(e) => setWhisperInput(e.target.value)}
                  placeholder="Paste the prospect’s objection (exact words)."
                />
                <button className="btn outline" onClick={() => void runWhisper()} disabled={whisperLoading || !activeContact} type="button">
                  <Wand2 size={14} /> Whisper
                </button>
                {whisper && (
                  <div className="coach-box">
                    <p className="muted text-sm">
                      {whisper.objection_id} · {whisper.core_fear} · {whisper.confidence}
                      {whisper.product_evidence_available ? ' · product evidence OK' : ' · no product evidence'}
                    </p>
                    <div className="muted text-sm">Validate</div>
                    <p className="say-next">{whisper.whisper?.validate?.text}</p>
                    <div className="muted text-sm">Reframe</div>
                    <p className="say-next">{whisper.whisper?.reframe?.text}</p>
                    <div className="muted text-sm">Implication</div>
                    <p className="say-next">{whisper.whisper?.implication_question?.text}</p>
                    <div className="muted text-sm">Next step</div>
                    <p className="say-next">{whisper.whisper?.next_step?.text}</p>
                  </div>
                )}
                {!whisper && <p className="muted text-sm">Outputs are hypothesis-gated unless you approve product evidence in Evidence.</p>}
              </div>
            </details>
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
            type="button"
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
          <div className="muted text-xs mt-3">Tip: push for concrete time/date before hanging up.</div>
        </div>
      </div>
    </div>
  );
}
