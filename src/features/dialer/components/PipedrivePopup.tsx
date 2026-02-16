import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserSettingsCtx } from "../../../contexts/UserSettingsContext";

interface PipedrivePopupProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
}

/**
 * Embedded popup that shows the Pipedrive person detail page in an iframe.
 * Opens when the user clicks the Pipedrive button on the contact card.
 */
export function PipedrivePopup({
  open,
  onClose,
  contactId,
  contactName,
}: PipedrivePopupProps) {
  const { pipedriveDomain: PIPEDRIVE_DOMAIN } = useUserSettingsCtx();
  const pipedriveUrl = `https://${PIPEDRIVE_DOMAIN}/person/${contactId}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pd-popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="pd-popup"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pd-popup-header">
              <div className="pd-popup-title">
                <span className="pd-popup-logo">🟢</span>
                <span>{contactName} — Pipedrive</span>
              </div>
              <div className="pd-popup-actions">
                <a
                  href={pipedriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pd-popup-external"
                  title="Otevřít v novém okně"
                >
                  ↗
                </a>
                <button className="pd-popup-close" onClick={onClose}>
                  ×
                </button>
              </div>
            </div>
            <div className="pd-popup-body">
              <iframe
                src={pipedriveUrl}
                className="pd-popup-iframe"
                title={`Pipedrive — ${contactName}`}
                allow="clipboard-write"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
