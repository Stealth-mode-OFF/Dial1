import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SettingsWorkspace } from "../../../pages/SettingsWorkspace";
import { useUserSettingsCtx } from "../../../contexts/UserSettingsContext";
import type { QualQuestion } from "../../../utils/echoApi";

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
  const us = useUserSettingsCtx();

  // Local editing state, initialised from loaded settings
  const [localScript, setLocalScript] = useState(us.openingScript);
  const [localScheduler, setLocalScheduler] = useState(us.schedulerUrl);
  const [localPdDomain, setLocalPdDomain] = useState(us.pipedriveDomain);
  const [localQuestions, setLocalQuestions] = useState<QualQuestion[]>([
    ...us.qualQuestions,
  ]);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [tab, setTab] = useState<"connections" | "dialer">("connections");

  // Sync when settings load from server
  useEffect(() => {
    if (!us.loading) {
      setLocalScript(us.openingScript);
      setLocalScheduler(us.schedulerUrl);
      setLocalPdDomain(us.pipedriveDomain);
      setLocalQuestions([...us.qualQuestions]);
    }
  }, [us.loading]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const updateQuestion = (
    idx: number,
    field: keyof QualQuestion,
    value: string,
  ) => {
    setLocalQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addQuestion = () => {
    setLocalQuestions((prev) => [
      ...prev,
      {
        id: `q${Date.now()}`,
        label: "",
        prompt: "",
        script: "",
        placeholder: "",
        icon: "❓",
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setLocalQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveDialerSettings = async () => {
    await us.save({
      openingScript: localScript,
      schedulerUrl: localScheduler,
      pipedriveDomain: localPdDomain,
      smsTemplate,
      qualQuestions: localQuestions,
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

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
        style={{ maxHeight: "90vh", overflow: "auto" }}
      >
        <div className="overlay-header">
          <h2>Nastavení</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={
                tab === "connections" ? "btn primary sm" : "btn ghost sm"
              }
              onClick={() => setTab("connections")}
              style={{ fontSize: 12 }}
            >
              Připojení
            </button>
            <button
              className={tab === "dialer" ? "btn primary sm" : "btn ghost sm"}
              onClick={() => setTab("dialer")}
              style={{ fontSize: 12 }}
            >
              Skript & Otázky
            </button>
            <button onClick={onClose}>Esc</button>
          </div>
        </div>

        {tab === "connections" && (
          <>
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
          </>
        )}

        {tab === "dialer" && (
          <div
            style={{
              padding: "16px 0",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Opening Script */}
            <div className="settings-section">
              <label
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                📞 Úvodní skript (Opening Script)
              </label>
              <textarea
                className="settings-textarea"
                value={localScript}
                onChange={(e) => setLocalScript(e.target.value)}
                rows={3}
                style={{ width: "100%" }}
              />
            </div>

            {/* Pipedrive Domain */}
            <div className="settings-section">
              <label
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                🔗 Pipedrive doména
              </label>
              <input
                type="text"
                value={localPdDomain}
                onChange={(e) => setLocalPdDomain(e.target.value)}
                placeholder="yourcompany.pipedrive.com"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Scheduler URL */}
            <div className="settings-section">
              <label
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                📅 Scheduler URL (pro booking dem)
              </label>
              <input
                type="text"
                value={localScheduler}
                onChange={(e) => setLocalScheduler(e.target.value)}
                placeholder="https://yourcompany.pipedrive.com/scheduler/..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Qualification Questions */}
            <div className="settings-section">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label style={{ fontWeight: 600, fontSize: 13 }}>
                  🎯 Kvalifikační otázky ({localQuestions.length})
                </label>
                <button
                  className="btn ghost sm"
                  onClick={addQuestion}
                  style={{ fontSize: 11 }}
                >
                  + Přidat otázku
                </button>
              </div>
              {localQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  style={{
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 12 }}>
                      {q.icon || "❓"} Otázka {idx + 1}
                    </span>
                    <button
                      onClick={() => removeQuestion(idx)}
                      style={{
                        fontSize: 11,
                        color: "#ef4444",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ✕ Smazat
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr",
                      gap: "4px 8px",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Název:</span>
                    <input
                      value={q.label}
                      onChange={(e) =>
                        updateQuestion(idx, "label", e.target.value)
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <span style={{ color: "#64748b" }}>Otázka:</span>
                    <input
                      value={q.prompt}
                      onChange={(e) =>
                        updateQuestion(idx, "prompt", e.target.value)
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <span style={{ color: "#64748b" }}>Skript:</span>
                    <input
                      value={q.script}
                      onChange={(e) =>
                        updateQuestion(idx, "script", e.target.value)
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <span style={{ color: "#64748b" }}>Placeholder:</span>
                    <input
                      value={q.placeholder}
                      onChange={(e) =>
                        updateQuestion(idx, "placeholder", e.target.value)
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <span style={{ color: "#64748b" }}>Ikona:</span>
                    <input
                      value={q.icon}
                      onChange={(e) =>
                        updateQuestion(idx, "icon", e.target.value)
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        width: 60,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Save button */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={`btn primary ${settingsSaved ? "btn-saved" : ""}`}
                onClick={saveDialerSettings}
                disabled={us.saving}
                style={{ fontSize: 13 }}
              >
                {us.saving
                  ? "Ukládám…"
                  : settingsSaved
                    ? "✓ Uloženo"
                    : "Uložit nastavení dialeru"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
