import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  value,
  children,
}: {
  value: AuthState;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}

