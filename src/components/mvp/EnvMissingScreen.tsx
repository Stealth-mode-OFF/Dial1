export function EnvMissingScreen() {
  return (
    <div className="min-h-screen neo-grid-bg text-black flex items-center justify-center px-4">
      <div className="neo-panel-shadow bg-white p-8 max-w-xl w-full space-y-4">
        <div className="neo-tag neo-tag-yellow">CONFIG REQUIRED</div>
        <h1 className="neo-display text-3xl font-black">Supabase env vars missing</h1>
        <p className="font-mono text-sm font-bold opacity-80">
          Set these environment variables and reload:
        </p>
        <div className="neo-panel bg-white p-4 font-mono text-xs font-bold space-y-1" style={{ boxShadow: 'none' }}>
          <div>VITE_SUPABASE_URL</div>
          <div>VITE_SUPABASE_ANON_KEY</div>
        </div>
        <p className="font-mono text-xs opacity-70">
          For local dev, copy <span className="font-bold">.env.example</span> to <span className="font-bold">.env</span>.
          For Vercel, set the same vars in Project Settings → Environment Variables.
        </p>
      </div>
    </div>
  );
}

