// Legacy types from the original Figma bundle.
// Kept only so out-of-scope screens can continue to typecheck.

export type EnergyLevel = 'low' | 'medium' | 'high';
export type MoodLevel = 'bad' | 'neutral' | 'good';

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  contacts: Contact[];
};

export type Contact = {
  id: string;
  name: string;
  role?: string;
  company: string;
  phone: string;
  aiSummary?: string;
  hiringSignal?: string;
  lastNews?: string;
  intentScore?: number;
  personalityType?: {
    type: string;
    advice: string;
  };
};

