import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SCHEDULER_URL } from "../config";

const CONFETTI_COLORS = [
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#a78bfa",
  "#fbbf24",
  "#fb923c",
];

function ConfettiPiece({ i }: { i: number }) {
  const left = Math.random() * 100;
  const delay = Math.random() * 0.6;
  const size = 6 + Math.random() * 8;
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
  const rotation = Math.random() * 360;
  const duration = 1.8 + Math.random() * 1.2;

  return (
    <motion.div
      className="confetti-piece"
      style={{
        left: `${left}%`,
        width: size,
        height: size * 0.6,
        background: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        position: "absolute",
        top: -10,
      }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{
        y: [0, 300 + Math.random() * 200],
        rotate: [rotation, rotation + 360 + Math.random() * 360],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

export function BookDemoModal({
  open,
  onClose,
  contactName,
}: {
  open: boolean;
  onClose: () => void;
  contactName?: string;
}) {
  const [showScheduler, setShowScheduler] = useState(false);

  useEffect(() => {
    if (open) {
      setShowScheduler(false);
      const t = setTimeout(() => setShowScheduler(true), 1200);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="book-demo-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="book-demo-modal"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Confetti burst */}
            <div className="confetti-container">
              {Array.from({ length: 40 }).map((_, i) => (
                <ConfettiPiece key={i} i={i} />
              ))}
            </div>

            {/* Header celebration */}
            <div className="book-demo-header">
              <motion.div
                className="book-demo-trophy"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, damping: 12 }}
              >
                🎉
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Demo domluveno!
              </motion.h2>
              {contactName && (
                <motion.p
                  className="book-demo-contact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {contactName}
                </motion.p>
              )}
            </div>

            {/* Scheduler embed */}
            <motion.div
              className="book-demo-scheduler"
              initial={{ opacity: 0, y: 20 }}
              animate={showScheduler ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <p className="book-demo-scheduler-label">
                📅 Vyberte termín přímo v kalendáři
              </p>
              <div className="book-demo-iframe-wrap">
                <iframe
                  src={SCHEDULER_URL}
                  title="Pipedrive Scheduler"
                  className="book-demo-iframe"
                  allow="clipboard-write"
                />
              </div>
            </motion.div>

            {/* Actions */}
            <div className="book-demo-actions">
              <a
                href={SCHEDULER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="book-demo-link"
              >
                ↗ Otevřít v novém okně
              </a>
              <button className="book-demo-close" onClick={onClose}>
                Zavřít
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
