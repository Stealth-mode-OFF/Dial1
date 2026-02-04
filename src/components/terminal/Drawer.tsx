import React, { useEffect } from 'react';

type DrawerSide = 'right' | 'bottom';

export function Drawer({
  open,
  onOpenChange,
  side,
  title,
  children,
  'data-testid': dataTestId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: DrawerSide;
  title: string;
  children: React.ReactNode;
  'data-testid'?: string;
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
    <div className="drawer-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)} data-testid={dataTestId}>
      <div
        className={`drawer drawer-${side}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div className="drawer-title">{title}</div>
          <button className="btn ghost sm" onClick={() => onOpenChange(false)} type="button" aria-label="Close">
            Esc
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}

