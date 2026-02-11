import { formatTime } from '../../features/dialer/helpers';
import type { CallOutcome, Contact } from '../../features/dialer/types';

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
  return (
    <div className="phase-calling">
      <div className="call-bar">
        <div className="call-bar-left">
          <span className="call-dot" />
          <span>{contact.name}</span>
        </div>
        <span className="call-timer">{formatTime(callDuration)}</span>
        <div className="call-bar-actions">
          <button className="btn-end btn-end-skip" onClick={() => onEndCall('no-answer')}>
            Nedovoláno <span className="wow-kbd" style={{ background: 'rgba(255,255,255,0.15)', marginLeft: 6, padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>1</span>
          </button>
          <button className="btn-end btn-end-done" onClick={() => onEndCall('connected')}>
            Spojeno <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>2</span>
          </button>
          <button className="btn-end btn-end-meeting" onClick={() => onEndCall('meeting')}>
            📅 Demo <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>3</span>
          </button>
        </div>
      </div>

      <div className="script">
        <div className="script-ai">
          <div className="script-ai-title">Skript hovoru</div>
          <div className="script-ai-block">
            <div className="script-ai-label">Otevírací věta</div>
            <p className="script-ai-quote">Připravte si vlastní otevírací větu v Nastavení.</p>
          </div>
        </div>

        <p className="script-transition">Kvalifikační otázky</p>

        {[0, 1, 2].map((idx) => (
          <div key={idx} className="script-question">
            <span className="script-q-num">{idx + 1}</span>
            <div className="script-q-content">
              <p>
                {idx === 0 ? 'Kolik zaměstnanců máte?' : idx === 1 ? 'Jaký problém aktuálně řešíte?' : 'Kdo rozhoduje o nákupu?'}
              </p>
              <input
                value={aiQualAnswers[idx] || ''}
                onChange={(e) => onAnswerChange(idx, e.target.value)}
                placeholder="Odpověď…"
              />
            </div>
          </div>
        ))}

        <div className="script-notes">
          <label>Poznámky</label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Volné poznámky z hovoru…"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
