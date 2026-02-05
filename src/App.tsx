import React, { useState, lazy, Suspense } from 'react';
import { Spinner } from './components/StatusIndicators';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy components for better initial load
const DialerApp = lazy(() => import('./DialerApp').then(m => ({ default: m.DialerApp })));
const MeetCoachApp = lazy(() => import('./MeetCoachApp').then(m => ({ default: m.MeetCoachApp })));

type AppMode = 'dialer' | 'meetcoach';

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
    window.location.hash = newMode === 'meetcoach' ? '#meet' : '#dialer';
  };

  // URL-based routing
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path === '/coach' || path === '/meet' || path === '/demo') {
      setMode('meetcoach');
    }
    
    // Listen for hash changes
    const onHashChange = () => {
      if (window.location.hash === '#coach' || window.location.hash === '#meet') {
        setMode('meetcoach');
      } else if (window.location.hash === '#dialer' || window.location.hash === '') {
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
        {mode === 'meetcoach' ? (
          <MeetCoachApp onSwitchMode={() => switchMode('dialer')} currentMode="meetcoach" />
        ) : (
          <DialerApp onSwitchMode={() => switchMode('meetcoach')} currentMode="dialer" />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
