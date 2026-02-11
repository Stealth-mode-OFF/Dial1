// Legacy demo data removed — all data now comes from live Pipedrive API.
// This file is kept as a placeholder for backward compatibility.

import type { Campaign, Contact } from '../App';

export const demoContacts: Contact[] = [];
export const demoCampaigns: Campaign[] = [];
export const demoAnalytics = {
  totalCalls: 0,
  callsToday: 0,
  connectRate: 0,
  revenue: 0,
  dispositionBreakdown: [],
  dailyVolume: [],
  recentActivity: [],
};
export const demoBattleCardBase = {
  opening: '',
  painPoint: '',
  hook: '',
  objectionHandlers: [],
  estimatedDuration: '',
  callToAction: '',
};
export function buildDemoBattleCard(_contact: Contact) {
  return { ...demoBattleCardBase };
}
export const demoScript = '';
export const demoEmailDraft = '';
export const demoAnalysis = {
  score: 0,
  summary: '',
  strengths: [],
  weaknesses: [],
  coachingTip: '',
};
