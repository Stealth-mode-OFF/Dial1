import React from 'react';
import { Bolt, HelpCircle, Search } from 'lucide-react';

export type ShellView = 'lead' | 'call';
export type StatusTone = 'subtle' | 'success' | 'warning';

export type StatusPill = { text: string; tone?: StatusTone };

export function TerminalShell({
  view,
  onViewChange,
  title,
  subtitle,
  status,
  onOpenSearch,
  onOpenHelp,
  topbarAccessory,
  bottomBar,
  children,
}: {
  view: ShellView;
  onViewChange: (view: ShellView) => void;
  title: string;
  subtitle?: string;
  status?: StatusPill | null;
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  topbarAccessory?: React.ReactNode;
  bottomBar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="terminal-shell" data-testid="app-root">
      <header className="terminal-topbar" data-testid="app-topbar">
        <div className="terminal-brand">
          <p className="eyebrow">
            <Bolt size={14} /> Echo OS
          </p>
          <h1 data-testid="view-title">{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>

        <div className="terminal-search">
          <button className="search-trigger" type="button" onClick={onOpenSearch} aria-label="Search (Ctrl/Cmd+K)">
            <Search size={16} />
            <span className="muted">Search</span>
            <span className="kbd">Ctrl/⌘ K</span>
          </button>
        </div>

        <div className="terminal-actions">
          {topbarAccessory ? <div className="terminal-accessory">{topbarAccessory}</div> : null}
          <div className="button-row" data-testid="nav-tabs">
            <button
              className={`btn ghost sm ${view === 'lead' ? 'active' : ''}`}
              onClick={() => onViewChange('lead')}
              data-testid="nav-lead"
              type="button"
            >
              Lead Brief
            </button>
            <button
              className={`btn ghost sm ${view === 'call' ? 'active' : ''}`}
              onClick={() => onViewChange('call')}
              data-testid="nav-call"
              type="button"
            >
              Live Call
            </button>
          </div>

          {status ? <span className={`pill ${status.tone || 'subtle'}`}>{status.text}</span> : null}

          <button className="btn icon" type="button" onClick={onOpenHelp} aria-label="Help (?)">
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      <main className="terminal-main">
        <section className="terminal-screen">{children}</section>
      </main>

      {bottomBar ? <footer className="terminal-bottombar">{bottomBar}</footer> : null}
    </div>
  );
}

