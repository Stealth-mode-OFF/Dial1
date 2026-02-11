import type { Lead, SPINPhase } from './types';

export const SPIN_PHASES: { id: SPINPhase; name: string; icon: string; color: string; duration: number }[] = [
  { id: 'situation', name: 'Situace', icon: '📋', color: '#3b82f6', duration: 300 },
  { id: 'problem', name: 'Problém', icon: '🎯', color: '#f59e0b', duration: 300 },
  { id: 'implication', name: 'Důsledky', icon: '⚡', color: '#ef4444', duration: 300 },
  { id: 'need-payoff', name: 'Řešení', icon: '✨', color: '#10b981', duration: 300 },
];

export const EMPTY_LEAD: Lead = {
  id: '',
  name: '',
  company: '',
  role: '',
  email: '',
  industry: '',
  companySize: '',
  notes: '',
};

export const WHISPER_TIPS: Record<SPINPhase, string[]> = {
  situation: ['👂 Poslouchej víc než mluvíš', '📝 Zapisuj si klíčové info', '🤔 Ptej se "Jak to teď funguje?"'],
  problem: ['🎯 Hledej bolest, ne přání', '❓ "Co vás na tom trápí nejvíc?"', '⏸️ Nech ticho pracovat'],
  implication: ['💰 Propoj problém s penězi', '⚡ "Co to znamená pro tým?"', '📊 Zeptej se na čísla'],
  'need-payoff': ['✨ Nech klienta popsat řešení', '🚀 "Jak by vypadal ideální stav?"', '🤝 Shrň a zeptej se na další krok'],
};

