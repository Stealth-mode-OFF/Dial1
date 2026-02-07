import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { createSupabaseAdapter } from '../data/supabaseAdapter';
import { AdapterProvider } from './AdapterContext';
import { AuthProvider } from './AuthContext';
import { WorkspaceProvider } from './WorkspaceContext';
import type { Workspace } from '../data/types';
import { EnvMissingScreen } from '../components/mvp/EnvMissingScreen';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const adapter = useMemo(() => (supabase ? createSupabaseAdapter(supabase) : null), [supabase]);

  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) console.warn('auth.getSession failed', error);
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setAuthLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('auth.getSession threw', err);
        setAuthLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!adapter) return;
    if (!user) {
      setWorkspace(null);
      setWorkspaceLoading(false);
      return;
    }

    let cancelled = false;
    setWorkspaceLoading(true);
    adapter
      .ensureWorkspaceForUser()
      .then((ws) => {
        if (cancelled) return;
        setWorkspace(ws);
      })
      .catch((err) => {
        console.warn('ensureWorkspaceForUser failed', err);
        if (cancelled) return;
        setWorkspace(null);
      })
      .finally(() => {
        if (cancelled) return;
        setWorkspaceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, user]);

  if (!isSupabaseConfigured() || !supabase || !adapter) {
    return <EnvMissingScreen />;
  }

  return (
    <AdapterProvider adapter={adapter}>
      <AuthProvider value={{ loading: authLoading, user, session, supabase }}>
        <WorkspaceProvider value={{ loading: workspaceLoading, workspace }}>
          {children}
        </WorkspaceProvider>
      </AuthProvider>
    </AdapterProvider>
  );
}

