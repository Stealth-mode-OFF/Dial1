import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Database, KeyRound, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi } from '../utils/echoApi';
import { getExtensionStatus, listenToExtension, type ExtensionStatus } from '../utils/extensionBridge';
import { functionsBase, publicAnonKey, supabaseConfigError, supabaseUrl } from '../utils/supabase/info';

type CheckState = {
  state: 'idle' | 'checking' | 'ok' | 'error';
  checkedAt: number | null;
  message: string | null;
};

type FunctionsCheckState = CheckState & {
  version: string | null;
  dbOk: boolean | null;
};

function fmtSince(ts: number | null): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function shortPublicKey(key: string): string {
  const v = (key || '').toString().trim();
  if (!v) return 'missing';
  if (v.length <= 12) return 'present';
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export function SettingsWorkspace() {
  const {
    pipedriveConfigured,
    setPipedriveKey,
    clearPipedriveKey,
    refresh,
    isConfigured: supabaseConfigured,
    user,
    updateUser,
    settings,
    updateSettings,
    showCompletedLeads,
    setShowCompletedLeads,
    clearCompletedLeads,
  } = useSales();

  const [profile, setProfile] = useState(() => ({
    name: user.name,
    role: user.role,
    dailyCallGoal: settings.dailyCallGoal || 0,
  }));

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [pipedriveKeyInput, setPipedriveKeyInput] = useState('');
  const [openAiKeyInput, setOpenAiKeyInput] = useState('');

  const [openAiConfigured, setOpenAiConfigured] = useState(false);

  const [functionsCheck, setFunctionsCheck] = useState<FunctionsCheckState>(() => ({
    state: 'idle',
    checkedAt: null,
    message: null,
    version: null,
    dbOk: null,
  }));
  const [pipedriveCheck, setPipedriveCheck] = useState<CheckState>(() => ({
    state: 'idle',
    checkedAt: null,
    message: null,
  }));
  const [openAiCheck, setOpenAiCheck] = useState<CheckState>(() => ({
    state: 'idle',
    checkedAt: null,
    message: null,
  }));

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
      if (!lastCaption) return 'Extension je připojená. Pokud nevidíš titulky, zapni CC v Google Meet.';
      return 'Extension běží a posílá titulky.';
    }
    return 'Extension není připojená. Otevři meet.google.com v aktivní kartě a reloadni stránku.';
  }, [extensionStatus.connected, extensionStatus.capabilities.meetCaptions, lastCaption]);

  useEffect(() => {
    setProfile({
      name: user.name,
      role: user.role,
      dailyCallGoal: settings.dailyCallGoal || 0,
    });
  }, [user.name, user.role, settings.dailyCallGoal]);

  const runFunctionsCheck = async () => {
    if (!supabaseConfigured) {
      setFunctionsCheck({
        state: 'error',
        checkedAt: Date.now(),
        message: supabaseConfigError || 'Supabase is not configured.',
        version: null,
        dbOk: null,
      });
      return;
    }

    setFunctionsCheck({ state: 'checking', checkedAt: Date.now(), message: null, version: null, dbOk: null });
    try {
      const [health, db] = await Promise.all([echoApi.health(), echoApi.healthDb()]);
      setFunctionsCheck({
        state: db?.ok ? 'ok' : 'error',
        checkedAt: Date.now(),
        message: db?.ok ? 'Edge functions reachable, DB ok.' : db?.error || 'DB check failed.',
        version: health?.version || null,
        dbOk: Boolean(db?.ok),
      });
    } catch (e) {
      setFunctionsCheck({
        state: 'error',
        checkedAt: Date.now(),
        message: errorMessage(e, 'Health check failed'),
        version: null,
        dbOk: null,
      });
    }
  };

  const runPipedriveTest = async () => {
    if (!pipedriveConfigured) {
      setPipedriveCheck({ state: 'error', checkedAt: Date.now(), message: 'Not configured.' });
      return;
    }
    setPipedriveCheck({ state: 'checking', checkedAt: Date.now(), message: null });
    try {
      const res = await echoApi.testPipedrive();
      if (res?.ok) {
        const who = res?.user?.name || res?.user?.email || 'OK';
        setPipedriveCheck({ state: 'ok', checkedAt: Date.now(), message: `OK (${who})` });
      } else {
        setPipedriveCheck({ state: 'error', checkedAt: Date.now(), message: 'Key configured, but test failed.' });
      }
    } catch (e) {
      setPipedriveCheck({ state: 'error', checkedAt: Date.now(), message: errorMessage(e, 'Pipedrive test failed') });
    }
  };

  const loadOpenAiStatus = async () => {
    if (!supabaseConfigured) {
      setOpenAiConfigured(false);
      setOpenAiCheck({ state: 'error', checkedAt: Date.now(), message: 'Supabase not configured.' });
      return;
    }
    try {
      const res = await echoApi.getOpenAiStatus();
      const configured = Boolean(res?.configured);
      setOpenAiConfigured(configured);
      if (!configured) {
        setOpenAiCheck({ state: 'error', checkedAt: Date.now(), message: 'Not configured.' });
      }
    } catch (e) {
      setOpenAiConfigured(false);
      setOpenAiCheck({ state: 'error', checkedAt: Date.now(), message: errorMessage(e, 'Failed to load status') });
    }
  };

  const runOpenAiTest = async () => {
    if (!openAiConfigured) {
      setOpenAiCheck({ state: 'error', checkedAt: Date.now(), message: 'Not configured.' });
      return;
    }
    setOpenAiCheck({ state: 'checking', checkedAt: Date.now(), message: null });
    try {
      const res = await echoApi.testOpenAi();
      if (res?.ok) {
        const meta = typeof res?.model_count === 'number' ? `Models: ${res.model_count}` : 'OK';
        setOpenAiCheck({ state: 'ok', checkedAt: Date.now(), message: meta });
      } else {
        setOpenAiCheck({ state: 'error', checkedAt: Date.now(), message: 'Key configured, but test failed.' });
      }
    } catch (e) {
      setOpenAiCheck({ state: 'error', checkedAt: Date.now(), message: errorMessage(e, 'OpenAI test failed') });
    }
  };

  useEffect(() => {
    void runFunctionsCheck();
    void loadOpenAiStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pipedriveConfigured) return;
    void runPipedriveTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipedriveConfigured]);

  useEffect(() => {
    if (!openAiConfigured) return;
    void runOpenAiTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAiConfigured]);

  const saveProfile = () => {
    updateUser({ name: profile.name.trim(), role: profile.role.trim() });
    updateSettings({ dailyCallGoal: Number(profile.dailyCallGoal) || 0 });
    setStatus('Profile saved.');
  };

  const savePipedrive = async () => {
    const key = pipedriveKeyInput.trim();
    if (!key) return;
    setBusy(true);
    setStatus(null);
    try {
      await setPipedriveKey(key);
      setPipedriveKeyInput('');
      await refresh();
      await runPipedriveTest();
      setStatus('Pipedrive key saved + verified.');
    } catch (e) {
      setStatus(errorMessage(e, 'Failed to save Pipedrive key'));
    } finally {
      setBusy(false);
    }
  };

  const removePipedrive = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await clearPipedriveKey();
      setPipedriveKeyInput('');
      await refresh();
      setPipedriveCheck({ state: 'error', checkedAt: Date.now(), message: 'Not configured.' });
      setStatus('Pipedrive key removed.');
    } catch (e) {
      setStatus(errorMessage(e, 'Failed to remove Pipedrive key'));
    } finally {
      setBusy(false);
    }
  };

  const importContacts = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await echoApi.importPipedrive();
      await refresh();
      setStatus(`Imported ${res?.count ?? 0} contacts.`);
    } catch (e) {
      setStatus(errorMessage(e, 'Import failed'));
    } finally {
      setBusy(false);
    }
  };

  const saveOpenAi = async () => {
    const key = openAiKeyInput.trim();
    if (!key) return;
    setBusy(true);
    setStatus(null);
    try {
      await echoApi.saveOpenAiKey(key);
      setOpenAiKeyInput('');
      await loadOpenAiStatus();
      await runOpenAiTest();
      setStatus('OpenAI key saved + verified.');
    } catch (e) {
      setStatus(errorMessage(e, 'Failed to save OpenAI key'));
    } finally {
      setBusy(false);
    }
  };

  const removeOpenAi = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await echoApi.deleteOpenAiKey();
      setOpenAiKeyInput('');
      setOpenAiConfigured(false);
      setOpenAiCheck({ state: 'error', checkedAt: Date.now(), message: 'Not configured.' });
      setStatus('OpenAI key removed.');
    } catch (e) {
      setStatus(errorMessage(e, 'Failed to remove OpenAI key'));
    } finally {
      setBusy(false);
    }
  };

  const supabasePill =
    functionsCheck.state === 'ok'
      ? 'success'
      : functionsCheck.state === 'checking'
        ? 'warning'
        : 'warning';
  const pipedrivePill =
    pipedriveCheck.state === 'ok' ? 'success' : pipedriveCheck.state === 'checking' ? 'warning' : 'warning';
  const openAiPill = openAiCheck.state === 'ok' ? 'success' : openAiCheck.state === 'checking' ? 'warning' : 'warning';

  return (
    <div className="workspace column settings-workspace">
      <div className="panel settings-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>Preferences</h2>
            <p className="muted">Saved locally on this device.</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="label">Name</span>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Role</span>
            <input value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Daily call goal</span>
            <input
              type="number"
              min={0}
              value={profile.dailyCallGoal}
              onChange={(e) => setProfile({ ...profile, dailyCallGoal: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="button-row wrap">
          <button className="btn primary" onClick={saveProfile} disabled={busy} type="button">
            Save profile
          </button>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={showCompletedLeads}
              onChange={(e) => setShowCompletedLeads(e.target.checked)}
            />
            <span>Show completed leads in queues</span>
          </label>
          <button className="btn ghost sm" onClick={clearCompletedLeads} type="button" disabled={busy}>
            Clear completed list
          </button>
        </div>
      </div>

      <div className="panel settings-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Connections</p>
            <h2>Data & keys</h2>
            <p className="muted">All keys are stored server-side and tested immediately.</p>
          </div>
        </div>

        <div className="connection-grid">
          <div className="connection-card">
            <div className="icon-title">
              <Server size={16} />
              <span>Supabase + Edge</span>
            </div>

            <div className="pill-row">
              <span className={`pill ${supabasePill}`}>{functionsCheck.state === 'ok' ? 'Connected' : 'Check'}</span>
              <span className="muted">Last check: {fmtSince(functionsCheck.checkedAt)}</span>
            </div>

            <div className="kv">
              <span className="kv-label">URL</span>
              <span className="kv-value mono">{supabaseUrl || 'missing'}</span>
            </div>
            <div className="kv">
              <span className="kv-label">Anon key</span>
              <span className="kv-value mono">{shortPublicKey(publicAnonKey)}</span>
            </div>
            <div className="kv">
              <span className="kv-label">Functions base</span>
              <span className="kv-value mono">{functionsBase || 'missing'}</span>
            </div>

            {functionsCheck.version ? (
              <div className="kv">
                <span className="kv-label">Function version</span>
                <span className="kv-value mono">{functionsCheck.version}</span>
              </div>
            ) : null}

            {functionsCheck.message ? <div className="status-line">{functionsCheck.message}</div> : null}
            {!supabaseConfigured && supabaseConfigError ? <div className="status-line">{supabaseConfigError}</div> : null}

            <div className="button-row wrap">
              <button className="btn outline" onClick={() => void runFunctionsCheck()} disabled={busy}>
                <ShieldCheck size={14} /> Test
              </button>
              <button className="btn ghost" onClick={() => void refresh()} disabled={busy || !supabaseConfigured}>
                <RefreshCw size={14} /> Refresh data
              </button>
            </div>
          </div>

          <div className="connection-card">
            <div className="icon-title">
              <Database size={16} />
              <span>Pipedrive</span>
            </div>

            <div className="pill-row">
              <span className={`pill ${pipedrivePill}`}>{pipedriveCheck.state === 'ok' ? 'Connected' : pipedriveConfigured ? 'Check' : 'Not configured'}</span>
              <span className="muted">Last check: {fmtSince(pipedriveCheck.checkedAt)}</span>
            </div>

            {pipedriveCheck.message ? <div className="status-line">{pipedriveCheck.message}</div> : null}

            <label className="field">
              <span className="label">API key</span>
              <input
                type="password"
                value={pipedriveKeyInput}
                onChange={(e) => setPipedriveKeyInput(e.target.value)}
                autoComplete="off"
              />
            </label>

            <div className="button-row wrap">
              <button className="btn primary" onClick={() => void savePipedrive()} disabled={busy || !pipedriveKeyInput.trim()}>
                <KeyRound size={14} /> Save & verify
              </button>
              <button className="btn ghost" onClick={() => void removePipedrive()} disabled={busy || !pipedriveConfigured}>
                Remove
              </button>
              <button className="btn outline" onClick={() => void runPipedriveTest()} disabled={busy || !pipedriveConfigured}>
                Test
              </button>
              <button className="btn outline" onClick={() => void importContacts()} disabled={busy || !pipedriveConfigured}>
                Import contacts
              </button>
            </div>
          </div>

          <div className="connection-card">
            <div className="icon-title">
              <Bot size={16} />
              <span>OpenAI</span>
            </div>

            <div className="pill-row">
              <span className={`pill ${openAiPill}`}>{openAiCheck.state === 'ok' ? 'Connected' : openAiConfigured ? 'Check' : 'Not configured'}</span>
              <span className="muted">Last check: {fmtSince(openAiCheck.checkedAt)}</span>
            </div>

            {openAiCheck.message ? <div className="status-line">{openAiCheck.message}</div> : null}

            <label className="field">
              <span className="label">API key</span>
              <input
                type="password"
                value={openAiKeyInput}
                onChange={(e) => setOpenAiKeyInput(e.target.value)}
                autoComplete="off"
              />
            </label>

            <div className="button-row wrap">
              <button className="btn primary" onClick={() => void saveOpenAi()} disabled={busy || !openAiKeyInput.trim()}>
                <KeyRound size={14} /> Save & verify
              </button>
              <button className="btn ghost" onClick={() => void removeOpenAi()} disabled={busy || !openAiConfigured}>
                Remove
              </button>
              <button className="btn outline" onClick={() => void runOpenAiTest()} disabled={busy || !openAiConfigured}>
                Test
              </button>
            </div>
          </div>

          <div className="connection-card">
            <div className="icon-title">
              <ShieldCheck size={16} />
              <span>Chrome Extension</span>
            </div>

            <div className="pill-row">
              <span className={`pill ${extensionStatus.connected ? 'success' : 'warning'}`}>
                {extensionStatus.connected ? 'Connected' : 'Not connected'}
              </span>
              <span className="muted">
                Last seen:{' '}
                {extensionStatus.last_seen_at ? new Date(extensionStatus.last_seen_at).toLocaleString() : '—'}
              </span>
            </div>

            <div className="kv">
              <span className="kv-label">Capabilities</span>
              <span className="kv-value">
                dial {extensionStatus.capabilities.dial ? '✓' : '—'} · meet captions{' '}
                {extensionStatus.capabilities.meetCaptions ? '✓' : '—'}
              </span>
            </div>

            <div className="button-row wrap">
              <button
                className="btn outline"
                onClick={() => window.postMessage({ type: 'ECHO_WEBAPP_PING', sent_at: Date.now() }, window.location.origin)}
                type="button"
              >
                Ping extension
              </button>
            </div>

            {lastCaption ? (
              <div className="status-line">
                Poslední titulek: {lastCaption}
                {lastCaptionAt ? <div className="muted">Před {Math.round((Date.now() - lastCaptionAt) / 1000)}s</div> : null}
              </div>
            ) : null}

            <div className="muted">{extensionHint}</div>
          </div>
        </div>

        {status ? <div className="status-line">{status}</div> : null}
      </div>
    </div>
  );
}

