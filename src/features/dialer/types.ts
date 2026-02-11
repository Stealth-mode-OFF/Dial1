export interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email?: string;
  title?: string;
  status: 'new' | 'contacted' | 'interested' | 'not-interested' | 'callback';
  priority: 'high' | 'medium' | 'low';
  industry?: string;
  website?: string;
  orgId?: number;
  notes?: string;
}

export type AppPhase = 'ready' | 'calling' | 'wrapup';

export interface DailyStats {
  calls: number;
  connected: number;
  meetings: number;
  talkTime: number;
}

export type CallOutcome = 'connected' | 'no-answer' | 'meeting';

export interface Session {
  stats: DailyStats;
  completedOutcomes: Record<string, CallOutcome>;
  notesByContact: Record<string, string>;
  domainByContact: Record<string, string>;
  currentIndex: number;
}

