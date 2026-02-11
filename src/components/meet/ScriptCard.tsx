import type { CSSProperties } from 'react';

import { SPIN_PHASES } from '../../features/meetcoach/constants';
import type { ScriptBlock } from '../../features/meetcoach/types';

interface ScriptCardProps {
  block: ScriptBlock;
  onNext: () => void;
  onPrev: () => void;
  currentIndex: number;
  totalBlocks: number;
  aiSuggestion?: { label: string; text: string } | null;
  risk?: string | null;
}

export function ScriptCard({
  block,
  onNext,
  onPrev,
  currentIndex,
  totalBlocks,
  aiSuggestion,
  risk,
}: ScriptCardProps) {
  const phase = SPIN_PHASES.find((p) => p.id === block.phase)!;
  const primaryText = aiSuggestion?.text || block.text;

  return (
    <div className="mc-script-card" style={{ '--phase-color': phase.color } as CSSProperties}>
      <div className="mc-script-header">
        <span className="mc-script-phase">{phase.icon} {phase.name}</span>
        <div className="mc-script-header-right">
          {risk ? <span className="mc-risk">⚠ {risk}</span> : null}
          <span className="mc-script-counter">{currentIndex + 1} / {totalBlocks}</span>
        </div>
      </div>
      <div className={`mc-script-main ${block.type !== 'question' ? 'mc-script-main--tip' : ''}`}>
        {block.type !== 'question' && (
          <div className="mc-tip-badge">🧠 {block.type === 'tip' ? 'Tip pro tebe' : 'Přechod'} — <em>nečti nahlas</em></div>
        )}
        {aiSuggestion ? <div className="mc-ai-suggest-label">{aiSuggestion.label}</div> : null}
        <p className={`mc-script-text ${block.type !== 'question' ? 'mc-script-text--tip' : ''}`}>{primaryText}</p>
        {aiSuggestion ? (
          <p className="mc-script-followup">
            <span className="mc-script-followup-label">Plán:</span> {block.text}
          </p>
        ) : block.followUp ? (
          <p className="mc-script-followup">
            <span className="mc-script-followup-label">Doptání:</span> {block.followUp}
          </p>
        ) : null}
      </div>
      <div className="mc-script-nav">
        <button className="mc-script-btn secondary" onClick={onPrev} disabled={currentIndex === 0}>
          ← Předchozí
        </button>
        <button className="mc-script-btn primary" onClick={onNext}>
          {currentIndex === totalBlocks - 1 ? 'Dokončit →' : 'Další →'}
        </button>
      </div>
      <p className="mc-script-hint">← → šipky pro navigaci • Esc pro ukončení</p>
    </div>
  );
}
