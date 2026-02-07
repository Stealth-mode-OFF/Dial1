import { useState } from 'react';
import { useAdapter } from '../app/AdapterContext';
import { useAuth } from '../app/AuthContext';
import { useWorkspace } from '../app/WorkspaceContext';
import { replace } from '../app/router';

export function SettingsPage() {
  const adapter = useAdapter();
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await adapter.signOut();
      replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="figma-shell figma-grid-bg font-sans text-black">
      <div className="neo-panel-shadow bg-white p-5 space-y-4">
        <div>
          <div className="neo-tag neo-tag-yellow">SETTINGS</div>
          <div className="neo-display text-4xl font-black mt-2">Account</div>
        </div>

        <div className="neo-panel bg-white p-4 font-mono text-sm font-bold" style={{ boxShadow: 'none' }}>
          <div className="text-xs font-black uppercase tracking-widest opacity-60">Signed in as</div>
          <div className="mt-1">{user?.email ?? '—'}</div>
        </div>

        <div className="neo-panel bg-white p-4 font-mono text-sm font-bold" style={{ boxShadow: 'none' }}>
          <div className="text-xs font-black uppercase tracking-widest opacity-60">Workspace</div>
          <div className="mt-1">{workspace?.name ?? '—'}</div>
        </div>

        {error ? (
          <div className="font-mono text-xs" style={{ color: 'var(--neo-red)' }}>
            {error}
          </div>
        ) : null}

        <button
          className="neo-btn bg-white px-4 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
          onClick={signOut}
          disabled={busy}
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

