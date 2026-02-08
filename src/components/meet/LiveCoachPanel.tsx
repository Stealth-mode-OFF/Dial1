import React from 'react';
import type { LiveCoachResponse } from '../../types/contracts';

export function LiveCoachPanel({
  response,
  loading,
}: {
  response: LiveCoachResponse | null;
  loading: boolean;
}) {
  return (
    <div className="dp-panel dp-live-coach">
      <div className="dp-panel-header">
        <span className="dp-panel-title">🎯 Live Coach</span>
        {loading && <span className="dp-loading-dot" />}
      </div>

      {!response && !loading && (
        <p className="dp-empty">
          Tips will appear here once captions start flowing.
        </p>
      )}

      {response && (
        <>
          <div className="dp-tips">
            {response.tips.map((tip) => (
              <div
                key={tip.id}
                className={`dp-tip dp-tip-${tip.priority}`}
              >
                <span className="dp-tip-indicator" />
                <span className="dp-tip-text">{tip.text}</span>
              </div>
            ))}
          </div>

          {response.nextSpinQuestion && (
            <div className="dp-next-spin">
              <span className="dp-next-spin-phase">{response.nextSpinQuestion.phase}</span>
              <span className="dp-next-spin-q">{response.nextSpinQuestion.question}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
