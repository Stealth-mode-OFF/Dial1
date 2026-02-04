import React, { useEffect } from 'react';

export function HelpOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <div className="panel modal-card" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Shortcuts</p>
            <h2>Keyboard-first</h2>
            <p className="muted text-sm">Esc zavře overlay/drawery.</p>
          </div>
          <button className="btn ghost sm" onClick={() => onOpenChange(false)} type="button">
            Esc
          </button>
        </div>

        <div className="grid two">
          <div className="panel soft compact">
            <div className="panel-head tight">
              <span className="eyebrow">Global</span>
              <span className="pill subtle">vždy</span>
            </div>
            <div className="list paged" style={{ gap: 6 }}>
              {[
                ['Enter', 'Primární akce (CALL / END / SAVE&NEXT / CONNECT / STOP / LOG)'],
                ['Cmd/Ctrl + K', 'Search leads'],
                ['↑ / ↓', 'Změna leadu v queue (na Lead Brief)'],
                ['?', 'Otevřít help (Shift+/)'],
                ['Esc', 'Zavřít overlay/drawer'],
              ].map(([k, v]) => (
                <div key={k} className="list-row" style={{ cursor: 'default', padding: '10px 12px' }}>
                  <div className="item-title" style={{ minWidth: 120 }}>
                    {k}
                  </div>
                  <div className="muted text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel soft compact">
            <div className="panel-head tight">
              <span className="eyebrow">Lead Brief</span>
              <span className="pill subtle">screen 1</span>
            </div>
            <div className="list paged" style={{ gap: 6 }}>
              {[
                ['D', 'Details drawer'],
                ['1..6', 'Disposition ve wrap-up'],
              ].map(([k, v]) => (
                <div key={k} className="list-row" style={{ cursor: 'default', padding: '10px 12px' }}>
                  <div className="item-title" style={{ minWidth: 120 }}>
                    {k}
                  </div>
                  <div className="muted text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel soft compact">
            <div className="panel-head tight">
              <span className="eyebrow">Live Call</span>
              <span className="pill subtle">screen 2</span>
            </div>
            <div className="list paged" style={{ gap: 6 }}>
              {[
                ['T', 'Transcript drawer'],
                ['O', 'Objection mode'],
                ['1..6', 'Outcome ve wrap-up'],
              ].map(([k, v]) => (
                <div key={k} className="list-row" style={{ cursor: 'default', padding: '10px 12px' }}>
                  <div className="item-title" style={{ minWidth: 120 }}>
                    {k}
                  </div>
                  <div className="muted text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

