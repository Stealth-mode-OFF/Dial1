import { useState } from 'react';
import { BrainCircuit, CheckCircle2, User, Zap } from 'lucide-react';

export type SalesStyle = 'hunter' | 'consultative';

type SettingsScreenProps = {
  salesStyle: SalesStyle;
  setSalesStyle: (style: SalesStyle) => void;
};

export function SettingsScreen({ salesStyle, setSalesStyle }: SettingsScreenProps) {
  const [profileName, setProfileName] = useState('Alex Salesman');
  const [profileRole, setProfileRole] = useState('Senior AE');

  return (
    <div className="figma-shell figma-grid-bg space-y-6 pb-16">
      <div className="neo-panel-shadow bg-white p-6 flex items-center justify-between">
        <div>
          <div className="neo-tag neo-tag-yellow">SYSTEM CONFIGURATION</div>
          <h1 className="neo-display text-5xl font-black leading-none mt-3">CONTROL ROOM</h1>
          <p className="font-mono text-sm font-bold opacity-70 mt-2">
            Uprav integrace, znalostní bázi a AI persona.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 neo-panel-shadow bg-white p-5 space-y-4">
          <div className="neo-tag neo-tag-yellow">PROFILE</div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider opacity-70">
            Name
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              className="neo-input w-full px-3 py-2 mt-2 font-mono"
              placeholder="Alex Salesman"
            />
          </label>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider opacity-70">
            Role
            <input
              value={profileRole}
              onChange={(event) => setProfileRole(event.target.value)}
              className="neo-input w-full px-3 py-2 mt-2 font-mono"
              placeholder="Senior AE"
            />
          </label>
        </div>

        <div className="col-span-12 lg:col-span-8 neo-panel-shadow bg-white overflow-hidden">
          <div
            className="p-6 neo-panel"
            style={{ borderBottom: '3px solid var(--neo-ink)', background: 'var(--neo-paper-muted)' }}
          >
            <h2 className="neo-display text-3xl font-black flex items-center gap-2">
              <BrainCircuit className="w-5 h-5" />
              AI Sales Persona
            </h2>
            <p className="font-mono text-sm font-bold opacity-70 mt-1">
              Vyber styl, který bude AI používat při generování skriptů a e-mailů.
            </p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => setSalesStyle('hunter')}
              className={`cursor-pointer neo-panel p-6 transition-all ${
                salesStyle === 'hunter' ? 'neo-bg-yellow' : 'bg-white hover:-translate-y-[2px]'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="neo-panel bg-white p-2" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                  <Zap className="w-6 h-6" />
                </div>
                {salesStyle === 'hunter' && <CheckCircle2 className="w-5 h-5" />}
              </div>
              <h3 className="neo-display text-2xl font-black mb-2">The Challenger (Hunter)</h3>
              <p className="font-mono text-xs font-bold leading-relaxed opacity-80">
                Krátké věty, důraz na ROI a rychlost. Ideální pro cold calling a saturaci trhu.
              </p>
            </div>

            <div
              onClick={() => setSalesStyle('consultative')}
              className={`cursor-pointer neo-panel p-6 transition-all ${
                salesStyle === 'consultative' ? 'neo-bg-blue' : 'bg-white hover:-translate-y-[2px]'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="neo-panel bg-white p-2" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                  <User className="w-6 h-6" />
                </div>
                {salesStyle === 'consultative' && <CheckCircle2 className="w-5 h-5" />}
              </div>
              <h3 className="neo-display text-2xl font-black mb-2">The Advisor (Consultative)</h3>
              <p className="font-mono text-xs font-bold leading-relaxed opacity-80">
                Empatický tón, otázky na problémy a vztahové budování. Ideální pro Enterprise dealy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
