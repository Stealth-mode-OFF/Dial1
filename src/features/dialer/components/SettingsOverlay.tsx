import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { SettingsWorkspace } from '../../../pages/SettingsWorkspace';

export function SettingsOverlay({
  open,
  onClose,
  smsTemplate,
  onSmsTemplateChange,
}: {
  open: boolean;
  onClose: () => void;
  smsTemplate: string;
  onSmsTemplateChange: (value: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      className="overlay-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="overlay-panel"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overlay-header">
          <h2>Nastavení</h2>
          <button onClick={onClose}>Esc</button>
        </div>
        <div className="settings-sms">
          <label htmlFor="sms-template">📱 SMS šablona (nedovoláno)</label>
          <textarea
            id="sms-template"
            className="settings-textarea"
            value={smsTemplate}
            onChange={(e) => onSmsTemplateChange(e.target.value)}
            rows={3}
          />
        </div>
        <SettingsWorkspace />
      </motion.div>
    </motion.div>
  );
}

