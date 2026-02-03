import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bolt,
  BookOpen,
  Headphones,
  PhoneCall,
  RefreshCw,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { DialerWorkspace } from './pages/DialerWorkspace';
import { AnalyticsWorkspace } from './pages/AnalyticsWorkspace';
import { CoachWorkspace } from './pages/CoachWorkspace';
import { KnowledgeWorkspace } from './pages/KnowledgeWorkspace';
import { SettingsWorkspace } from './pages/SettingsWorkspace';
import { useSales } from './contexts/SalesContext';

type View = 'dialer' | 'coach' | 'analytics' | 'knowledge' | 'settings';

const NAV: Array<{ id: View; label: string; icon: React.ElementType }> = [
  { id: 'dialer', label: 'Dialer', icon: PhoneCall },
  { id: 'coach', label: 'Coaching', icon: Headphones },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [view, setView] = useState<View>('dialer');
  const { stats, isConfigured, pipedriveConfigured, lastUpdated, error, refresh, isLoading } = useSales();

  const viewLabel = useMemo(() => NAV.find((n) => n.id === view)?.label || '', [view]);

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <Bolt size={18} /> Echo
        </div>
        <nav className="rail-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.id === view;
            return (
              <button key={item.id} className={`rail-btn ${active ? 'active' : ''}`} onClick={() => setView(item.id)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="canvas">
        <header className="topbar">
          <div>
            <p className="eyebrow">Echo OS</p>
            <h1>{viewLabel}</h1>
            <p className="muted">Dialer + coaching + logging, fully backed by the edge function.</p>
          </div>
          <div className="chip-row">
            <span className={`pill ${isConfigured ? 'success' : 'warning'}`}>
              {isConfigured ? 'Supabase connected' : 'Supabase missing'}
            </span>
            <span className={`pill ${pipedriveConfigured ? 'success' : 'warning'}`}>
              {pipedriveConfigured ? 'Pipedrive linked' : 'Pipedrive pending'}
            </span>
            <span className="pill subtle">
              <Activity size={14} /> {lastUpdated ? `Synced ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced'}
            </span>
            <button className="btn ghost" onClick={() => void refresh()} disabled={isLoading}>
              <RefreshCw size={14} /> Sync
            </button>
          </div>
        </header>

        {error && <div className="banner warning">{error}</div>}
        <div className="banner info">
          <div className="stat">
            <span className="label">Calls today</span>
            <strong>{stats.callsToday}</strong>
          </div>
          <div className="stat">
            <span className="label">Connect rate</span>
            <strong>{stats.connectRate}%</strong>
          </div>
          <div className="stat">
            <span className="label">Meetings</span>
            <strong>{stats.meetingsBooked}</strong>
          </div>
          <div className="stat">
            <span className="label">Active leads</span>
            <strong>{stats.activeLeads}</strong>
          </div>
        </div>

        <section className="screen">
          {view === 'dialer' && <DialerWorkspace />}
          {view === 'coach' && <CoachWorkspace />}
          {view === 'analytics' && <AnalyticsWorkspace />}
          {view === 'knowledge' && <KnowledgeWorkspace />}
          {view === 'settings' && <SettingsWorkspace />}
        </section>
      </main>
    </div>
  );
}
