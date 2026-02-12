import { useEffect, useRef } from "react";
import type { Contact } from "../../features/dialer/types";
import { AUTO_DIAL_SECONDS } from "../../features/dialer/config";

interface WrapupNoAnswerOverlayProps {
  contact: Contact;
  autoDialCountdown: number;
  smsUrl: string;
  onSendSms: () => void;
  onPauseAutoDial: () => void;
  onAutoDialNext: () => void;
}

export function WrapupNoAnswerOverlay({
  contact,
  autoDialCountdown,
  smsUrl,
  onSendSms,
  onPauseAutoDial,
  onAutoDialNext,
}: WrapupNoAnswerOverlayProps) {
  const smsDisabled = !smsUrl;
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the next action when countdown ends
  useEffect(() => {
    if (autoDialCountdown === 0) {
      nextBtnRef.current?.focus();
    }
  }, [autoDialCountdown]);

  return (
    <div className="seq-overlay" data-phase="wrapup-noanswer">
      <div className="seq-overlay-card">
        <div className="noanswer-header">
          <span className="noanswer-icon">📵</span>
          <div className="noanswer-info">
            <h2 className="noanswer-title">Nedovoláno</h2>
            <p className="noanswer-contact">
              {contact.name} · {contact.company}
            </p>
          </div>
        </div>

        <div className="noanswer-status">
          <span className="noanswer-check">✅ Zalogováno do CRM</span>
          <span className="noanswer-check">📅 Follow-up za 2 dny</span>
        </div>

        <div className="noanswer-actions">
          <button
            className="noanswer-sms-btn"
            onClick={onSendSms}
            disabled={smsDisabled}
          >
            📱 SMS <kbd>S</kbd>
          </button>
        </div>

        {autoDialCountdown > 0 ? (
          <div className="noanswer-countdown">
            <div className="noanswer-countdown-ring">
              <svg viewBox="0 0 36 36" className="noanswer-countdown-svg">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#e5e5e5"
                  strokeWidth="2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="2.5"
                  strokeDasharray="100.5"
                  strokeDashoffset={
                    100.5 * (1 - autoDialCountdown / AUTO_DIAL_SECONDS)
                  }
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="noanswer-countdown-num">
                {autoDialCountdown}
              </span>
            </div>
            <p className="noanswer-countdown-text">
              Další hovor za {autoDialCountdown}s
            </p>
            <button className="noanswer-pause-btn" onClick={onPauseAutoDial}>
              ⏸ Pozastavit <kbd>Space</kbd>
            </button>
          </div>
        ) : (
          <button
            ref={nextBtnRef}
            className="noanswer-next-btn"
            onClick={onAutoDialNext}
          >
            📞 Zavolat dalšímu → <kbd>Enter</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
