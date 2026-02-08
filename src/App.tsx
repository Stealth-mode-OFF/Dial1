import React, { useState, lazy, Suspense } from 'react';
import { Spinner } from './components/StatusIndicators';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy components for better initial load
const DialerApp = lazy(() => import('./DialerApp').then(m => ({ default: m.DialerApp })));
const MeetCoachApp = lazy(() => import('./MeetCoachApp').then(m => ({ default: m.MeetCoachApp })));
const DialPage = lazy(() => import('./pages/DialPage'));
const MeetPage = lazy(() => import('./pages/MeetPage'));

type AppMode = 'dialer' | 'meetcoach' | 'dial' | 'meet';

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
      <Spinner size={32} color="#2563eb" />
      <span style={{ fontSize: '14px', color: '#6b7280' }}>Loading...</span>
    </div>
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
      } else if (hash === '#dialer' || hash === '' || hash === '#') {
        setMode('dialer');
      }
    };
    
    window.addEventListener('hashchange', onHashChange);
    onHashChange();
    
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoader />}>
        {mode === 'dial' ? (
          <DialPage onSwitchMode={() => switchMode('meet')} />
        ) : mode === 'meet' ? (
          <MeetPage onSwitchMode={() => switchMode('dial')} />
        ) : mode === 'meetcoach' ? (
          <MeetCoachApp onSwitchMode={() => switchMode('dialer')} currentMode="meetcoach" />
        ) : (
          <DialerApp onSwitchMode={() => switchMode('meetcoach')} currentMode="dialer" />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
