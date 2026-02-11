import type { Contact } from '../../features/dialer/types';

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

  return (
    <div className="seq-overlay">
      <div className="seq-overlay-card">
        <div className="seq-overlay-icon">📵</div>
        <h2 className="seq-overlay-title">Nedovoláno</h2>
        <p className="seq-overlay-name">{contact.name} – {contact.company}</p>

        <div className="seq-overlay-status">
          <span className="seq-check">✅ Zalogováno do CRM</span>
          <span className="seq-check">📅 Follow-up za 2 dny naplánován</span>
        </div>

        <div className="seq-overlay-actions">
          <button className="seq-sms-btn" onClick={onSendSms} disabled={smsDisabled}>
            📱 Odeslat SMS
          </button>
        </div>

        {autoDialCountdown > 0 ? (
          <div className="seq-countdown">
            <div className="seq-countdown-num">{autoDialCountdown}</div>
            <p>Další hovor za {autoDialCountdown}s</p>
            <button className="seq-pause-btn" onClick={onPauseAutoDial}>⏸️ Pozastavit</button>
          </div>
        ) : (
          <button className="seq-next-btn" onClick={onAutoDialNext}>
            📞 Zavolat dalšímu →
          </button>
        )}
      </div>
    </div>
  );
}
