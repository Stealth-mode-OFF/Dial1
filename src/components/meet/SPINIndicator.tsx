import type { CSSProperties } from 'react';

import { SPIN_PHASES } from '../../features/meetcoach/constants';
import { formatTime } from '../../features/meetcoach/helpers';
import type { SPINPhase } from '../../features/meetcoach/types';

interface SPINIndicatorProps {
  currentPhase: SPINPhase;
  phaseTime: number;
  totalTime: number;
  onPhaseChange: (phase: SPINPhase) => void;
}

export function SPINIndicator({ currentPhase, phaseTime, totalTime, onPhaseChange }: SPINIndicatorProps) {
  const current = SPIN_PHASES.find((p) => p.id === currentPhase)!;
  const currentIndex = SPIN_PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div className="mc-spin-bar" style={{ '--phase-color': current.color } as CSSProperties}>
      <div className="mc-spin-phases">
        {SPIN_PHASES.map((phase, idx) => (
          <button
            key={phase.id}
            className={`mc-spin-phase ${phase.id === currentPhase ? 'active' : ''} ${idx < currentIndex ? 'done' : ''}`}
            onClick={() => onPhaseChange(phase.id)}
            style={{ '--phase-color': phase.color } as CSSProperties}
          >
            <span className="mc-spin-icon">{phase.icon}</span>
            <span className="mc-spin-name">{phase.name}</span>
          </button>
        ))}
      </div>
      <div className="mc-spin-timer">
        <span className="mc-spin-timer-phase">{formatTime(phaseTime)}</span>
        <span className="mc-spin-timer-total">{formatTime(totalTime)}</span>
      </div>
    </div>
  );
}
