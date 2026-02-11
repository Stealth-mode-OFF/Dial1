import { useCallback, useRef, useState } from 'react';
import { echoApi } from '../utils/echoApi';
import type { Brief, BriefRequest } from '../types/contracts';

const inferDomain = (email: string | undefined | null): string => {
  const e = (email || '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0) return '';
  const domain = e.slice(at + 1).trim();
  if (!domain) return '';
  const blocked = new Set([
    'gmail.com',
    'seznam.cz',
    'email.cz',
    'centrum.cz',
    'atlas.cz',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'yahoo.com',
  ]);
  if (blocked.has(domain)) return '';
  return domain;
};

export interface BatchBriefProgress {
  total: number;
  loaded: number;
  done: boolean;
}

export function useBatchBriefs() {
  const [progress, setProgress] = useState<BatchBriefProgress>({ total: 0, loaded: 0, done: true });
  const [briefsByContactId, setBriefsByContactId] = useState<Record<string, Brief>>({});
  const runningRef = useRef(false);
  const skippedRef = useRef(false);

  const preload = useCallback(async (contacts: { id: string; name: string; email?: string | null; title?: string | null }[]) => {
    if (runningRef.current) return;

    const requests: { contact: typeof contacts[number]; domain: string }[] = [];
    for (const contact of contacts) {
      const domain = inferDomain(contact.email);
      if (domain) requests.push({ contact, domain });
    }

    if (!requests.length) {
      setProgress({ total: 0, loaded: 0, done: true });
      return;
    }

    runningRef.current = true;
    skippedRef.current = false;
    setProgress({ total: requests.length, loaded: 0, done: false });

    const BATCH_SIZE = 5;
    let loaded = 0;

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      if (skippedRef.current) break;
      const batch = requests.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async ({ contact, domain }) => {
          const req: BriefRequest = {
            domain,
            personName: contact.name,
            role: contact.title || '',
          };
          const brief = await echoApi.ai.brief(req);
          setBriefsByContactId((prev) => ({ ...prev, [contact.id]: brief }));
        }),
      );

      loaded += results.length;
      if (!skippedRef.current) {
        setProgress({ total: requests.length, loaded, done: false });
      }
    }

    runningRef.current = false;
    if (!skippedRef.current) {
      setProgress((prev) => ({ ...prev, done: true }));
    }
  }, []);

  const skip = useCallback(() => {
    skippedRef.current = true;
    setProgress((prev) => ({ ...prev, done: true }));
  }, []);

  return { progress, preload, skip, briefsByContactId };
}
