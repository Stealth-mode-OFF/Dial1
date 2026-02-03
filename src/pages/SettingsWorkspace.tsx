import React, { useState } from 'react';
import { Database, KeyRound, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi } from '../utils/echoApi';
import { supabaseConfigError, supabaseUrl, publicAnonKey } from '../utils/supabase/info';

export function SettingsWorkspace() {
  const { pipedriveConfigured, setPipedriveKey, clearPipedriveKey, refresh, isConfigured } = useSales();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await setPipedriveKey(apiKey.trim());
      setStatus('Pipedrive key saved.');
      setApiKey('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save key';
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
            {!isConfigured && <div className="status-line small">{supabaseConfigError}</div>}
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
              placeholder="API key (never stored client-side)"
            />
            <div className="button-row wrap">
              <button className="btn primary" onClick={saveKey} disabled={busy}>
                <KeyRound size={14} /> Save key
              </button>
              <button className="btn ghost" onClick={clearPipedriveKey} disabled={busy}>
                Remove key
              </button>
              <button className="btn outline" onClick={handleImport} disabled={busy || !pipedriveConfigured}>
                Import contacts
              </button>
            </div>
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
        </div>

        {status && <div className="status-line">{status}</div>}
      </div>
    </div>
  );
}
