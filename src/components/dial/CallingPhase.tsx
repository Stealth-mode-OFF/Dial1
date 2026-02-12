import { useEffect, useRef, useCallback } from "react";
import { formatTime } from "../../features/dialer/helpers";
import type { CallOutcome, Contact } from "../../features/dialer/types";
import {
  QUAL_QUESTIONS,
  OPENING_SCRIPT,
  CALL_FOCUS_DELAY_MS,
} from "../../features/dialer/config";

interface CallingPhaseProps {
  contact: Contact;
  callDuration: number;
  aiQualAnswers: string[];
  notes: string;
  onAnswerChange: (index: number, value: string) => void;
  onNotesChange: (value: string) => void;
  onEndCall: (outcome: CallOutcome) => void;
}

export function CallingPhase({
  contact,
  callDuration,
  aiQualAnswers,
  notes,
  onAnswerChange,
  onNotesChange,
  onEndCall,
}: CallingPhaseProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

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
        // Move to next input or notes
        const next = document.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(idx < 2 ? `[data-qual-idx="${idx + 1}"]` : ".call-notes-area");
        next?.focus();
      }
    },
    [],
  );

  return (
    <div className="phase-calling" data-phase="calling">
      {/* ━━━ FIXED CALL BAR — always visible at top ━━━ */}
      <div className="call-bar">
        <div className="call-bar-left">
          <span className="call-dot" aria-label="Hovor probíhá" />
          <span className="call-bar-name">{contact.name}</span>
          <span className="call-bar-company">{contact.company}</span>
        </div>

        {/* Timer is the visual anchor — largest element */}
        <span className="call-timer" aria-live="polite">
          {formatTime(callDuration)}
        </span>

        <div className="call-bar-actions">
          <button
            className="btn-end btn-end-skip"
            onClick={() => onEndCall("no-answer")}
            title="Klávesa 1"
          >
            <span className="btn-end-label">Nedovoláno</span>
            <kbd>1</kbd>
          </button>
          <button
            className="btn-end btn-end-done"
            onClick={() => onEndCall("connected")}
            title="Klávesa 2"
          >
            <span className="btn-end-label">Spojeno</span>
            <kbd>2</kbd>
          </button>
          <button
            className="btn-end btn-end-meeting"
            onClick={() => onEndCall("meeting")}
            title="Klávesa 3"
          >
            <span className="btn-end-label">📅 Demo</span>
            <kbd>3</kbd>
          </button>
        </div>
      </div>

      {/* ━━━ MAIN CONTENT — two-zone layout: script left, capture right ━━━ */}
      <div className="call-content">
        {/* LEFT: Script guidance — read-only, dim, reference material */}
        <div className="call-script-zone">
          <div className="script-ai">
            <div className="script-ai-title">Skript hovoru</div>
            <div className="script-ai-block">
              <div className="script-ai-label">Otevírací věta</div>
              <p className="script-ai-quote">{OPENING_SCRIPT}</p>
            </div>
          </div>

          <p className="script-transition">→ Přechod na dotazy</p>

          {/* Script-side prompts — what to SAY (left brain) */}
          {QUAL_QUESTIONS.map((q, idx) => (
            <div key={idx} className="script-prompt-card">
              <span className="script-prompt-num">{idx + 1}</span>
              <span className="script-prompt-text">{q.script}</span>
            </div>
          ))}
        </div>

        {/* RIGHT: Data capture — interactive, bright, where attention goes */}
        <div className="call-capture-zone">
          <div className="capture-header">
            <span className="capture-title">Odpovědi</span>
            <span className="capture-progress">
              {filledCount}/3
              {filledCount === 3 && <span className="capture-done"> ✓</span>}
            </span>
          </div>

          {QUAL_QUESTIONS.map((q, idx) => {
            const filled = !!aiQualAnswers[idx]?.trim();
            return (
              <div
                key={idx}
                className={`capture-field ${filled ? "capture-field--done" : ""}`}
              >
                <label className="capture-label">
                  <span className="capture-num">{idx + 1}</span>
                  {q.prompt}
                </label>
                <input
                  ref={idx === 0 ? firstInputRef : undefined}
                  data-qual-idx={idx}
                  className="capture-input"
                  value={aiQualAnswers[idx] || ""}
                  onChange={(e) => onAnswerChange(idx, e.target.value)}
                  onKeyDown={(e) => handleInputKeyDown(e, idx)}
                  placeholder={q.placeholder}
                  autoComplete="off"
                />
              </div>
            );
          })}

          <div className="capture-notes">
            <label className="capture-label">📋 Poznámky</label>
            <textarea
              ref={notesRef}
              className="call-notes-area"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Volné poznámky z hovoru…"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* ━━━ BOTTOM KEYBOARD HINTS — always visible ━━━ */}
      <div className="call-shortcuts">
        <kbd>1</kbd> nedovoláno &nbsp;·&nbsp;
        <kbd>2</kbd> spojeno &nbsp;·&nbsp;
        <kbd>3</kbd> demo &nbsp;·&nbsp;
        <kbd>Tab</kbd> další pole
      </div>
    </div>
  );
}
