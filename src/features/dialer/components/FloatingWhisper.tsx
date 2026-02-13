import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BATTLECARDS, type Battlecard } from "../../../meetcoach/battlecards";

const CAT_ICON: Record<string, string> = {
  objection: "🛡️",
  persona: "👤",
  security: "🔒",
  "next-step": "🚀",
};

/** FloatingWhisper — bottom-left battlecard quick-pick */
export function FloatingWhisper() {
  const [minimized, setMinimized] = useState(true);
  const [activeCard, setActiveCard] = useState<Battlecard | null>(null);

  const selectCard = useCallback((bc: Battlecard) => {
    setActiveCard((prev) => (prev?.key === bc.key ? null : bc));
  }, []);

  if (minimized) {
    return (
      <motion.button
        className="whisper-fab"
        onClick={() => setMinimized(false)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        title="Battlecards"
      >
        ⚡
      </motion.button>
    );
  }

  return (
    <div className="whisper-stack">
      {/* Battlecard detail popup — floats above the chips */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            className="battlecard-popup"
            key={activeCard.key}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="battlecard-popup-header">
              <span className="battlecard-popup-cat">
                {CAT_ICON[activeCard.category]} {activeCard.title}
              </span>
              <button
                className="battlecard-popup-close"
                onClick={() => setActiveCard(null)}
              >
                ×
              </button>
            </div>
            <div className="battlecard-popup-body">
              <p className="battlecard-when">{activeCard.when_to_use}</p>
              <div className="battlecard-response battlecard-primary">
                <span className="battlecard-label">Hlavní odpověď</span>
                {activeCard.primary}
              </div>
              {activeCard.alt_1 && (
                <div className="battlecard-response battlecard-alt">
                  <span className="battlecard-label">Alternativa</span>
                  {activeCard.alt_1}
                </div>
              )}
              <div className="battlecard-followup">
                <strong>Follow-up:</strong> {activeCard.follow_up}
              </div>
              {activeCard.dont_say && activeCard.dont_say.length > 0 && (
                <div className="battlecard-dontsay">
                  <strong>⚠️ Neříkej:</strong> {activeCard.dont_say.join(" · ")}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All battlecard topics as chips */}
      <motion.div
        className="battlecard-chips-panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="battlecard-chips-header">
          <span>⚡ Kartičky</span>
          <button
            className="battlecard-chips-close"
            onClick={() => { setMinimized(true); setActiveCard(null); }}
          >
            −
          </button>
        </div>
        <div className="battlecard-chips-grid">
          {BATTLECARDS.map((bc) => (
            <button
              key={bc.key}
              className={`battlecard-chip battlecard-chip--${bc.category} ${activeCard?.key === bc.key ? "battlecard-chip--active" : ""}`}
              onClick={() => selectCard(bc)}
            >
              {CAT_ICON[bc.category]} {bc.title}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
