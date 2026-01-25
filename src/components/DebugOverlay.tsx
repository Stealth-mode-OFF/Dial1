import React, { useEffect, useMemo, useState } from 'react';

type Overlay = {
  id: string;
  label: string;
  src: string;
};

const OVERLAYS: Overlay[] = [
  { id: 'dialer', label: 'Dialer', src: '/overlays/01-dialer.png' },
  { id: 'desk', label: 'Desk', src: '/overlays/02-desk.png' },
  { id: 'stats', label: 'Stats', src: '/overlays/03-stats.png' },
  { id: 'coach', label: 'Coach', src: '/overlays/04-coach.png' },
  { id: 'config', label: 'Config', src: '/overlays/05-config.png' },
  { id: 'dialer-close', label: 'Dialer (close)', src: '/overlays/06-dialer-close.png' },
];

function clampIndex(i: number, len: number) {
  const m = ((i % len) + len) % len;
  return m;
}

/**
 * Pixel-perfect helper overlay.
 *
 * Hotkeys:
 *  - Shift + O : toggle overlay
 *  - Shift + [ : previous overlay
 *  - Shift + ] : next overlay
 *  - Shift + - : opacity down
 *  - Shift + = : opacity up
 */
export function DebugOverlay() {
  const urlEnabled = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('overlay') === '1';
    } catch {
      return false;
    }
  }, []);

  const [enabled, setEnabled] = useState<boolean>(urlEnabled);
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(0.25);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;

      // Toggle
      if (e.key.toLowerCase() === 'o') {
        setEnabled((v) => !v);
        return;
      }

      // Cycle overlays
      if (e.key === '[') {
        setIdx((v) => clampIndex(v - 1, OVERLAYS.length));
        return;
      }
      if (e.key === ']') {
        setIdx((v) => clampIndex(v + 1, OVERLAYS.length));
        return;
      }

      // Opacity
      if (e.key === '-') {
        setOpacity((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100));
        return;
      }
      if (e.key === '=') {
        setOpacity((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100));
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const overlay = OVERLAYS[idx];

  return (
    <>
      {/* HUD */}
      <div
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 10000,
          pointerEvents: 'auto',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: 'white',
            border: '2px solid black',
            boxShadow: '4px 4px 0 0 black',
            borderRadius: 12,
          }}
        >
          <button
            onClick={() => setEnabled((v) => !v)}
            style={{
              border: '2px solid black',
              background: enabled ? '#22c55e' : '#e2e8f0',
              padding: '6px 10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 0 black',
            }}
            title="Shift+O"
          >
            Overlay
          </button>

          <button
            onClick={() => setIdx((v) => clampIndex(v - 1, OVERLAYS.length))}
            style={{
              border: '2px solid black',
              background: 'white',
              padding: '6px 10px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '2px 2px 0 0 black',
            }}
            title="Shift+["
          >
            ‹
          </button>
          <div style={{ fontSize: 12, fontWeight: 800, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {overlay.label}
          </div>
          <button
            onClick={() => setIdx((v) => clampIndex(v + 1, OVERLAYS.length))}
            style={{
              border: '2px solid black',
              background: 'white',
              padding: '6px 10px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '2px 2px 0 0 black',
            }}
            title="Shift+]"
          >
            ›
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setOpacity((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100))}
              style={{
                border: '2px solid black',
                background: 'white',
                padding: '6px 10px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '2px 2px 0 0 black',
              }}
              title="Shift+-"
            >
              –
            </button>
            <div style={{ fontSize: 12, fontWeight: 900, minWidth: 44, textAlign: 'center' }}>{Math.round(opacity * 100)}%</div>
            <button
              onClick={() => setOpacity((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100))}
              style={{
                border: '2px solid black',
                background: 'white',
                padding: '6px 10px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '2px 2px 0 0 black',
              }}
              title="Shift+="
            >
              +
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.75, fontWeight: 700, textAlign: 'right' }}>
          Shift+O toggle • Shift+[ / ] switch • Shift+- / = opacity
        </div>
      </div>

      {/* Actual overlay */}
      {enabled && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            backgroundImage: `url(${overlay.src})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
            backgroundSize: 'contain',
            opacity,
          }}
        />
      )}
    </>
  );
}
