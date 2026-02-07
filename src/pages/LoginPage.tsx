import { useEffect, useState, type FormEvent } from 'react';
import { useAdapter } from '../app/AdapterContext';
import { useAuth } from '../app/AuthContext';
import { replace } from '../app/router';

export function LoginPage() {
  const adapter = useAdapter();
  const { user } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) replace('/contacts');
  }, [user]);

  const explainError = (raw: string) => {
    if (!raw) return null;
    const msg = raw.toLowerCase();
    if (msg.includes('invalid login credentials')) {
      return 'Nesprávný e-mail nebo heslo.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Účet čeká na potvrzení e-mailu. Ověř e-mail a zkus to znovu.';
    }
    if (msg.includes('redirect') && (msg.includes('not allowed') || msg.includes('not authorized'))) {
      return 'Registrace selhala kvůli Supabase Auth nastavení (Redirect URL). Přidej https://dial1.vercel.app a/nebo svou doménu do Supabase Auth → URL Configuration → Redirect URLs.';
    }
    if (msg.includes('signup') && msg.includes('disabled')) {
      return 'Registrace je vypnutá v Supabase. Zapni ji v Supabase Auth, nebo si uživatele vytvoř ručně.';
    }
    if (msg.includes('signups not allowed')) {
      return 'Registrace je vypnutá v Supabase. Zapni ji v Supabase Auth, nebo si uživatele vytvoř ručně.';
    }
    if (msg.includes('user already registered') || msg.includes('already registered')) {
      return 'Účet s tímto e-mailem už existuje. Zkus se přihlásit.';
    }
    return raw;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const result = await adapter.signUp(email.trim(), password);
        if (result.requiresEmailConfirmation) {
          setMessage('Účet vytvořen. Zkontroluj e-mail a potvrď registraci. Potom se tady přihlas.');
          setMode('signin');
        } else {
          // If email confirmations are disabled, Supabase may create a session immediately.
          setMessage('Účet vytvořen. Přihlašuji…');
          replace('/contacts');
        }
        return;
      }
      await adapter.signIn(email.trim(), password);
      replace('/contacts');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(explainError(msg) || msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen neo-grid-bg flex items-center justify-center px-4 text-black">
      <div className="w-full max-w-lg neo-panel-shadow bg-white p-8 space-y-6">
        <div>
          <div className="neo-tag neo-tag-yellow">SECURE ACCESS</div>
          <h1 className="neo-display text-4xl font-black mt-3">Echo Dialer</h1>
          <p className="font-mono text-sm font-bold opacity-70 mt-1">
            {mode === 'signup' ? 'Create an account.' : 'Sign in with email + password.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block font-mono text-xs font-bold uppercase tracking-[0.2em] opacity-80">
            Email
            <input
              type="email"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 neo-input w-full px-3 py-2 font-mono"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </label>
          <label className="block font-mono text-xs font-bold uppercase tracking-[0.2em] opacity-80">
            Password
            <input
              type="password"
              required
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 neo-input w-full px-3 py-2 font-mono"
              placeholder="••••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
            />
          </label>

          {message ? (
            <div className="font-mono text-sm" style={{ color: 'var(--neo-green)' }}>
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="font-mono text-sm" style={{ color: 'var(--neo-red)' }}>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="neo-btn neo-bg-yellow w-full px-4 py-3 text-sm font-black uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {busy ? 'Processing…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="text-center font-mono text-xs font-bold uppercase tracking-[0.2em] opacity-80">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError(null);
              setMessage(null);
            }}
            className="neo-btn bg-white px-3 py-2"
            disabled={busy}
          >
            {mode === 'signup' ? 'Have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
}
