import { useEffect } from 'react';

export type HotkeyHandler = (event: KeyboardEvent) => boolean;

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return Boolean((el as any).isContentEditable);
};

export function useHotkeys(handler: HotkeyHandler, deps: React.DependencyList, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) && event.key !== 'Escape') return;
      const handled = handler(event);
      if (handled) event.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

