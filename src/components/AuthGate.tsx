import { useState, useEffect, type FormEvent } from 'react';
import { supabaseClient } from '../utils/supabase/client';

type AuthGateProps = {
  children?: React.ReactNode;
  onAuthenticated?: () => void;
};

export function AuthGate({ children, onAuthenticated }: AuthGateProps) {
  // Bypass auth when:
  // 1. Explicit E2E bypass flag is set, OR
  // 2. DEV mode AND Supabase is not configured (no .env)
  const bypassAuth =
    import.meta.env.VITE_E2E_BYPASS_AUTH === 'true' ||
    (import.meta.env.DEV && !supabaseClient);
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
    if (bypassAuth) {
      setIsAuthenticated(true);
      return;
    }
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
  }, [bypassAuth]);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-loading-text">Loading…</div>
        </div>
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
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          setError(explainError(error.message) || error.message);
        } else {
          setMessage('Zkontroluj e-mail a potvrď registraci. Pak se přihlas.');
        }
        return;
      }

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
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
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">D1</span>
            <div className="auth-logo-text">
              <span className="auth-logo-name">Dial1</span>
              <span className="auth-logo-tag">Sales Intelligence</span>
            </div>
          </div>
          <div className="auth-badge">SECURE</div>
        </div>

        <h1 className="auth-title">Přihlášení</h1>
        <p className="auth-subtitle">Přihlášení pro tvůj sales tým. Použij e-mail a heslo.</p>

        {configError && (
          <div className="auth-config-error">
            {configError} (Doména: {currentHost}). Přidej ji do Supabase Auth → URL Configuration.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">E-mail</label>
            <input
              id="auth-email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">Heslo</label>
            <input
              id="auth-password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="••••••••"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
            />
          </div>

          {message && <div className="auth-message auth-message--success">{message}</div>}
          {error && <div className="auth-message auth-message--error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? 'Načítám…' : isRegistering ? 'Registrovat' : 'Přihlásit se'}
          </button>
        </form>

        {/* Toggle */}
        <div className="auth-toggle">
          <button
            type="button"
            onClick={() => { setIsRegistering(p => !p); setError(null); setMessage(null); }}
            className="auth-toggle-btn"
          >
            {isRegistering ? 'Už máš účet? Přihlas se' : 'Nemáš účet? Registruj se'}
          </button>
        </div>

        <p className="auth-footer-text">
          Přístup je omezen na ověřené uživatele Dial1 Sales Intelligence.
        </p>
      </div>
    </div>
  );
}
