import React, { useEffect, useMemo, useState } from 'react';
import { Bolt, PhoneCall } from 'lucide-react';
import { BookDemoWorkspace } from './pages/BookDemoWorkspace';
import { DemoWorkspace } from './pages/DemoWorkspace';

type View = 'lead' | 'call';

export default function App() {
  const [view, setView] = useState<View>('lead');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'default');
  }, []);

  const title = useMemo(() => (view === 'lead' ? 'Lead Brief' : 'Live Call Coach'), [view]);
  const subtitle = useMemo(
    () =>
      view === 'lead'
        ? 'Jeden lead. Hotové intel + skript. Bez šumu.'
        : 'Google Meet titulky → jedna další věta + SPIN runbook.',
    [view],
  );

  return (
    <div className="canvas" data-testid="app-root">
      <header className="topbar" data-testid="app-topbar">
        <div>
          <p className="eyebrow">
            <Bolt size={14} /> Echo OS
          </p>
          <h1 data-testid="view-title">{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>

        <div className="button-row" data-testid="nav-tabs">
          <button
            className={`btn ghost sm ${view === 'lead' ? 'active' : ''}`}
            onClick={() => setView('lead')}
            data-testid="nav-lead"
            type="button"
          >
            Lead Brief
          </button>
          <button
            className={`btn ghost sm ${view === 'call' ? 'active' : ''}`}
            onClick={() => setView('call')}
            data-testid="nav-call"
            type="button"
          >
            <PhoneCall size={14} /> Live Call
          </button>
        </div>
      </header>

      <section className="screen">
        {view === 'lead' && <BookDemoWorkspace />}
        {view === 'call' && <DemoWorkspace />}
      </section>
    </div>
  );
}
