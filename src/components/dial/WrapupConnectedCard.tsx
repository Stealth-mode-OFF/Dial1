import { useEffect, useRef, useCallback } from "react";
import { formatTime } from "../../features/dialer/helpers";
import type { CallOutcome, Contact } from "../../features/dialer/types";
import { QUAL_QUESTIONS } from "../../features/dialer/config";
import type { CrmResult } from "../../features/dialer/usePipedriveCRM";

interface WrapupConnectedCardProps {
  contact: Contact;
  wrapupOutcome: CallOutcome;
  callDuration: number;
  aiQualAnswers: string[];
  notes: string;
  crmSaving: boolean;
  crmResult: CrmResult | null;
  onAnswerChange: (index: number, value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onShowScheduler: () => void;
}

export function WrapupConnectedCard({
  contact,
  wrapupOutcome,
  callDuration,
  aiQualAnswers,
  notes,
  crmSaving,
  crmResult,
  onAnswerChange,
  onNotesChange,
  onSave,
  onShowScheduler,
}: WrapupConnectedCardProps) {
  const firstEmptyRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus first empty qualification field, or notes, or save button
  useEffect(() => {
    const firstEmptyIdx = aiQualAnswers.findIndex((a) => !a.trim());
    if (firstEmptyIdx >= 0) {
      const el = document.querySelector<HTMLInputElement>(
        `[data-wrapup-idx="${firstEmptyIdx}"]`,
      );
      el?.focus();
      firstEmptyRef.current = el;
    } else if (!notes.trim()) {
      const el =
        document.querySelector<HTMLTextAreaElement>(".wrapup-notes-area");
      el?.focus();
      firstEmptyRef.current = el;
    } else {
      saveBtnRef.current?.focus();
    }
  }, []); // Only on mount

  const filledCount = aiQualAnswers.filter((a) => a.trim()).length;
  const allFilled = filledCount === QUAL_QUESTIONS.length;

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        if (idx < QUAL_QUESTIONS.length - 1) {
          document
            .querySelector<HTMLInputElement>(`[data-wrapup-idx="${idx + 1}"]`)
            ?.focus();
        } else {
          document
            .querySelector<HTMLTextAreaElement>(".wrapup-notes-area")
            ?.focus();
        }
      }
    },
    [QUAL_QUESTIONS.length],
  );

  const handleNotesKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to save
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSave();
      }
    },
    [onSave],
  );

  return (
    <div className="seq-wrapup-card" data-phase="wrapup">
      {/* ━━━ OUTCOME BANNER — clear state signal ━━━ */}
      <div
        className={`wrapup-banner ${wrapupOutcome === "meeting" ? "wrapup-banner--meeting" : "wrapup-banner--connected"}`}
      >
        <span className="wrapup-banner-icon">
          {wrapupOutcome === "meeting" ? "📅" : "✅"}
        </span>
        <div className="wrapup-banner-info">
          <span className="wrapup-banner-outcome">
            {wrapupOutcome === "meeting" ? "Demo domluveno" : "Dovoláno"}
          </span>
          <span className="wrapup-banner-contact">
            {contact.name} · {contact.company} · {formatTime(callDuration)}
          </span>
        </div>
      </div>

      {/* ━━━ QUALIFICATION — sequential with completion tracking ━━━ */}
      <div className="wrapup-qual">
        <div className="wrapup-qual-header">
          <span className="wrapup-qual-title">Kvalifikace</span>
          <span
            className={`wrapup-qual-progress ${allFilled ? "wrapup-qual-progress--done" : ""}`}
          >
            {filledCount}/{QUAL_QUESTIONS.length}
            {allFilled && " ✓"}
          </span>
        </div>
        {QUAL_QUESTIONS.map((q, i) => {
          const filled = !!aiQualAnswers[i]?.trim();
          return (
            <div
              key={q.id}
              className={`wrapup-qual-row ${filled ? "wrapup-qual-row--done" : ""}`}
            >
              <div className="wrapup-qual-label-row">
                <span
                  className={`wrapup-qual-num ${filled ? "wrapup-qual-num--done" : ""}`}
                >
                  {filled ? "✓" : i + 1}
                </span>
                <label className="wrapup-qual-label">{q.prompt}</label>
              </div>
              <input
                data-wrapup-idx={i}
                className="wrapup-qual-input"
                value={aiQualAnswers[i] || ""}
                onChange={(e) => onAnswerChange(i, e.target.value)}
                onKeyDown={(e) => handleInputKeyDown(e, i)}
                placeholder="Odpověď..."
                autoComplete="off"
              />
            </div>
          );
        })}
      </div>

      {/* ━━━ NOTES ━━━ */}
      <div className="wrapup-notes">
        <label className="wrapup-notes-label">📋 Poznámky</label>
        <textarea
          className="wrapup-notes-area"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onKeyDown={handleNotesKeyDown}
          rows={3}
          placeholder="Klíčové body z hovoru…"
        />
      </div>

      {/* ━━━ ACTIONS — single dominant CTA ━━━ */}
      <div className="wrapup-actions">
        <button
          ref={saveBtnRef}
          className="wrapup-save-btn"
          disabled={crmSaving}
          onClick={onSave}
        >
          {crmSaving ? "⏳ Ukládám..." : "💾 Uložit + Další →"}
          {!crmSaving && <kbd>Enter</kbd>}
        </button>
        {wrapupOutcome === "meeting" && (
          <button className="wrapup-scheduler-btn" onClick={onShowScheduler}>
            📅 Naplánovat demo
          </button>
        )}
      </div>

      {crmResult && (
        <div className={`wrapup-crm-feedback ${crmResult.ok ? "ok" : "err"}`}>
          {crmResult.ok ? "✓" : "✗"} {crmResult.message}
        </div>
      )}

      <div className="wrapup-shortcuts">
        <kbd>Tab</kbd> další pole &nbsp;·&nbsp;
        <kbd>⌘↵</kbd> uložit &nbsp;·&nbsp;
        <kbd>Enter</kbd> uložit + další
      </div>
    </div>
  );
}
