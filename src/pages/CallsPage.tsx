import { useEffect, useMemo, useState } from 'react';
import { useAdapter } from '../app/AdapterContext';
import { useWorkspace } from '../app/WorkspaceContext';
import { navigate } from '../app/router';
import type { CallSession, Contact } from '../data/types';
import { LoadingScreen } from '../components/mvp/LoadingScreen';

function fmt(ts: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function CallsPage() {
  const adapter = useAdapter();
  const { loading: wsLoading, workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [contactsById, setContactsById] = useState<Record<string, Contact>>({});

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    adapter
      .listRecentCallSessions(workspaceId, { limit: 50 })
      .then(async (rows) => {
        if (cancelled) return;
        setSessions(rows);
        const uniqueContactIds = Array.from(new Set(rows.map((r) => r.contact_id)));
        const contactPairs = await Promise.all(
          uniqueContactIds.map(async (id) => {
            try {
              const c = await adapter.getContact(workspaceId, id);
              return [id, c] as const;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const map: Record<string, Contact> = {};
        for (const p of contactPairs) {
          if (!p) continue;
          map[p[0]] = p[1];
        }
        setContactsById(map);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, workspaceId]);

  const rows = useMemo(() => {
    return sessions.map((s) => ({
      session: s,
      contact: contactsById[s.contact_id] ?? null,
    }));
  }, [sessions, contactsById]);

  if (wsLoading || !workspace) return <LoadingScreen label="Loading workspace…" />;
  if (loading) return <LoadingScreen label="Loading calls…" />;

  return (
    <div className="figma-shell figma-grid-bg font-sans text-black">
      <div className="neo-panel-shadow bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="neo-tag neo-tag-yellow">RECENT CALLS</div>
            <div className="neo-display text-4xl font-black mt-2">Call Sessions</div>
            <div className="mt-2 text-xs font-mono font-bold uppercase tracking-widest opacity-70">
              Workspace: {workspace.name}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 font-mono text-xs" style={{ color: 'var(--neo-red)' }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <div className="neo-panel-shadow bg-white p-4 font-mono text-sm font-bold opacity-70">
            No calls yet.
          </div>
        ) : (
          rows.map(({ session, contact }) => (
            <button
              key={session.id}
              className="neo-panel-shadow bg-white w-full text-left p-4"
              onClick={() => navigate(`/contacts/${session.contact_id}`)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black text-sm">{contact?.full_name ?? 'Unknown contact'}</div>
                  <div className="text-xs font-mono uppercase opacity-70">
                    {contact?.company ?? '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-black uppercase tracking-widest opacity-70">
                    {session.outcome ?? (session.ended_at ? 'ended' : 'active')}
                  </div>
                  <div className="font-mono text-xs font-bold opacity-70">
                    {fmt(session.started_at)} {session.duration_seconds != null ? `• ${session.duration_seconds}s` : ''}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
