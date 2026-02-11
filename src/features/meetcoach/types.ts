export type AppPhase = 'prep' | 'live' | 'wrapup';
export type SPINPhase = 'situation' | 'problem' | 'implication' | 'need-payoff';

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  notes?: string;
  industry?: string;
  companySize?: string;
}

export interface ScriptBlock {
  phase: SPINPhase;
  type: 'question' | 'tip' | 'transition';
  text: string;
  followUp?: string;
}

export interface DemoScript {
  lead: Lead;
  blocks: ScriptBlock[];
  generatedAt: Date;
}

export interface Whisper {
  id: string;
  text: string;
  type: 'tip' | 'warning' | 'success';
  timestamp: number;
}

