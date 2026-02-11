import { formatMinutesSeconds } from '../../utils/time';
import type { CallOutcome } from './types';

export const formatTime = formatMinutesSeconds;

export const getSalutation = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `pane ${parts.slice(1).join(' ')}` : name;
};

export const outcomeLabel = (outcome: CallOutcome | null) => {
  if (outcome === 'meeting') return 'Demo domluveno';
  if (outcome === 'connected') return 'Spojeno';
  if (outcome === 'no-answer') return 'Nedovoláno';
  return '—';
};

