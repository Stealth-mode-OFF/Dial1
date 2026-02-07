import { useEffect, useMemo, useState } from 'react';
import { useAdapter } from '../app/AdapterContext';
import { useWorkspace } from '../app/WorkspaceContext';
import { navigate } from '../app/router';
import type { CallNote, CallOutcome, CallSession, Contact } from '../data/types';
import { LoadingScreen } from '../components/mvp/LoadingScreen';

const OUTCOMES: Array<{ id: CallOutcome; label: string }> = [
  { id: 'connected', label: 'Connected' },
  { id: 'no_answer', label: 'No answer' },
  { id: 'voicemail', label: 'Voicemail' },
  { id: 'callback', label: 'Callback' },
  { id: 'not_interested', label: 'Not interested' },
  { id: 'interested', label: 'Interested' },
  { id: 'booked_meeting', label: 'Booked meeting' },
];

function fmt(ts: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

type EditorState =
  | { open: false }
  | {
      open: true;
      mode: 'create' | 'edit';
      initial?: Contact;
    };

export function ContactsPage({ contactId }: { contactId?: string }) {
  const adapter = useAdapter();
  const { loading: wsLoading, workspace } = useWorkspace();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editor, setEditor] = useState<EditorState>({ open: false });

  const workspaceId = workspace?.id ?? null;

  const selectedId = contactId ?? null;
  const selected = useMemo(
    () => (selectedId ? contacts.find((c) => c.id === selectedId) ?? null : null),
    [contacts, selectedId],
  );

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const handle = window.setTimeout(() => {
      adapter
        .listContacts({ workspaceId, query, limit: 200 })
        .then((rows) => {
          if (cancelled) return;
          setContacts(rows);
          if (!selectedId && rows[0]) navigate(`/contacts/${rows[0].id}`);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (cancelled) return;
          setError(msg);
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [adapter, workspaceId, query, selectedId]);

  if (wsLoading || !workspace) return <LoadingScreen label="Loading workspace…" />;
  if (loading) return <LoadingScreen label="Loading contacts…" />;

  return (
    <div className="figma-shell figma-grid-bg font-sans text-black h-full">
      <div className="grid grid-cols-12 gap-5 h-full">
        {/* List */}
        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="neo-panel-shadow bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="neo-tag neo-tag-yellow">CONTACTS</div>
                <div className="font-mono text-xs font-bold uppercase tracking-widest opacity-60 mt-2">
                  Workspace: {workspace.name}
                </div>
              </div>
              <button
                className="neo-btn neo-bg-yellow px-4 py-2 text-xs font-black uppercase tracking-widest"
                onClick={() => setEditor({ open: true, mode: 'create' })}
              >
                New
              </button>
            </div>

            <input
              className="neo-input w-full px-3 py-2 text-sm font-mono mt-4"
              placeholder="Search name, company, phone, email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {error ? (
              <div className="mt-3 font-mono text-xs" style={{ color: 'var(--neo-red)' }}>
                {error}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {contacts.length === 0 ? (
              <div className="neo-panel-shadow bg-white p-4 font-mono text-sm font-bold opacity-70">
                No contacts yet. Create your first one.
              </div>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                  className="neo-panel-shadow bg-white w-full text-left p-4"
                  style={{
                    background: c.id === selectedId ? 'var(--figma-yellow)' : 'white',
                  }}
                >
                  <div className="font-black text-sm">{c.full_name}</div>
                  <div className="text-xs font-mono uppercase opacity-70">
                    {(c.company || '—').toString()}
                  </div>
                  <div className="mt-2 text-[10px] font-mono font-bold uppercase opacity-70">
                    {c.phone || c.email || ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Detail */}
        <section className="col-span-12 lg:col-span-8">
          {selected ? (
            <ContactDetail
              key={selected.id}
              contact={selected}
              workspaceId={workspaceId!}
              onEdit={() => setEditor({ open: true, mode: 'edit', initial: selected })}
              onDeleted={() => navigate('/contacts')}
            />
          ) : (
            <div className="neo-panel-shadow bg-white p-6 font-mono text-sm font-bold opacity-70">
              Select a contact.
            </div>
          )}
        </section>
      </div>

      {editor.open ? (
        <ContactEditor
          workspaceId={workspaceId!}
          mode={editor.mode}
          initial={editor.initial}
          onClose={() => setEditor({ open: false })}
          onSaved={(saved) => {
            setEditor({ open: false });
            setContacts((prev) => {
              const next = prev.filter((c) => c.id !== saved.id);
              return [saved, ...next];
            });
            navigate(`/contacts/${saved.id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function ContactEditor({
  workspaceId,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  mode: 'create' | 'edit';
  initial?: Contact;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}) {
  const adapter = useAdapter();
  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === 'create' ? 'New contact' : 'Edit contact';

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await adapter.upsertContact(workspaceId, {
        id: initial?.id,
        full_name: fullName,
        company: company || null,
        phone: phone || null,
        email: email || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="neo-panel-shadow bg-white p-6 w-full max-w-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="neo-tag neo-tag-yellow">{mode === 'create' ? 'CREATE' : 'EDIT'}</div>
            <div className="neo-display text-3xl font-black mt-2">{title}</div>
          </div>
          <button className="neo-btn bg-white px-3 py-2 text-xs font-black uppercase" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <label className="col-span-12 font-mono text-xs font-bold uppercase tracking-widest opacity-80">
            Full name
            <input
              className="mt-2 neo-input w-full px-3 py-2 font-mono text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="col-span-12 md:col-span-6 font-mono text-xs font-bold uppercase tracking-widest opacity-80">
            Company
            <input
              className="mt-2 neo-input w-full px-3 py-2 font-mono text-sm"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="col-span-12 md:col-span-6 font-mono text-xs font-bold uppercase tracking-widest opacity-80">
            Phone
            <input
              className="mt-2 neo-input w-full px-3 py-2 font-mono text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="col-span-12 md:col-span-6 font-mono text-xs font-bold uppercase tracking-widest opacity-80">
            Email
            <input
              className="mt-2 neo-input w-full px-3 py-2 font-mono text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="col-span-12 md:col-span-6 font-mono text-xs font-bold uppercase tracking-widest opacity-80">
            Tags (comma separated)
            <input
              className="mt-2 neo-input w-full px-3 py-2 font-mono text-sm"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={busy}
            />
          </label>
        </div>

        {error ? (
          <div className="font-mono text-xs" style={{ color: 'var(--neo-red)' }}>
            {error}
          </div>
        ) : null}

        <button
          className="neo-btn neo-bg-yellow w-full px-4 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
          onClick={save}
          disabled={busy}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function ContactDetail({
  workspaceId,
  contact,
  onEdit,
  onDeleted,
}: {
  workspaceId: string;
  contact: Contact;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const adapter = useAdapter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const activeSession = sessions.find((s) => !s.ended_at) ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession =
    sessions.find((s) => s.id === (selectedSessionId ?? activeSession?.id)) ??
    activeSession ??
    sessions[0] ??
    null;

  const [notesLoading, setNotesLoading] = useState(false);
  const [notes, setNotes] = useState<CallNote[]>([]);
  const [noteDraft, setNoteDraft] = useState('');

  const [endOutcome, setEndOutcome] = useState<CallOutcome>('connected');

  const reloadSessions = async () => {
    setSessionsLoading(true);
    setError(null);
    try {
      const rows = await adapter.listCallSessionsForContact(workspaceId, contact.id, { limit: 100 });
      setSessions(rows);
      const currentActive = rows.find((s) => !s.ended_at) ?? null;
      setSelectedSessionId((prev) => prev ?? currentActive?.id ?? rows[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSessionsLoading(false);
    }
  };

  const reloadNotes = async (sessionId: string) => {
    setNotesLoading(true);
    setError(null);
    try {
      const rows = await adapter.listCallNotes(workspaceId, sessionId, { limit: 200 });
      setNotes(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    void reloadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, contact.id]);

  useEffect(() => {
    if (!selectedSession) {
      setNotes([]);
      return;
    }
    void reloadNotes(selectedSession.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, selectedSession?.id]);

  const startCall = async () => {
    setBusy(true);
    setError(null);
    try {
      await adapter.startCallSession({ workspaceId, contactId: contact.id, channel: 'phone' });
      await reloadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const endCall = async () => {
    if (!activeSession) return;
    setBusy(true);
    setError(null);
    try {
      await adapter.endCallSession(activeSession.id, endOutcome);
      await reloadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!selectedSession) return;
    setBusy(true);
    setError(null);
    try {
      const created = await adapter.addCallNote({
        workspaceId,
        callSessionId: selectedSession.id,
        bodyText: noteDraft,
      });
      setNoteDraft('');
      setNotes((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteContact = async () => {
    // Minimal confirmation without external UI libs.
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete contact "${contact.full_name}"? This cannot be undone.`);
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await adapter.deleteContact(workspaceId, contact.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="neo-panel-shadow bg-white p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="neo-tag neo-tag-yellow">CONTACT</div>
          <div className="neo-display text-4xl font-black mt-2">{contact.full_name}</div>
          <div className="mt-2 text-xs font-mono font-bold uppercase tracking-widest opacity-70">
            {contact.company || '—'} {contact.phone ? `• ${contact.phone}` : ''}{' '}
            {contact.email ? `• ${contact.email}` : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="neo-btn bg-white px-3 py-2 text-xs font-black uppercase" onClick={onEdit} disabled={busy}>
            Edit
          </button>
          <button
            className="neo-btn bg-white px-3 py-2 text-xs font-black uppercase"
            onClick={deleteContact}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Call controls */}
      <div className="neo-panel bg-white p-4" style={{ boxShadow: 'none' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono font-black uppercase tracking-widest opacity-70">
            {activeSession ? (
              <span>
                Active call started: <span className="opacity-100">{fmt(activeSession.started_at)}</span>
              </span>
            ) : (
              <span>No active call</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeSession ? (
              <>
                <select
                  className="neo-input px-3 py-2 text-xs font-mono font-bold"
                  value={endOutcome}
                  onChange={(e) => setEndOutcome(e.target.value as CallOutcome)}
                  disabled={busy}
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  className="neo-btn neo-bg-yellow px-4 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                  onClick={endCall}
                  disabled={busy}
                >
                  End call
                </button>
              </>
            ) : (
              <button
                className="neo-btn neo-bg-yellow px-4 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                onClick={startCall}
                disabled={busy}
              >
                Start call
              </button>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="font-mono text-xs" style={{ color: 'var(--neo-red)' }}>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-5">
        {/* Sessions */}
        <div className="col-span-12 lg:col-span-5">
          <div className="neo-tag neo-tag-yellow">CALL HISTORY</div>
          <div className="mt-3 space-y-2">
            {sessionsLoading ? (
              <div className="font-mono text-sm font-bold opacity-70">Loading…</div>
            ) : sessions.length === 0 ? (
              <div className="font-mono text-sm font-bold opacity-70">No calls yet.</div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  className="neo-panel-shadow bg-white w-full text-left p-3"
                  style={{ background: s.id === selectedSession?.id ? 'var(--figma-yellow)' : 'white' }}
                  onClick={() => setSelectedSessionId(s.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-xs font-black uppercase tracking-widest">
                      {s.ended_at ? 'Ended' : 'Active'}
                    </div>
                    <div className="font-mono text-xs font-bold opacity-70">
                      {s.duration_seconds != null ? `${s.duration_seconds}s` : '—'}
                    </div>
                  </div>
                  <div className="mt-1 font-mono text-xs font-bold opacity-70">
                    {fmt(s.started_at)}
                    {s.outcome ? ` • ${s.outcome}` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-12 lg:col-span-7">
          <div className="neo-tag neo-tag-yellow">NOTES</div>

          {!selectedSession ? (
            <div className="mt-3 font-mono text-sm font-bold opacity-70">Select a call session to view notes.</div>
          ) : (
            <>
              <div className="mt-3 neo-panel bg-white p-4" style={{ boxShadow: 'none' }}>
                <div className="text-xs font-mono font-black uppercase tracking-widest opacity-70">
                  Session: {fmt(selectedSession.started_at)}
                </div>
                <textarea
                  className="neo-input w-full px-3 py-2 text-sm font-mono mt-3"
                  rows={4}
                  placeholder="Write a note…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  disabled={busy}
                />
                <button
                  className="neo-btn neo-bg-yellow px-4 py-2 text-xs font-black uppercase tracking-widest mt-3 disabled:opacity-50"
                  onClick={addNote}
                  disabled={busy || !noteDraft.trim()}
                >
                  Add note
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {notesLoading ? (
                  <div className="font-mono text-sm font-bold opacity-70">Loading…</div>
                ) : notes.length === 0 ? (
                  <div className="font-mono text-sm font-bold opacity-70">No notes yet.</div>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="neo-panel-shadow bg-white p-4">
                      <div className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">
                        {fmt(n.created_at)}
                      </div>
                      <div className="mt-2 font-mono text-sm font-bold whitespace-pre-wrap">{n.body_text}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
