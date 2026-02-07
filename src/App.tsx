import { useEffect, useMemo } from 'react';
import { useAuth } from './app/AuthContext';
import { useWorkspace } from './app/WorkspaceContext';
import { navigate, replace, useRoute, type Route } from './app/router';
import { LoadingScreen } from './components/mvp/LoadingScreen';
import { AppShell } from './components/mvp/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ContactsPage } from './pages/ContactsPage';
import { CallsPage } from './pages/CallsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { NavItem } from './components/EchoSidebar';

function navFromRoute(route: Route): NavItem {
  if (route.name === 'calls') return 'calls';
  if (route.name === 'settings') return 'settings';
  return 'contacts';
}

function pathFromNav(nav: NavItem): string {
  if (nav === 'calls') return '/calls';
  if (nav === 'settings') return '/settings';
  return '/contacts';
}

export default function App() {
  const route = useRoute();
  const { loading: authLoading, user } = useAuth();
  const { loading: wsLoading, workspace } = useWorkspace();

  // Route guards.
  useEffect(() => {
    if (authLoading) return;
    if (!user && route.name !== 'login') {
      replace('/login');
      return;
    }
    if (user && route.name === 'login') {
      replace('/contacts');
    }
  }, [authLoading, route.name, user]);

  const nav = useMemo(() => navFromRoute(route), [route]);

  if (authLoading) return <LoadingScreen label="Loading session…" />;

  if (!user) {
    return <LoginPage />;
  }

  // Workspace is required for all authed routes.
  if (wsLoading || !workspace) return <LoadingScreen label="Loading workspace…" />;

  const content = (() => {
    if (route.name === 'contacts') return <ContactsPage contactId={route.contactId} />;
    if (route.name === 'calls') return <CallsPage />;
    if (route.name === 'settings') return <SettingsPage />;
    return (
      <div className="figma-shell figma-grid-bg font-sans text-black">
        <div className="neo-panel-shadow bg-white p-6">
          <div className="neo-tag neo-tag-yellow">NOT FOUND</div>
          <div className="neo-display text-3xl font-black mt-2">Page not found</div>
          <button
            className="neo-btn neo-bg-yellow px-4 py-2 text-xs font-black uppercase tracking-widest mt-4"
            onClick={() => navigate('/contacts')}
          >
            Go to Contacts
          </button>
        </div>
      </div>
    );
  })();

  return (
    <AppShell
      active={nav}
      onNavigate={(next) => {
        const path = pathFromNav(next);
        navigate(path);
      }}
    >
      {content}
    </AppShell>
  );
}

