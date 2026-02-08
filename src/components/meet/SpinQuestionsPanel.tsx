import React, { useState, useMemo } from 'react';
import { Copy } from 'lucide-react';
import type { SpinPhase, SpinQuestion } from '../../types/contracts';

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

const PHASES: { id: SpinPhase; label: string; color: string }[] = [
  { id: 'S', label: 'Situation', color: '#3b82f6' },
  { id: 'P', label: 'Problem', color: '#f59e0b' },
  { id: 'I', label: 'Implication', color: '#ef4444' },
  { id: 'N', label: 'Need-Payoff', color: '#10b981' },
];

// Default questions when none are provided from API
const DEFAULT_QUESTIONS: SpinQuestion[] = [
  { id: 's1', phase: 'S', question: 'How large is your sales team today?', followUp: 'How many reps are actively dialing?' },
  { id: 's2', phase: 'S', question: 'What tools do you use for pipeline management?' },
  { id: 's3', phase: 'S', question: 'How many calls per day does each rep make?' },
  { id: 'p1', phase: 'P', question: 'What is your biggest challenge with cold outreach?' },
  { id: 'p2', phase: 'P', question: 'How much time does prep take before each call?', followUp: 'What would you do with that time back?' },
  { id: 'p3', phase: 'P', question: 'Where do you lose the most deals in the pipeline?' },
  { id: 'i1', phase: 'I', question: 'If each rep loses 2 hours/day to prep, what does that cost monthly?' },
  { id: 'i2', phase: 'I', question: 'How does slow follow-up affect your win rate?' },
  { id: 'i3', phase: 'I', question: 'What happens to team morale when connect rates stay low?' },
  { id: 'n1', phase: 'N', question: 'If you could cut prep time by 80%, what would change?' },
  { id: 'n2', phase: 'N', question: 'What would real-time coaching during calls mean for new reps?' },
  { id: 'n3', phase: 'N', question: 'How would instant company intel before each call affect your connect rate?' },
];

export function SpinQuestionsPanel({
  questions,
  activePhase,
  onPhaseChange,
}: {
  questions?: SpinQuestion[];
  activePhase: SpinPhase;
  onPhaseChange: (phase: SpinPhase) => void;
}) {
  const allQuestions = questions && questions.length > 0 ? questions : DEFAULT_QUESTIONS;

  const phaseQuestions = useMemo(
    () => allQuestions.filter((q) => q.phase === activePhase),
    [allQuestions, activePhase],
  );

  return (
    <div className="dp-panel dp-spin">
      <div className="dp-panel-title">SPIN Questions</div>

      {/* Phase Toggle */}
      <div className="dp-spin-toggle">
        {PHASES.map((p) => (
          <button
            key={p.id}
            className={`dp-spin-btn ${activePhase === p.id ? 'active' : ''}`}
            style={{ '--phase-color': p.color } as React.CSSProperties}
            onClick={() => onPhaseChange(p.id)}
          >
            {p.id}
          </button>
        ))}
      </div>

      {/* Phase Label */}
      <div className="dp-spin-phase-label">
        {PHASES.find((p) => p.id === activePhase)?.label}
      </div>

      {/* Questions */}
      <div className="dp-spin-questions">
        {phaseQuestions.map((q) => (
          <div key={q.id} className="dp-spin-q">
            <div className="dp-spin-q-main">
              <span className="dp-spin-q-text">{q.question}</span>
              <button className="dp-copy-btn" onClick={() => copyText(q.question)} title="Copy">
                <Copy size={12} />
              </button>
            </div>
            {q.followUp && (
              <div className="dp-spin-q-followup">
                ↳ {q.followUp}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
