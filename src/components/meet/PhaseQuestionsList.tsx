import type { CSSProperties } from 'react';

import { SPIN_PHASES } from '../../features/meetcoach/constants';
import type { ScriptBlock, SPINPhase } from '../../features/meetcoach/types';

interface PhaseQuestionsListProps {
  script: ScriptBlock[];
  currentPhase: SPINPhase;
  currentBlockIndex: number;
  onJump: (index: number) => void;
}

export function PhaseQuestionsList({
  script,
  currentPhase,
  currentBlockIndex,
  onJump,
}: PhaseQuestionsListProps) {
  const phaseInfo = SPIN_PHASES.find((p) => p.id === currentPhase)!;
  const phaseBlocks = script
    .map((block, index) => ({ block, globalIndex: index }))
    .filter(({ block }) => block.phase === currentPhase);

  return (
    <div className="mc-sidebar-section">
      <div className="mc-sidebar-heading" style={{ color: phaseInfo.color } as CSSProperties}>
        {phaseInfo.icon} {phaseInfo.name} — otázky ({phaseBlocks.length})
      </div>
      <ul className="mc-phase-questions">
        {phaseBlocks.map(({ block, globalIndex }) => (
          <li
            key={globalIndex}
            className={`mc-phase-q ${globalIndex === currentBlockIndex ? 'mc-phase-q--active' : ''} ${block.type !== 'question' ? 'mc-phase-q--tip' : ''}`}
            onClick={() => onJump(globalIndex)}
          >
            <span className="mc-phase-q-marker">
              {globalIndex === currentBlockIndex ? '▸' : block.type === 'question' ? '○' : '·'}
            </span>
            <span className="mc-phase-q-text">{block.text}</span>
            {block.type !== 'question' && (
              <span className="mc-phase-q-badge">{block.type === 'tip' ? 'tip' : '→'}</span>
            )}
          </li>
        ))}
        {phaseBlocks.length === 0 && (
          <li className="mc-phase-q mc-phase-q--empty">Žádné otázky pro tuto fázi</li>
        )}
      </ul>
    </div>
  );
}
