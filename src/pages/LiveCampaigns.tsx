import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Mic, PhoneCall, Search, StopCircle } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function LiveCampaigns() {
  const { contacts, activeContact, setActiveContactId, isLoading } = useSales();
  const [search, setSearch] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isLive]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const term = search.toLowerCase();
    return contacts.filter((contact) =>
      [contact.name, contact.company, contact.title]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    );
  }, [contacts, search]);

  const handleStart = () => {
    setIsLive(true);
    setSeconds(0);
  };

  const handleStop = () => {
    setIsLive(false);
  };

  const handleSaveNotes = () => {
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div className="app-section app-grid">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-title text-3xl">Live Dialer</h1>
          <p className="app-subtitle">Run focused call blocks with a live queue.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="app-pill">Session {isLive ? 'Live' : 'Ready'}</span>
          <button className="app-button accent" onClick={isLive ? handleStop : handleStart}>
            {isLive ? <StopCircle size={16} /> : <PhoneCall size={16} />}
            {isLive ? 'End call' : 'Start call'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="app-card app-section lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="app-title text-lg">Lead queue</h2>
            <span className="app-pill">{filtered.length} leads</span>
          </div>
          <div className="mt-3 app-search">
            <Search size={16} />
            <input
              className="app-input"
              placeholder="Search queue"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-4 grid gap-3">
            {isLoading && <div className="app-subtitle">Loading queue...</div>}
            {!isLoading && filtered.length === 0 && (
              <div className="app-subtitle">No queued contacts found.</div>
            )}
            {filtered.map((contact) => (
              <button
                key={contact.id}
                className={`app-card soft px-3 py-3 text-left ${
                  activeContact?.id === contact.id ? 'border border-black/20' : ''
                }`}
                onClick={() => setActiveContactId(contact.id)}
              >
                <div className="font-semibold">{contact.name}</div>
                <div className="text-sm app-muted">
                  {contact.title || 'Role'} {contact.company ? `· ${contact.company}` : ''}
                </div>
                <div className="text-xs app-muted mt-2">
                  {contact.status || 'Queued'} {contact.location ? `· ${contact.location}` : ''}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="app-card app-section lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="app-title text-2xl">
                {activeContact?.name || 'No contact selected'}
              </h2>
              <p className="app-subtitle">
                {activeContact?.title || 'Role'}
                {activeContact?.company ? ` · ${activeContact.company}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="app-pill">Duration {formatDuration(seconds)}</span>
              <span className="app-pill">
                {activeContact?.phone || activeContact?.email || 'Contact details'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="app-card soft p-4">
              <p className="text-xs uppercase app-muted">Focus</p>
              <p className="text-sm font-semibold mt-2">Ask 2 discovery questions before pitching.</p>
            </div>
            <div className="app-card soft p-4">
              <p className="text-xs uppercase app-muted">Next step</p>
              <p className="text-sm font-semibold mt-2">Secure a 15-minute follow-up call.</p>
            </div>
            <div className="app-card soft p-4">
              <p className="text-xs uppercase app-muted">Last touch</p>
              <p className="text-sm font-semibold mt-2">
                {activeContact?.lastTouch ? new Date(activeContact.lastTouch).toLocaleDateString() : 'No recent activity'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="app-title text-lg">Call notes</h3>
              {savedAt && <span className="app-subtitle">Saved at {savedAt}</span>}
            </div>
            <textarea
              className="app-card soft w-full mt-3 p-4 min-h-[160px]"
              placeholder="Capture outcomes, objections, and next steps..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="app-button" onClick={handleSaveNotes}>
                <ClipboardCheck size={16} /> Save notes
              </button>
              <button className="app-button secondary">
                <Mic size={16} /> Transcribe
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
