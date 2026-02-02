import React, { useState } from 'react';
import { CheckCircle2, Database, Save } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { supabaseConfigError, isSupabaseConfigured } from '../utils/supabase/info';

export default function Configuration() {
  const { user, updateUser, settings, updateSettings } = useSales();
  const [form, setForm] = useState({
    name: user.name,
    role: user.role,
    dailyCallGoal: settings.dailyCallGoal || 0,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateUser({ name: form.name.trim(), role: form.role.trim() });
    updateSettings({ dailyCallGoal: Number(form.dailyCallGoal) || 0 });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="app-page">
      <header>
        <h1 className="app-title text-3xl">Configuration</h1>
        <p className="app-subtitle">Set your identity and connect data.</p>
      </header>

      <div className="app-page-body grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="app-card app-section">
          <h2 className="app-title text-xl">Profile</h2>
          <p className="app-subtitle mt-2">Used across the workspace.</p>

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
          <p className="app-subtitle mt-2">Supabase powers live data.</p>
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
                ? 'Your project keys are configured.'
                : supabaseConfigError || 'Add environment variables to connect.'}
            </p>
          </div>

          <div className="mt-6 app-card soft p-4">
            <div className="text-sm font-semibold">Recommended tables</div>
            <p className="text-sm app-muted mt-2">
              Use `contacts`, `calls`, and `deals` tables for fastest onboarding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
