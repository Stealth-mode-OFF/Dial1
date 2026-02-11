import type { CallOutcome, Session } from './types';

const STORAGE_KEY = 'dial1.v4';

const defaultSession: Session = {
  stats: { calls: 0, connected: 0, meetings: 0, talkTime: 0 },
  completedOutcomes: {},
  notesByContact: {},
  domainByContact: {},
  currentIndex: 0,
};

export const loadSession = (): Session => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession;

    const parsed = JSON.parse(raw);

    // Migrate legacy completedIds (string[]) → completedOutcomes (Record)
    let completedOutcomes: Record<string, CallOutcome> = {};
    if (
      parsed?.completedOutcomes &&
      typeof parsed.completedOutcomes === 'object' &&
      !Array.isArray(parsed.completedOutcomes)
    ) {
      completedOutcomes = parsed.completedOutcomes;
    } else if (Array.isArray(parsed?.completedIds)) {
      for (const id of parsed.completedIds) {
        if (typeof id === 'string') completedOutcomes[id] = 'connected';
      }
    }

    return {
      stats: parsed?.stats || defaultSession.stats,
      completedOutcomes,
      notesByContact:
        parsed?.notesByContact && typeof parsed.notesByContact === 'object'
          ? parsed.notesByContact
          : {},
      domainByContact:
        parsed?.domainByContact && typeof parsed.domainByContact === 'object'
          ? parsed.domainByContact
          : {},
      currentIndex: Number.isFinite(parsed?.currentIndex) ? parsed.currentIndex : 0,
    };
  } catch {
    return defaultSession;
  }
};

export const saveSession = (session: Session) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {}
};

