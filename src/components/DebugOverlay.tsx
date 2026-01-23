import React, { useEffect, useMemo, useState } from 'react';

type Overlay = {
  id: string;
  label: string;
  src: string;
};

const OVERLAYS: Overlay[] = [
  { id: 'dialer', label: 'Dialer (wide)', src: '/overlays/01-dialer.png' },
  { id: 'desk', label: 'Desk', src: '/overlays/02-desk.png' },
  { id: 'stats', label: 'Stats', src: '/overlays/03-stats.png' },
  { id: 'coach', label: 'Coach', src: '/overlays/04-coach.png' },
  { id: 'config', label: 'Config', src: '/overlays/05-config.png' },
  { id: 'dialerClose', label: 'Dialer (zoom)', src: '/overlays/06-dialer-close.png' },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Pixel-perfect helper: overlays a reference screenshot over the app.
 * Hotkeys:
 *  - Shift+O: toggle overlay
 *  - Shift+[ / Shift+]: previous / next overlay
 *  - Shift+↑ / Shift+↓: opacity +/-
 */
export function DebugOverlay() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const [enabled, setEnabled] = useState(() => {
    const q = params.get('overlay');
    return q === '1' || q === 'true';
  });
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(0.22);

  const overlay = OVERLAYS[index] ?? OVERLAYS[0];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Keep it hard to trigger accidentally.
      if (!e.shiftKey) return;

      if (e.key.toLowerCase() === 'o') {
        setEnabled((v) => !v);
      }
      if (e.key === '[') {
        setIndex((i) => (i - 1 + OVERLAYS.length) % OVERLAYS.length);
      }
      if (e.key === ']') {
        setIndex((i) => (i + 1) % OVERLAYS.length);
      }
      if (e.key === 'ArrowUp') {
        setOpacity((o) => clamp(o + 0.05, 0, 0.8));
      }
      if (e.key === 'ArrowDown') {
        setOpacity((o) => clamp(o - 0.05, 0, 0.8));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      {/* Reference overlay */}
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
            backgroundSize: 'cover',
            opacity,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* Small HUD */}
      <div
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: 10000,
          pointerEvents: 'none',
          fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            gap: 10,
            alignItems: 'center',
            padding: '8px 10px',
            background: 'white',
            border: '2px solid black',
            boxShadow: '3px 3px 0px 0px black',
            opacity: 0.95,
          }}
        >
          <span style={{ fontWeight: 900, fontSize: 12 }}>OVERLAY</span>
          <span style={{ fontSize: 12 }}>
            {enabled ? 'ON' : 'OFF'}
          </span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>•</span>
          <span style={{ fontSize: 12 }}>{overlay.label}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>•</span>
          <span style={{ fontSize: 12 }}>opacity {Math.round(opacity * 100)}%</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            (Shift+O / Shift+[ ] / Shift+↑↓)
          </span>
        </div>
      </div>
    </>
  );
}

