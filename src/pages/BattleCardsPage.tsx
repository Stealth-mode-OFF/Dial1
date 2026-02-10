/**
 * BattleCardsPage.tsx – Full-page Battle Cards view with search + filter.
 *
 * Features:
 * - Grid of flip cards (responsive: 1/2/3 columns)
 * - Keyword search across title, whatProspectSays, whatTheyMean
 * - Category filter chips
 * - Sorted by order (most common objections first)
 */

import React, { useState, useMemo } from 'react';
import { OBJECTION_CARDS, CATEGORY_LABELS, type ObjectionCategory } from '../data/objectionCards';
import { BattleCardFlip } from '../components/BattleCardFlip';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ObjectionCategory[];

// Only show categories that have at least one card
const usedCategories = ALL_CATEGORIES.filter((cat) =>
  OBJECTION_CARDS.some((c) => c.category === cat),
);

export const BattleCardsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ObjectionCategory | null>(null);

  const filteredCards = useMemo(() => {
    let cards = [...OBJECTION_CARDS].sort((a, b) => a.order - b.order);

    // Category filter
    if (activeCategory) {
      cards = cards.filter((c) => c.category === activeCategory);
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      cards = cards.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.whatProspectSays.toLowerCase().includes(q) ||
          c.whatTheyMean.toLowerCase().includes(q) ||
          c.functionalResponse.some((r) => r.toLowerCase().includes(q)) ||
          c.conversationDirection.toLowerCase().includes(q),
      );
    }

    return cards;
  }, [search, activeCategory]);

  return (
    <div className="bc-page">
      {/* Section header + Search + Filters */}
      <div className="bc-controls">
        <div className="bc-section-header">
          <div>
            <h1 className="bc-page-title">Battle Cards</h1>
            <p className="bc-page-subtitle">Námitky klientů a funkční odpovědi</p>
          </div>
          <span className="bc-count">
            {filteredCards.length} / {OBJECTION_CARDS.length}
          </span>
        </div>

        <div className="bc-search-wrap">
          <span className="bc-search-icon">🔍</span>
          <input
            className="bc-search-input"
            type="text"
            placeholder="Hledej námitku…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Hledat námitku"
          />
          {search && (
            <button
              className="bc-search-clear"
              onClick={() => setSearch('')}
              aria-label="Vymazat vyhledávání"
            >
              ✕
            </button>
          )}
        </div>

        <div className="bc-filter-chips" role="group" aria-label="Filtrovat podle kategorie">
          <button
            className={`bc-chip${activeCategory === null ? ' bc-chip-active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            Vše
          </button>
          {usedCategories.map((cat) => {
            const meta = CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                className={`bc-chip${activeCategory === cat ? ' bc-chip-active' : ''}`}
                style={{ '--chip-color': meta.color } as React.CSSProperties}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Grid */}
      {filteredCards.length > 0 ? (
        <div className="bc-grid">
          {filteredCards.map((card) => (
            <BattleCardFlip key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <div className="bc-empty">
          <span className="bc-empty-icon">🔎</span>
          <p>Žádné karty pro „{search || activeCategory}"</p>
          <button className="bc-chip" onClick={() => { setSearch(''); setActiveCategory(null); }}>
            Zobrazit vše
          </button>
        </div>
      )}
    </div>
  );
};

export default BattleCardsPage;
