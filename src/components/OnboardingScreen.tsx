import { Phone, Zap, TrendingUp, Brain, Gauge } from 'lucide-react';

type OnboardingProps = {
  onComplete: () => void;
};

export function OnboardingScreen({ onComplete }: OnboardingProps) {
  return (
    <div className="min-h-screen neo-grid-bg flex flex-col">
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neo-brand" style={{ background: 'var(--neo-yellow)' }}>
            <Phone className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="neo-tag neo-tag-yellow">ECHO</div>
            <div className="neo-display text-4xl font-black leading-none mt-1">DIALER</div>
          </div>
        </div>
        <div className="neo-pill font-mono text-xs font-bold">
          Version 1.0.0 • 2026
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-4xl neo-panel-shadow bg-white p-8 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="neo-display text-6xl font-black leading-none">
              SELL SMARTER,<br />NOT HARDER
            </h1>
            <p className="font-mono text-sm font-bold opacity-70">
              AI-powered sales copilot that gives you the edge before every call.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureChip 
              icon={<Brain className="w-4 h-4" />}
              label="AI Research"
              description="Deep intel on every contact"
            />
            <FeatureChip 
              icon={<Phone className="w-4 h-4" />}
              label="Power Dialer"
              description="Speed dial with live insights"
            />
            <FeatureChip 
              icon={<Zap className="w-4 h-4" />}
              label="Smart Strategy"
              description="Personality-based battle cards"
            />
            <FeatureChip 
              icon={<TrendingUp className="w-4 h-4" />}
              label="Live Analytics"
              description="Track every metric that matters"
            />
          </div>

          <button
            onClick={onComplete}
            className="neo-btn neo-bg-yellow w-full h-14 text-lg font-black flex items-center justify-center gap-3"
          >
            Launch Echo <Gauge className="w-5 h-5" />
          </button>

          <div className="pt-6" style={{ borderTop: '3px solid var(--neo-ink)' }}>
            <p className="font-mono text-xs font-bold text-center opacity-60 mb-3">TRUSTED BY SALES TEAMS</p>
            <div className="flex items-center justify-center gap-6 opacity-80 font-mono text-sm font-bold">
              <span>Pipedrive</span>
              <span>OpenAI</span>
              <span>Supabase</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="neo-panel bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-black">{icon}</div>
        <p className="text-sm font-black">{label}</p>
      </div>
      <p className="font-mono text-xs font-bold opacity-70">{description}</p>
    </div>
  );
}
