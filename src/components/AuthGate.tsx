import { useState, useEffect, type FormEvent } from 'react';
import { supabaseClient } from '../utils/supabase/client';

type AuthGateProps = {
  children?: React.ReactNode;
  onAuthenticated?: () => void;
};

export function AuthGate({ children, onAuthenticated }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const currentHost =
    typeof window !== 'undefined' ? window.location.hostname : 'www.echopulse.cz';

  const explainError = (raw: string) => {
    if (!raw) return null;
    const msg = raw.toLowerCase();
    if (msg.includes('invalid login credentials')) {
      return 'Nesprávný e-mail nebo heslo. Zkontroluj údaje.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Účet čeká na potvrzení e-mailu. Ověř e-mail a přihlas se znovu.';
    }
    if (msg.includes('jwt')) {
      return 'Relace vypršela. Přihlas se znovu.';
    }
    return raw;
  };

  useEffect(() => {
    if (!supabaseClient) {
      setIsAuthenticated(false);
      return;
    }

    // Check current session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen neo-grid-bg text-black flex items-center justify-center">
        <div className="neo-panel-shadow bg-white px-6 py-4 font-mono font-bold">Loading…</div>
      </div>
    );
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabaseClient) {
      setConfigError(
        'Supabase není nakonfigurován. Na hostingu musí být VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (a doména povolená v Auth).',
      );
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isRegistering) {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(explainError(error.message) || error.message);
      } else {
        setMessage(
          'Check your inbox for a confirmation link. After verifying, log in here.',
        );
      }
        return;
      }

      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(explainError(error.message) || error.message);
      } else {
        onAuthenticated?.();
        setMessage(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen neo-grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-lg neo-panel-shadow bg-white p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="neo-tag neo-tag-yellow">SECURE ACCESS</div>
            <h1 className="neo-display text-4xl font-black mt-3">ECHO PULSE</h1>
            <p className="font-mono text-sm font-bold opacity-70 mt-1">
              Přihlášení pro tvůj sales tým. Použij e-mail a heslo.
            </p>
            {configError && (
              <p className="mt-2 font-mono text-xs" style={{ color: 'var(--neo-red)' }}>
                {configError} (Doména: {currentHost}). Přidej ji do Supabase Auth → URL Configuration.
              </p>
            )}
          </div>
          <div className="neo-panel bg-black text-white w-12 h-12 flex items-center justify-center font-black">ID</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block font-mono text-xs font-bold uppercase tracking-[0.2em] opacity-80">
            Email
            <input
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 neo-input w-full px-3 py-2 font-mono"
              placeholder="you@company.com"
            />
          </label>
          <label className="block font-mono text-xs font-bold uppercase tracking-[0.2em] opacity-80">
            Password
            <input
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 neo-input w-full px-3 py-2 font-mono"
              placeholder="••••••••••"
            />
          </label>
          {message && (
            <div className="font-mono text-sm" style={{ color: 'var(--neo-green)' }}>{message}</div>
          )}
          {error && <div className="font-mono text-sm" style={{ color: 'var(--neo-red)' }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="neo-btn neo-bg-yellow w-full px-4 py-3 text-sm font-black uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {loading
              ? 'Processing…'
              : isRegistering
              ? 'Register'
              : 'Sign In'}
          </button>
        </form>
        <div className="text-center font-mono text-xs font-bold uppercase tracking-[0.2em] opacity-80">
          <button
            type="button"
            onClick={() => {
              setIsRegistering((prev) => !prev);
              setError(null);
              setMessage(null);
            }}
            className="neo-btn bg-white px-3 py-2"
          >
            {isRegistering ? 'Already have an account? Sign in' : 'Need account? Register'}
          </button>
        </div>
        <p className="font-mono text-xs opacity-60">
          Tento přístup je omezen; jen ověření uživatelé mohou do Echo Pulse a Live Sales Coaching.
        </p>
      </div>
    </div>
  );
}
