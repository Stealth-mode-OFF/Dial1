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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        await adapter.signUp(email.trim(), password);
        setMessage('Account created. You can sign in now.');
        setMode('signin');
        return;
      }
      await adapter.signIn(email.trim(), password);
      replace('/contacts');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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

