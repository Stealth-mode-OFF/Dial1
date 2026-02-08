import React, { useState } from 'react';
import { BarChart3, Settings } from 'lucide-react';
import { AnalyticsWorkspace } from './AnalyticsWorkspace';
import { SettingsWorkspace } from './SettingsWorkspace';

export function OpsWorkspace() {
  const [tab, setTab] = useState<'stats' | 'settings'>('stats');

  return (
    <div className="workspace column" data-testid="ops-workspace">
      <div className="panel">
        <div className="panel-head tight">
          <div className="button-row">
            <button
              className={`btn ghost sm ${tab === 'stats' ? 'active' : ''}`}
              onClick={() => setTab('stats')}
              type="button"
            >
              <BarChart3 size={14} /> Statistiky
            </button>
            <button
              className={`btn ghost sm ${tab === 'settings' ? 'active' : ''}`}
              onClick={() => setTab('settings')}
              type="button"
            >
              <Settings size={14} /> Nastavení
            </button>
          </div>
          <span className="muted">Skryté – použij jen když potřebuješ</span>
        </div>
      </div>

      {tab === 'stats' && <AnalyticsWorkspace />}
      {tab === 'settings' && <SettingsWorkspace />}
    </div>
  );
}
