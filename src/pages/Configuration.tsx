import React, { useState } from 'react';
import { CheckCircle2, Database, Save } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { supabaseConfigError, isSupabaseConfigured, supabaseUrl, publicAnonKey } from '../utils/supabase/info';

export default function Configuration() {
  const { user, updateUser, settings, updateSettings, refresh } = useSales();
  const [form, setForm] = useState({
    name: user.name,
    role: user.role,
    dailyCallGoal: settings.dailyCallGoal || 0,
  });
  const [saved, setSaved] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSave = () => {
    updateUser({ name: form.name.trim(), role: form.role.trim() });
    updateSettings({ dailyCallGoal: Number(form.dailyCallGoal) || 0 });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleImport = async () => {
    if (!isSupabaseConfigured) {
      setImportStatus('Connect Supabase to import contacts.');
      return;
    }
    setIsImporting(true);
    setImportStatus(null);
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/make-server-139017f8/pipedrive/import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: publicAnonKey,
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Import failed');
      }
      setImportStatus(`Imported ${data?.count ?? 0} contacts.`);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setImportStatus(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="app-page">
      <header>
        <h1 className="app-title text-3xl">Settings</h1>
        <p className="app-subtitle">Profile and data connections.</p>
      </header>

      <div className="app-page-body grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="app-card app-section">
          <h2 className="app-title text-xl">Profile</h2>
          <p className="app-subtitle mt-2">Your display name and role.</p>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-semibold">
              Name
              <input
                className="app-card soft w-full mt-2 px-4 py-2"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              Role
              <input
                className="app-card soft w-full mt-2 px-4 py-2"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              Daily call goal
              <input
                type="number"
                min={0}
                className="app-card soft w-full mt-2 px-4 py-2"
                value={form.dailyCallGoal}
                onChange={(event) =>
                  setForm({ ...form, dailyCallGoal: Number(event.target.value) })
                }
              />
            </label>
          </div>

          <button className="app-button mt-6" onClick={handleSave}>
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </div>

        <div className="app-card app-section">
          <h2 className="app-title text-xl">Data connection</h2>
          <p className="app-subtitle mt-2">Connect to load live data.</p>
          <div className="mt-4 app-card soft p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={18} />
                <span className="font-semibold">Supabase</span>
              </div>
              <span className="app-pill">
                {isSupabaseConfigured ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p className="text-sm app-muted mt-3">
              {isSupabaseConfigured
                ? 'Connected.'
                : supabaseConfigError || 'Add environment variables to connect.'}
            </p>
          </div>

          <div className="mt-4 app-card soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Pipedrive</div>
                <p className="text-sm app-muted mt-1">Import leads into contacts.</p>
              </div>
              <button
                className="app-button"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import from Pipedrive'}
              </button>
            </div>
            {importStatus && <p className="text-sm app-muted mt-3">{importStatus}</p>}
          </div>

          <div className="mt-6 app-card soft p-4">
            <div className="text-sm font-semibold">Recommended tables</div>
            <p className="text-sm app-muted mt-2">
              Use contacts, calls, and deals tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
