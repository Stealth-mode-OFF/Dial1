import React, { useEffect, useMemo, useState } from 'react';
import { Database, KeyRound, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi } from '../utils/echoApi';
import { getExtensionStatus, listenToExtension, type ExtensionStatus } from '../utils/extensionBridge';
import { supabaseConfigError, supabaseUrl, publicAnonKey } from '../utils/supabase/info';

export function SettingsWorkspace() {
  const {
    pipedriveConfigured,
    setPipedriveKey,
    clearPipedriveKey,
    refresh,
    isConfigured,
    user,
    updateUser,
    settings,
    updateSettings,
    showCompletedLeads,
    setShowCompletedLeads,
    clearCompletedLeads,
  } = useSales();
  const [apiKey, setApiKey] = useState('');
  const [profile, setProfile] = useState(() => ({
    name: user.name,
    role: user.role,
    dailyCallGoal: settings.dailyCallGoal || 0,
  }));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>(() => getExtensionStatus());
  const [lastCaption, setLastCaption] = useState<string>('');
  const [lastCaptionAt, setLastCaptionAt] = useState<number | null>(null);

  useEffect(() => {
    const unsub = listenToExtension({
      onStatus: (s) => setExtensionStatus(s),
      onMeetCaption: (chunk) => {
        setLastCaption(chunk.text);
        setLastCaptionAt(Date.now());
      },
    });
    return () => unsub();
  }, []);

  const extensionHint = useMemo(() => {
    if (extensionStatus.connected && extensionStatus.capabilities.meetCaptions) {
      if (!lastCaption) {
        return 'Extension je připojená. Pokud nevidíš titulky, zapni CC v Google Meet.';
      }
      return 'Extension běží a posílá titulky.';
    }
    return 'Extension není připojená. Otevři `meet.google.com` v aktivní kartě a reloadni stránku.';
  }, [extensionStatus.connected, extensionStatus.capabilities.meetCaptions, lastCaption]);

  useEffect(() => {
    setProfile({
      name: user.name,
      role: user.role,
      dailyCallGoal: settings.dailyCallGoal || 0,
    });
  }, [user.name, user.role, settings.dailyCallGoal]);

  const saveProfile = () => {
    updateUser({ name: profile.name.trim(), role: profile.role.trim() });
    updateSettings({ dailyCallGoal: Number(profile.dailyCallGoal) || 0 });
    setStatus('Profile saved.');
  };

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await setPipedriveKey(apiKey.trim());
      setStatus('Pipedrive key saved (stored server-side).');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save key';
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const removeKey = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await clearPipedriveKey();
      setApiKey('');
      setStatus('Pipedrive key removed.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to remove key';
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await echoApi.importPipedrive();
      setStatus(`Imported ${res?.count ?? 0} contacts.`);
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed';
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace column">
      <div className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>Preferences</h2>
            <p className="muted">Saved locally on this device.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span className="label">Name</span>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label>
            <span className="label">Role</span>
            <input value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
          </label>
          <label>
            <span className="label">Daily call goal</span>
            <input
              type="number"
              min={0}
              value={profile.dailyCallGoal}
              onChange={(e) => setProfile({ ...profile, dailyCallGoal: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="button-row wrap mt-3">
          <button className="btn primary" onClick={saveProfile} disabled={busy} type="button">
            Save profile
          </button>
          <label className="muted text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCompletedLeads}
              onChange={(e) => setShowCompletedLeads(e.target.checked)}
            />
            Show completed leads in queues
          </label>
          <button className="btn ghost sm" onClick={clearCompletedLeads} type="button">
            Clear completed list
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Connections</p>
            <h2>Data & keys</h2>
            <p className="muted">Edge functions need Supabase + Pipedrive tokens.</p>
          </div>
        </div>

        <div className="connection-grid">
          <div className="connection-card">
            <div className="icon-title">
              <Server size={16} />
              <span>Supabase</span>
            </div>
            <p className="muted text-sm break-all">{supabaseUrl || 'Missing VITE_SUPABASE_URL'}</p>
            <p className="muted text-xs break-all">{publicAnonKey ? 'Anon key configured' : 'Missing anon key'}</p>
            <div className={`pill ${isConfigured ? 'success' : 'warning'}`}>
              {isConfigured ? 'Connected' : 'Not configured'}
            </div>
            {!isConfigured && (
              <div className="status-line small">
                {supabaseConfigError || 'Supabase není nastavený.'}
                <div className="muted text-xs mt-2">
                  Jak opravit: nastav `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, pak redeploy (např. `dial1.vercel.app`).
                </div>
              </div>
            )}
          </div>

          <div className="connection-card">
            <div className="icon-title">
              <Database size={16} />
              <span>Pipedrive</span>
            </div>
            <div className={`pill ${pipedriveConfigured ? 'success' : 'warning'}`}>
              {pipedriveConfigured ? 'Connected' : 'Not configured'}
            </div>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key (stored server-side)"
            />
            <div className="button-row wrap">
              <button className="btn primary" onClick={saveKey} disabled={busy}>
                <KeyRound size={14} /> Save key
              </button>
              <button className="btn ghost" onClick={removeKey} disabled={busy}>
                Remove key
              </button>
              <button className="btn outline" onClick={handleImport} disabled={busy || !pipedriveConfigured}>
                Import contacts
              </button>
            </div>
            {!pipedriveConfigured && (
              <div className="muted text-xs mt-2">
                Jak opravit: otevři Pipedrive → Settings → API → zkopíruj key a vlož ho sem. Potom klikni Save key.
                <div className="muted text-xs mt-2">
                  Příklad: Person ID najdeš v URL jako `/person/123456` (pro outcome logy).
                </div>
              </div>
            )}
          </div>

          <div className="connection-card">
            <div className="icon-title">
              <ShieldCheck size={16} />
              <span>Health</span>
            </div>
            <p className="muted text-sm">Calls edge function health, refreshes data.</p>
            <button className="btn ghost" onClick={() => void refresh()} disabled={busy}>
              <RefreshCw size={14} /> Refresh data
            </button>
          </div>

          <div className="connection-card">
            <div className="icon-title">
              <ShieldCheck size={16} />
              <span>Chrome Extension</span>
            </div>
            <div className={`pill ${extensionStatus.connected ? 'success' : 'warning'}`}>
              {extensionStatus.connected ? 'Connected' : 'Not connected'}
            </div>
            <p className="muted text-sm">
              Capabilities: dial {extensionStatus.capabilities.dial ? '✓' : '—'} · meet captions{' '}
              {extensionStatus.capabilities.meetCaptions ? '✓' : '—'}
            </p>
            <p className="muted text-xs">
              {extensionStatus.last_seen_at ? `Last seen: ${new Date(extensionStatus.last_seen_at).toLocaleString()}` : 'Last seen: —'}
            </p>
            <div className="button-row wrap">
              <button
                className="btn ghost"
                onClick={() => window.postMessage({ type: 'ECHO_WEBAPP_PING', sent_at: Date.now() }, '*')}
                type="button"
              >
                Ping extension
              </button>
            </div>
            {lastCaption && (
              <div className="status-line small">
                Poslední titulek: {lastCaption}
                {lastCaptionAt && <div className="muted text-xs mt-1">Před {Math.round((Date.now() - lastCaptionAt) / 1000)}s</div>}
              </div>
            )}
            <div className="muted text-xs mt-2">{extensionHint}</div>
            <div className="muted text-xs">
              To connect: install the Echo Chrome extension, open this app tab, then refresh the page so the extension sends
              `ECHO_EXTENSION_HELLO`.
            </div>
          </div>
        </div>

        {status && <div className="status-line">{status}</div>}
      </div>
    </div>
  );
}
