import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bolt,
  CalendarCheck,
  PhoneCall,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { BookDemoWorkspace } from './pages/BookDemoWorkspace';
import { DialerWorkspace } from './pages/DialerWorkspace';
import { OpsWorkspace } from './pages/OpsWorkspace';
import { useSales } from './contexts/SalesContext';

type View = 'book_demo' | 'demo' | 'ops';

const PRIMARY_NAV: Array<{ id: View; label: string; icon: React.ElementType }> = [
  { id: 'book_demo', label: 'Domluvit demo', icon: CalendarCheck },
  { id: 'demo', label: 'Demo', icon: PhoneCall },
];

const SECONDARY_NAV: Array<{ id: View; label: string; icon: React.ElementType }> = [
  { id: 'ops', label: 'Statistiky & Nastavení', icon: Settings },
];

export default function App() {
  const [view, setView] = useState<View>('demo');
  const [railExpanded, setRailExpanded] = useState(false);
  const { stats, isConfigured, pipedriveConfigured, lastUpdated, error, refresh, isLoading } = useSales();

  const viewLabel = useMemo(() => {
    return [...PRIMARY_NAV, ...SECONDARY_NAV].find((n) => n.id === view)?.label || '';
  }, [view]);

  return (
    <div className="shell">
      <aside
        className={`rail ${railExpanded ? 'expanded' : 'collapsed'}`}
        onMouseEnter={() => setRailExpanded(true)}
        onMouseLeave={() => setRailExpanded(false)}
        onFocusCapture={() => setRailExpanded(true)}
        onBlurCapture={(e) => {
          const next = e.relatedTarget as Node | null;
          if (!next || !e.currentTarget.contains(next)) setRailExpanded(false);
        }}
      >
        <div className="brand">
          <Bolt size={18} /> <span className="brand-label">Echo</span>
        </div>
        <nav className="rail-nav">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.id === view;
            return (
              <button
                key={item.id}
                className={`rail-btn ${active ? 'active' : ''}`}
                onClick={() => setView(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <nav className="rail-nav secondary">
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.id === view;
            return (
              <button
                key={item.id}
                className={`rail-btn ${active ? 'active' : ''}`}
                onClick={() => setView(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="canvas">
        {view !== 'demo' && (
          <header className="topbar">
            <div>
              <p className="eyebrow">Echo OS</p>
              <h1>{viewLabel}</h1>
              {view === 'book_demo' && (
                <p className="muted">Intel + otázky na domluvení dema (bez scrollu, bez šumu).</p>
              )}
            </div>
            <div className="chip-row">
              <span className={`pill ${isConfigured ? 'success' : 'warning'}`}>
                {isConfigured ? 'Supabase connected' : 'Supabase missing'}
              </span>
              <span className={`pill ${pipedriveConfigured ? 'success' : 'warning'}`}>
                {pipedriveConfigured ? 'Pipedrive linked' : 'Pipedrive pending'}
              </span>
              <span className="pill subtle">
                <Activity size={14} />{' '}
                {lastUpdated
                  ? `Synced ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Not synced'}
              </span>
              <button className="btn ghost" onClick={() => void refresh()} disabled={isLoading} type="button">
                <RefreshCw size={14} /> Sync
              </button>
            </div>
          </header>
        )}

        {error && <div className="banner warning">{error}</div>}
        {view !== 'demo' && (
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
        )}

        <section className="screen">
          {view === 'book_demo' && <BookDemoWorkspace />}
          {view === 'demo' && <DialerWorkspace />}
          {view === 'ops' && <OpsWorkspace />}
        </section>
      </main>
    </div>
  );
}
