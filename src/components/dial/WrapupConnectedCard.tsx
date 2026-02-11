import { formatTime, outcomeLabel } from '../../features/dialer/helpers';
import type { CallOutcome, Contact } from '../../features/dialer/types';

interface QualQuestion {
  question: string;
}

interface WrapupConnectedCardProps {
  contact: Contact;
  wrapupOutcome: CallOutcome;
  callDuration: number;
  questions: QualQuestion[];
  aiQualAnswers: string[];
  notes: string;
  crmSaving: boolean;
  crmResult: { ok: boolean; message: string } | null;
  isSupabaseConfigured: boolean;
  onAnswerChange: (index: number, value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onShowScheduler: () => void;
}

export function WrapupConnectedCard({
  contact,
  wrapupOutcome,
  callDuration,
  questions,
  aiQualAnswers,
  notes,
  crmSaving,
  crmResult,
  isSupabaseConfigured,
  onAnswerChange,
  onNotesChange,
  onSave,
  onShowScheduler,
}: WrapupConnectedCardProps) {
  return (
    <div className="seq-wrapup-card">
      <div className="seq-wrapup-header">
        <span className="seq-wrapup-outcome">{wrapupOutcome === 'meeting' ? '📅 Demo domluveno' : '✅ Dovoláno'}</span>
        <span className="seq-wrapup-contact">{contact.name} – {contact.company}</span>
        <span className="seq-wrapup-time">⏱️ {formatTime(callDuration)}</span>
      </div>

      <div className="seq-qual">
        <h3 className="seq-qual-title">Kvalifikace</h3>
        {questions.map((q, i) => (
          <div key={`${q.question}-${i}`} className="seq-qual-row">
            <label className="seq-qual-label">{q.question}</label>
            <input
              className="seq-qual-input"
              value={aiQualAnswers[i] || ''}
              onChange={(e) => onAnswerChange(i, e.target.value)}
              placeholder="Odpověď..."
            />
          </div>
        ))}
      </div>

      <div className="seq-notes">
        <label className="seq-notes-label">Poznámky</label>
        <textarea
          className="seq-notes-input"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Klíčové body z hovoru..."
        />
      </div>

      <div className="seq-wrapup-actions">
        <button className="seq-save-btn" disabled={crmSaving || !isSupabaseConfigured} onClick={onSave}>
          {crmSaving ? '⏳ Ukládám...' : '💾 Uložit + Další →'}
        </button>
        {wrapupOutcome === 'meeting' && (
          <button className="seq-demo-btn" onClick={onShowScheduler}>
            📅 Naplánovat demo
          </button>
        )}
      </div>

      {crmResult ? (
        <div className={`seq-crm-msg ${crmResult.ok ? 'ok' : 'err'}`}>{crmResult.message}</div>
      ) : null}
    </div>
  );
}
