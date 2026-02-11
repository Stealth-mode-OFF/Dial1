import type { Brief } from '../../types/contracts';
import type { Contact } from '../../features/dialer/types';

interface ReadyPhaseProps {
  contact: Contact;
  displayBrief: Brief | null;
  briefLoading: boolean;
  briefError: string | null;
  openingText?: string | null;
  onCall: () => void;
  onSkip: () => void;
}

export function ReadyPhase({
  contact,
  displayBrief,
  briefLoading,
  briefError,
  openingText,
  onCall,
  onSkip,
}: ReadyPhaseProps) {
  return (
    <div className="seq-ready">
      <div className="seq-lead-card">
        <div className="seq-lead-main">
          <div className="seq-lead-avatar">{contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</div>
          <div className="seq-lead-info">
            <h2 className="seq-lead-name">{contact.name}</h2>
            <p className="seq-lead-role">{contact.title || '—'} @ {contact.company}</p>
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="seq-lead-phone">{contact.phone}</a>
            ) : (
              <span className="seq-lead-phone muted">Telefon chybí</span>
            )}
          </div>
        </div>

        <div className="seq-brief-compact" aria-live="polite">
          {briefError ? (
            <div className="seq-brief-error">{briefError}</div>
          ) : displayBrief ? (
            <>
              {displayBrief.company?.summary ? (
                <p className="seq-brief-summary">{displayBrief.company.summary}</p>
              ) : null}
              {(displayBrief.signals || []).length > 0 ? (
                <div className="seq-brief-signals">
                  {displayBrief.signals.slice(0, 3).map((s, i) => (
                    <span key={`${s.type}-${i}`} className={`seq-signal seq-signal-${s.type}`}>{s.text}</span>
                  ))}
                </div>
              ) : null}
              {openingText ? (
                <div className="seq-opening">
                  <span className="seq-opening-label">💬 Opening:</span>
                  <span className="seq-opening-text">{openingText}</span>
                </div>
              ) : null}
            </>
          ) : briefLoading ? (
            <div className="seq-brief-loading">⏳ Načítám brief...</div>
          ) : (
            <div className="seq-brief-loading">Brief není k dispozici.</div>
          )}
        </div>
      </div>

      <div className="seq-ready-actions">
        <button className="seq-call-btn" onClick={onCall}>
          📞 Zavolat
        </button>
        <button className="seq-skip-btn" onClick={onSkip}>Přeskočit →</button>
      </div>
      <p className="seq-hint">C = zavolat · → = přeskočit</p>
    </div>
  );
}
