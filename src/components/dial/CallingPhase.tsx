import { useEffect, useRef, useCallback, useState } from "react";
import { formatTime } from "../../features/dialer/helpers";
import type { CallOutcome, Contact } from "../../features/dialer/types";
import {
  QUAL_QUESTIONS,
  OPENING_SCRIPT,
  CALL_FOCUS_DELAY_MS,
} from "../../features/dialer/config";
import { BookDemoModal } from "../../features/dialer/components/BookDemoModal";

interface CallingPhaseProps {
  contact: Contact;
  callDuration: number;
  aiQualAnswers: string[];
  notes: string;
  onAnswerChange: (index: number, value: string) => void;
  onNotesChange: (value: string) => void;
  /** Full CRM save — logs call activity + note. Returns true on success. */
  onLogCallAndNote: (
    contact: Contact,
    outcome: CallOutcome,
    duration: number,
    qualAnswers: string[],
    notes: string,
  ) => Promise<boolean>;
  /** Move to next contact (called after successful save). */
  onNextContact: () => void;
  /** Record session stats for this call. */
  onRecordCall: (outcome: CallOutcome) => void;
  pipedriveConfigured?: boolean;
}

export function CallingPhase({
  contact,
  callDuration,
  aiQualAnswers,
  notes,
  onAnswerChange,
  onNotesChange,
  onLogCallAndNote,
  onNextContact,
  onRecordCall,
  pipedriveConfigured,
}: CallingPhaseProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [scriptCollapsed, setScriptCollapsed] = useState(false);
  const [saving, setSaving] = useState<"none" | "no-answer" | "connected">(
    "none",
  );
  const [showBookDemo, setShowBookDemo] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(
      () => firstInputRef.current?.focus(),
      CALL_FOCUS_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, []);

  // Filled count for progress indicator
  const filledCount = aiQualAnswers.filter((a) => a.trim()).length;

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
      if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        const next = document.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(idx < 2 ? `[data-qual-idx="${idx + 1}"]` : ".call-notes-area");
        next?.focus();
      }
    },
    [],
  );

  /**
   * Handles both "Nedovoláno" and "Uložit + Další".
   * 1. Calls logCallAndNote which logs activity + note to Pipedrive.
   * 2. Only on TRUE success → shows ✓ and advances to next contact.
   * 3. On failure → shows error, does NOT advance.
   */
  const handleAction = useCallback(
    async (outcome: CallOutcome) => {
      if (saving !== "none") return; // prevent double-click

      const savingType = outcome === "no-answer" ? "no-answer" : "connected";
      setSaving(savingType);
      setSaveResult(null);

      try {
        // Record call in session stats
        onRecordCall(outcome);

        // Save to Pipedrive — returns true ONLY on success
        const success = await onLogCallAndNote(
          contact,
          outcome,
          callDuration,
          aiQualAnswers,
          notes,
        );

        if (success) {
          setSaveResult({
            ok: true,
            msg:
              outcome === "no-answer"
                ? "✓ Nedovoláno zapsáno do Pipedrive"
                : "✓ Dovoláno + poznámka uložena do Pipedrive",
          });
          // Advance to next contact after brief confirmation
          setTimeout(() => onNextContact(), 600);
        } else {
          setSaveResult({
            ok: false,
            msg: "✗ Chyba při ukládání do Pipedrive — zkuste znovu",
          });
          setSaving("none");
        }
      } catch (e) {
        setSaveResult({
          ok: false,
          msg:
            "✗ " +
            (e instanceof Error ? e.message : "Neznámá chyba při ukládání"),
        });
        setSaving("none");
      }
    },
    [
      saving,
      contact,
      callDuration,
      aiQualAnswers,
      notes,
      onLogCallAndNote,
      onNextContact,
      onRecordCall,
    ],
  );

  return (
    <div className="phase-calling" data-phase="calling">
      {/* ━━━ CALL BAR — status display ━━━ */}
      <div className="call-bar">
        <div className="call-bar-left">
          <span className="call-dot" aria-label="Hovor probíhá" />
          <span className="call-bar-name">{contact.name}</span>
          <span className="call-bar-company">{contact.company}</span>
        </div>
        <span className="call-timer" aria-live="polite">
          <svg
            className="call-timer-icon"
            width="20"
            height="24"
            viewBox="0 0 20 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Stopwatch button top */}
            <rect x="8" y="0" width="4" height="4" rx="1" fill="white" />
            {/* Circle body */}
            <circle
              cx="10"
              cy="14"
              r="9"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
            {/* Minute hand */}
            <line
              x1="10"
              y1="14"
              x2="10"
              y2="8"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Second hand tick */}
            <line
              x1="10"
              y1="14"
              x2="14"
              y2="11"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
          {formatTime(callDuration)}
        </span>
      </div>

      {/* ━━━ MAIN: Script (left) | Capture (right) ━━━ */}
      <div className="call-split">
        {/* LEFT — Script reference (read-only, dimmer) */}
        <div className="call-split-script">
          <div className="call-script-head">
            <button
              className="td-section-toggle"
              onClick={() => setScriptCollapsed(!scriptCollapsed)}
            >
              <span className="td-toggle-arrow">
                {scriptCollapsed ? "▶" : "▼"}
              </span>
              <span className="call-script-title">📝 Skript</span>
            </button>
          </div>

          {!scriptCollapsed && (
            <div className="call-script-card">
              <span className="call-script-label">Otevírací věta</span>
              <p className="call-script-text">{OPENING_SCRIPT}</p>
            </div>
          )}
        </div>

        {/* RIGHT — Data capture (bright, interactive) */}
        <div className="call-split-capture">
          {/* Qualification */}
          <div className="call-capture-section">
            <div className="call-capture-head">
              <span className="call-capture-title">🎯 Kvalifikace</span>
              <span className="call-capture-progress">
                {filledCount}/{QUAL_QUESTIONS.length}
                {filledCount === QUAL_QUESTIONS.length && (
                  <span className="call-capture-done"> ✓</span>
                )}
              </span>
            </div>

            {QUAL_QUESTIONS.map((q, idx) => {
              const filled = !!aiQualAnswers[idx]?.trim();
              return (
                <div
                  key={idx}
                  className={`call-capture-field ${filled ? "call-capture-field--done" : ""}`}
                >
                  <label className="call-capture-label">
                    <span
                      className={`call-capture-num ${filled ? "call-capture-num--done" : ""}`}
                    >
                      {filled ? "✓" : idx + 1}
                    </span>
                    {q.prompt}
                  </label>
                  <p className="call-capture-hint">{q.script}</p>
                  <input
                    ref={idx === 0 ? firstInputRef : undefined}
                    data-qual-idx={idx}
                    className="call-capture-input"
                    value={aiQualAnswers[idx] || ""}
                    onChange={(e) => onAnswerChange(idx, e.target.value)}
                    onKeyDown={(e) => handleInputKeyDown(e, idx)}
                    placeholder={q.placeholder}
                    autoComplete="off"
                  />
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="call-capture-section">
            <label className="call-capture-title">📋 Poznámky</label>
            <textarea
              ref={notesRef}
              className="call-notes-area"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Volné poznámky z hovoru…"
              rows={3}
            />
          </div>

          {/* ━━━ TWO ACTION BUTTONS ━━━ */}
          <div className="call-capture-actions">
            {/* Feedback message — shown above buttons */}
            {saveResult && (
              <div
                className={`call-feedback ${saveResult.ok ? "call-feedback--ok" : "call-feedback--err"}`}
              >
                {saveResult.msg}
              </div>
            )}

            <div className="call-action-row">
              {/* NEDOVOLÁNO — logs "no-answer" activity to Pipedrive + next */}
              <button
                className="call-action-btn call-action-btn--skip"
                disabled={saving !== "none" || !pipedriveConfigured}
                onClick={() => handleAction("no-answer")}
              >
                {saving === "no-answer" ? "⏳ Ukládám…" : "❌ Nedovoláno"}
              </button>

              {/* BOOK DEMO — celebration trigger + scheduler */}
              <button
                className="call-action-btn call-action-btn--demo"
                disabled={saving !== "none"}
                onClick={() => {
                  onRecordCall("meeting");
                  setShowBookDemo(true);
                }}
              >
                📅 Book Demo
              </button>

              {/* ULOŽIT DO PIPEDRIVE + DALŠÍ — logs "connected" activity + qual + notes + next */}
              <button
                className="call-action-btn call-action-btn--save"
                disabled={saving !== "none" || !pipedriveConfigured}
                onClick={() => handleAction("connected")}
              >
                {saving === "connected"
                  ? "⏳ Ukládám…"
                  : "✅ Uložit do Pipedrive + Další →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ KEYBOARD HINTS ━━━ */}
      <div className="call-shortcuts">
        <kbd>1</kbd> nedovoláno &nbsp;·&nbsp;
        <kbd>2</kbd> book demo &nbsp;·&nbsp;
        <kbd>3</kbd> uložit + další &nbsp;·&nbsp;
        <kbd>Tab</kbd> další pole
      </div>

      {/* ━━━ BOOK DEMO CELEBRATION MODAL ━━━ */}
      <BookDemoModal
        open={showBookDemo}
        onClose={() => {
          setShowBookDemo(false);
          handleAction("connected");
        }}
        contactName={contact.name}
      />
    </div>
  );
}
