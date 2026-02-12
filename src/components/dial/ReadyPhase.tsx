import { useState, useCallback, useEffect, useRef } from 'react';
import type { Brief } from '../../types/contracts';
import type { Contact, DailyStats } from '../../features/dialer/types';

interface ReadyPhaseProps {
  contact: Contact;
  displayBrief: Brief | null;
  briefLoading: boolean;
  briefError: string | null;
  openingText?: string | null;
  notes: string;
  onNotesChange: (v: string) => void;
  onSaveToPipedrive: (note: string) => Promise<void>;
  pipedriveConfigured: boolean;
  onCall: () => void;
  onSkip: () => void;
  /* Session context (optional for backward compat) */
  sessionStats?: DailyStats;
  queuePosition?: number;
  queueTotal?: number;
  completedCount?: number;
}

const QUESTIONS = [
  {
    id: 'size',
    label: 'Velikost',
    prompt: 'Naše řešení je nejvhodnější pro firmy od 50 do 500 zaměstnanců, kolik je vás?',
    followUp: 'Super, to je přesně pro vás. Teď jsme to spustili v Raynetu, Prusovi atd.',
    placeholder: 'Počet zaměstnanců…',
    icon: '👥',
  },
  {
    id: 'mood',
    label: 'Nálada',
    prompt: 'Zjišťujete pravidelně jaká je nálada ve vašich týmech?',
    followUpNo: 'Ne → Aha, to je škoda, dá se pomocí toho odhalit spoustu věcí.',
    followUpYes: 'Ano → A jak to děláte?',
    placeholder: 'Ano / Ne + detaily…',
    icon: '🎯',
  },
  {
    id: 'decision',
    label: 'Rozhodovatel',
    prompt: 'Je třeba přizvat někoho dalšího pro případné rozhodnutí?',
    placeholder: 'Kdo rozhoduje…',
    icon: '🔑',
  },
] as const;

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function ReadyPhase({
  contact,
  notes,
  onNotesChange,
  onSaveToPipedrive,
  pipedriveConfigured,
  onCall,
  onSkip,
  sessionStats,
  queuePosition,
  queueTotal,
  completedCount,
}: ReadyPhaseProps) {
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scriptCollapsed, setScriptCollapsed] = useState(false);
  const callBtnRef = useRef<HTMLButtonElement>(null);

  // Pulse animation on mount
  useEffect(() => {
    callBtnRef.current?.classList.add('td-pulse');
    const t = setTimeout(() => callBtnRef.current?.classList.remove('td-pulse'), 600);
    return () => clearTimeout(t);
  }, [contact.id]);

  const setAnswer = (id: string, val: string) =>
    setAnswers((prev) => ({ ...prev, [id]: val }));

  const buildPipedriveNote = useCallback(() => {
    const parts: string[] = [];
    parts.push(`📞 Cold call – ${contact.name} (${contact.company})`);
    parts.push('');
    QUESTIONS.forEach((q) => {
      const a = answers[q.id]?.trim();
      if (a) parts.push(`${q.icon} ${q.label}: ${a}`);
    });
    if (notes.trim()) {
      parts.push('');
      parts.push(`📝 Poznámky: ${notes.trim()}`);
    }
    return parts.join('\n');
  }, [answers, notes, contact]);

  const hasAnyContent = Object.values(answers).some((a) => a.trim()) || notes.trim();

  const handleSave = useCallback(async () => {
    if (!hasAnyContent) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await onSaveToPipedrive(buildPipedriveNote());
      setSaveResult({ ok: true, msg: '✓ Uloženo' });
    } catch (e) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : 'Chyba' });
    } finally {
      setSaving(false);
    }
  }, [hasAnyContent, buildPipedriveNote, onSaveToPipedrive]);

  // Progress
  const done = completedCount ?? 0;
  const total = queueTotal ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const stats = sessionStats;

  return (
    <div className="td">
      {/* ━━━ TOP STATS BAR ━━━ */}
      {stats && (
        <div className="td-stats-bar">
          <div className="td-stat">
            <span className="td-stat-val">{stats.calls}</span>
            <span className="td-stat-lbl">hovorů</span>
          </div>
          <div className="td-stat td-stat--green">
            <span className="td-stat-val">{stats.connected}</span>
            <span className="td-stat-lbl">spojeno</span>
          </div>
          <div className="td-stat td-stat--gold">
            <span className="td-stat-val">{stats.meetings}</span>
            <span className="td-stat-lbl">schůzek</span>
          </div>
          <div className="td-stat">
            <span className="td-stat-val">{formatSec(stats.talkTime)}</span>
            <span className="td-stat-lbl">na tel.</span>
          </div>
          {total > 0 && (
            <div className="td-progress">
              <div className="td-progress-track">
                <div className="td-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="td-progress-txt">{done}/{total}</span>
            </div>
          )}
        </div>
      )}

      {/* ━━━ MAIN TWO-COLUMN LAYOUT ━━━ */}
      <div className="td-grid">

        {/* ── LEFT: ACTION ZONE ── */}
        <div className="td-left">
          {/* Contact card */}
          <div className="td-contact">
            <div className="td-contact-top">
              <div className="td-avatar">
                {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="td-contact-info">
                <h2 className="td-name">{contact.name}</h2>
                <p className="td-role">{contact.title || '—'} · {contact.company}</p>
              </div>
              <span className={`td-priority td-priority--${contact.priority}`}>
                {contact.priority === 'high' ? '🔥' : contact.priority === 'medium' ? '⚡' : '·'}
              </span>
            </div>
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="td-phone">📞 {contact.phone}</a>
            )}
          </div>

          {/* BIG CALL BUTTON */}
          <button ref={callBtnRef} className="td-call-btn" onClick={onCall}>
            <span className="td-call-icon">📞</span>
            <span>Zavolat</span>
            <kbd>C</kbd>
          </button>

          {/* Skip */}
          <button className="td-skip-btn" onClick={onSkip}>
            Přeskočit <span className="td-kbd">→</span>
          </button>

          {/* Notes + Pipedrive */}
          <div className="td-notes-card">
            <label className="td-field-label">📋 Poznámky</label>
            <textarea
              className="td-textarea"
              rows={3}
              placeholder="Volné poznámky z hovoru…"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
            <div className="td-save-row">
              <button
                className="td-pipedrive-btn"
                disabled={!pipedriveConfigured || saving || !hasAnyContent}
                onClick={handleSave}
              >
                {saving ? '⏳' : '📌'} {saving ? 'Ukládám…' : 'Pipedrive'}
              </button>
              {saveResult && (
                <span className={`td-save-msg ${saveResult.ok ? 'ok' : 'err'}`}>
                  {saveResult.msg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: SCRIPT + KVALIFIKACE (unified) ── */}
        <div className="td-right">
          {/* Opening — collapsible */}
          <div className={`td-opening ${scriptCollapsed ? 'td-opening--collapsed' : ''}`}>
            <button
              className="td-opening-toggle"
              onClick={() => setScriptCollapsed(!scriptCollapsed)}
            >
              <span className="td-toggle-arrow">{scriptCollapsed ? '▶' : '▼'}</span>
              <span className="td-opening-label">OPENING</span>
            </button>
            {!scriptCollapsed && (
              <p className="td-opening-text">
                Dobrý den, tady Josef z Behavery. My jsme český startup a řešíme vedení společností, aby jejich zaměstnanci byli více angažovaní…
              </p>
            )}
          </div>

          {/* Unified qualification cards: prompt + hints + answer */}
          <div className="td-qual">
            <span className="td-qual-title">Kvalifikace</span>
            {QUESTIONS.map((q, i) => {
              const filled = !!(answers[q.id]?.trim());
              return (
                <div key={q.id} className={`td-q-card ${filled ? 'td-q-card--done' : ''}`}>
                  <div className="td-q-head">
                    <span className="td-q-num">{i + 1}</span>
                    <span className="td-q-prompt">{q.prompt}</span>
                  </div>
                  {'followUp' in q && (
                    <p className="td-q-hint">✓ {q.followUp}</p>
                  )}
                  {'followUpNo' in q && (
                    <div className="td-q-hints-split">
                      <p className="td-q-hint">{q.followUpNo}</p>
                      <p className="td-q-hint">{q.followUpYes}</p>
                    </div>
                  )}
                  <input
                    type="text"
                    className="td-q-input"
                    placeholder={q.placeholder}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ━━━ KEYBOARD HINTS ━━━ */}
      <div className="td-shortcuts">
        <kbd>C</kbd> zavolat &nbsp;·&nbsp; <kbd>→</kbd> přeskočit &nbsp;·&nbsp; <kbd>Tab</kbd> další pole
      </div>
    </div>
  );
}
