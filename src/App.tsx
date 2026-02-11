import React, { useState, lazy, Suspense } from 'react';
import { Spinner } from './components/StatusIndicators';
import { ErrorBoundary } from './components/ErrorBoundary';
import './dialer-v2.css';
import './transcript-analyzer.css';
import './battlecards.css';
import './styles/wow.css';

// Lazy load heavy components for better initial load
const DialerApp = lazy(() => import('./DialerAppNew').then(m => ({ default: m.DialerApp })));
const MeetCoachApp = lazy(() => import('./MeetCoachAppNew').then(m => ({ default: m.MeetCoachAppNew })));
const DialPage = lazy(() => import('./pages/DialPage'));
const MeetPage = lazy(() => import('./pages/MeetPage'));
const AnalysisDashboard = lazy(() => import('./components/TranscriptAnalyzer').then(m => ({ default: m.AnalysisDashboard })));
const BattleCardsPage = lazy(() => import('./pages/BattleCardsPage').then(m => ({ default: m.BattleCardsPage })));

type AppMode = 'dialer' | 'meetcoach' | 'dial' | 'meet' | 'analyze' | 'battlecards';

// Section metadata for nav tabs
const LEFT_TABS: { id: AppMode; label: string; hash: string }[] = [
  { id: 'dialer',      label: 'Dialer',    hash: '#dialer' },
  { id: 'battlecards', label: 'Karty',     hash: '#battlecards' },
];
const RIGHT_TABS: { id: AppMode; label: string; hash: string }[] = [
  { id: 'meetcoach',   label: 'Meet',      hash: '#meet' },
  { id: 'analyze',     label: 'Anályza',   hash: '#analyze' },
];

// Loading fallback component
function AppLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '16px',
      background: '#fafbfc',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'grid',
        placeItems: 'center',
        animation: 'wow-float 2s ease-in-out infinite',
        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
      }}>
        <span style={{ color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: '0.05em' }}>D1</span>
      </div>
      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Loading...</span>
    </div>
  );
}

// Unified top navigation
function AppNav({ mode, onSwitch }: { mode: AppMode; onSwitch: (m: AppMode) => void }) {
  const renderTab = (sec: { id: AppMode; label: string }) => (
    <button
      key={sec.id}
      role="tab"
      aria-selected={mode === sec.id}
      className={`app-nav-tab${mode === sec.id ? ' app-nav-tab-active' : ''}`}
      data-tab={sec.id}
      onClick={() => onSwitch(sec.id)}
    >
      <span className="app-nav-tab-label">{sec.label}</span>
    </button>
  );

  return (
    <nav className="app-nav" role="navigation" aria-label="Hlavní navigace">
      <div className="app-nav-left">
        <span className="app-nav-logo" onClick={() => onSwitch('dialer')}>D1</span>
        <div className="app-nav-tabs" role="tablist">
          {LEFT_TABS.map(renderTab)}
        </div>
      </div>
      <div className="app-nav-right">
        <div className="app-nav-tabs" role="tablist">
          {RIGHT_TABS.map(renderTab)}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('dialer');

  // Function to switch modes and update URL
  const switchMode = (newMode: AppMode) => {
    setMode(newMode);
    const hashMap: Record<AppMode, string> = {
      dialer: '#dialer',
      meetcoach: '#meet',
      dial: '#dial',
      meet: '#meet-page',
      analyze: '#analyze',
      battlecards: '#battlecards',
    };
    window.location.hash = hashMap[newMode] || '#dialer';
  };

  // URL-based routing
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path === '/coach' || path === '/meet' || path === '/demo') {
      setMode('meetcoach');
    } else if (path === '/dial') {
      setMode('dial');
    } else if (path === '/meet-page') {
      setMode('meet');
    }
    
    // Listen for hash changes
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#coach' || hash === '#meet') {
        setMode('meetcoach');
      } else if (hash === '#dial') {
        setMode('dial');
      } else if (hash === '#meet-page') {
        setMode('meet');
      } else if (hash === '#analyze') {
        setMode('analyze');
      } else if (hash === '#battlecards') {
        setMode('battlecards');
      } else if (hash === '#dialer' || hash === '' || hash === '#') {
        setMode('dialer');
      }
    };
    
    window.addEventListener('hashchange', onHashChange);
    onHashChange();
    
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Show the unified nav for primary modes (not legacy dial/meet pages)
  const showNav = mode !== 'dial' && mode !== 'meet';

  return (
    <ErrorBoundary>
      <div className={`app-shell${showNav ? ' has-nav' : ''}`}>
        {showNav && <AppNav mode={mode} onSwitch={switchMode} />}
        <div className="app-content">
          <Suspense fallback={<AppLoader />}>
            {mode === 'dial' ? (
              <DialPage onSwitchMode={() => switchMode('meet')} />
            ) : mode === 'meet' ? (
              <MeetPage onSwitchMode={() => switchMode('dial')} />
            ) : mode === 'analyze' ? (
              <AnalysisDashboard />
            ) : mode === 'battlecards' ? (
              <BattleCardsPage />
            ) : mode === 'meetcoach' ? (
              <MeetCoachApp />
            ) : (
              <DialerApp />
            )}
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  );
}
