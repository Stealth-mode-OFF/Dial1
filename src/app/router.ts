import { useEffect, useMemo, useState } from 'react';

export type Route =
  | { name: 'login' }
  | { name: 'contacts'; contactId?: string }
  | { name: 'calls' }
  | { name: 'settings' }
  | { name: 'notFound' };

export function navigate(to: string) {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function replace(to: string) {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePathname(): string {
  const [path, setPath] = useState(() => (typeof window === 'undefined' ? '/' : window.location.pathname));

  useEffect(() => {
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);

  return path;
}

export function parseRoute(pathname: string): Route {
  const parts = pathname.split('?')[0]?.split('/').filter(Boolean) ?? [];

  if (parts.length === 0) return { name: 'contacts' };

  if (parts[0] === 'login') return { name: 'login' };
  if (parts[0] === 'contacts') {
    return { name: 'contacts', contactId: parts[1] };
  }
  if (parts[0] === 'calls') return { name: 'calls' };
  if (parts[0] === 'settings') return { name: 'settings' };

  return { name: 'notFound' };
}

export function useRoute(): Route {
  const pathname = usePathname();
  return useMemo(() => parseRoute(pathname), [pathname]);
}

