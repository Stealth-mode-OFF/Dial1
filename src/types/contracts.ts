// ============ DATA CONTRACTS ============
// Stable JSON contracts for Brief, CallScript, and LiveCoach.

// ---- Brief ----
export interface CompanyBrief {
  name: string;
  industry: string;
  size?: string;
  website?: string;
  summary: string;
  recentNews?: string;
}

export interface PersonBrief {
  name: string;
  role: string;
  linkedin?: string;
  background?: string;
  decisionPower: 'decision-maker' | 'influencer' | 'champion' | 'unknown';
}

export interface Signal {
  type: 'opportunity' | 'risk' | 'neutral';
  text: string;
}

export interface Brief {
  company: CompanyBrief;
  person: PersonBrief;
  signals: Signal[];
  landmines: string[];
  sources?: string[];
  generatedAt: string;
  cached: boolean;
}

// ---- CallScript ----
export interface ScriptVariant {
  id: string;
  text: string;
}

export interface ValueProp {
  persona: string;
  points: string[];
}

export interface QualificationQuestion {
  question: string;
  why: string;
}

export interface ObjectionHandler {
  objection: string;
  response: string;
}

export interface CallScript {
  openingVariants: ScriptVariant[];
  valueProps: ValueProp[];
  qualification: QualificationQuestion[];
  objections: ObjectionHandler[];
  closeVariants: ScriptVariant[];
  nextSteps: string[];
  generatedAt: string;
  cached: boolean;
}

// ---- LiveCoach ----
export interface CoachTip {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

export interface LiveCoachResponse {
  tips: CoachTip[];
  nextSpinQuestion?: {
    phase: 'S' | 'P' | 'I' | 'N';
    question: string;
  };
}

// ---- SPIN Questions ----
export type SpinPhase = 'S' | 'P' | 'I' | 'N';

export interface SpinQuestion {
  id: string;
  phase: SpinPhase;
  question: string;
  followUp?: string;
}

// ---- API Request types ----
export interface BriefRequest {
  domain: string;
  personName: string;
  role: string;
  notes?: string;
}

export interface CallScriptRequest {
  brief: Brief;
  goal: string;
}

export interface LiveCoachRequest {
  captionsChunk: string;
  brief: Brief;
  currentSpinStage: SpinPhase;
}
