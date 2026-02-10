/**
 * BattleCardFlip.tsx – Single flip-card component for objection handling.
 *
 * Front: title + whatProspectSays + category badge
 * Back:  whatTheyMean, commonMistake, functionalResponse (copy), conversationDirection (copy)
 *
 * Pure CSS flip with perspective transform. Keyboard accessible (Enter/Space).
 */

import React, { useState, useCallback } from 'react';
import type { ObjectionCard } from '../data/objectionCards';
import { CATEGORY_LABELS } from '../data/objectionCards';

interface BattleCardFlipProps {
  card: ObjectionCard;
}

export const BattleCardFlip: React.FC<BattleCardFlipProps> = ({ card }) => {
  const [flipped, setFlipped] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const catMeta = CATEGORY_LABELS[card.category];

  const toggle = useCallback(() => setFlipped((f) => !f), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    [toggle],
  );

  const copyToClipboard = useCallback(
    (text: string, field: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    },
    [],
  );

  const responseText = card.functionalResponse.join('\n');

  return (
    <div
      className={`bc-flip-container${flipped ? ' bc-flipped' : ''}`}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Karta: ${card.title}. ${flipped ? 'Otočená – stiskni pro zavření' : 'Stiskni pro otočení'}`}
      aria-pressed={flipped}
    >
      <div className="bc-flip-inner">
        {/* ====== FRONT ====== */}
        <div className="bc-face bc-front">
          <span
            className="bc-category-badge"
            style={{ '--cat-color': catMeta.color } as React.CSSProperties}
          >
            {catMeta.emoji} {catMeta.label}
          </span>
          <h3 className="bc-front-title">{card.title}</h3>
          <p className="bc-front-says">„{card.whatProspectSays}"</p>
          <span className="bc-flip-hint">Klikni pro odpověď →</span>
        </div>

        {/* ====== BACK ====== */}
        <div className="bc-face bc-back" onClick={(e) => e.stopPropagation()}>
          <div className="bc-back-scroll">
            <div className="bc-back-header">
              <span
                className="bc-category-badge bc-category-badge-sm"
                style={{ '--cat-color': catMeta.color } as React.CSSProperties}
              >
                {catMeta.emoji} {catMeta.label}
              </span>
              <button
                className="bc-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                aria-label="Zavřít kartu"
              >
                ✕
              </button>
            </div>

            <h3 className="bc-back-title">{card.title}</h3>

            <div className="bc-section">
              <div className="bc-section-label">🎯 Co tím myslí</div>
              <p className="bc-section-text">{card.whatTheyMean}</p>
            </div>

            <div className="bc-section bc-section-mistake">
              <div className="bc-section-label">⚠️ Častá chyba</div>
              <p className="bc-section-text">{card.commonMistake}</p>
            </div>

            <div className="bc-section bc-section-response">
              <div className="bc-section-label-row">
                <span className="bc-section-label">✅ Funkční odpověď</span>
                <button
                  className="bc-copy-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(responseText, 'response');
                  }}
                >
                  {copiedField === 'response' ? '✓ Zkopírováno' : '📋 Kopírovat'}
                </button>
              </div>
              <ul className="bc-response-list">
                {card.functionalResponse.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="bc-section bc-section-direction">
              <div className="bc-section-label-row">
                <span className="bc-section-label">🧭 Kam vést hovor</span>
                <button
                  className="bc-copy-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(card.conversationDirection, 'direction');
                  }}
                >
                  {copiedField === 'direction' ? '✓ Zkopírováno' : '📋 Kopírovat'}
                </button>
              </div>
              <p className="bc-section-text bc-direction-text">{card.conversationDirection}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleCardFlip;
