import type { Campaign, Contact } from '../types/legacy';

export const demoContacts: Contact[] = [
  {
    id: 'demo-1',
    name: 'Jana Nováková',
    role: 'HR Director',
    company: 'Behavery',
    phone: '+420 777 111 222',
    aiSummary: 'Behavery roste v logistice, potřebuje udržet klíčové lidi na směnách.',
    hiringSignal: 'Zvýšená fluktuace ve výrobě, tlak na směny.',
    lastNews: 'Otevřeli nový provoz v Brně, nabírají 30 lidí.',
    intentScore: 82,
    personalityType: { type: 'Driver', advice: 'Buď stručný, ukaž čísla a rychlé ROI.' }
  },
  {
    id: 'demo-2',
    name: 'Petr Dvořák',
    role: 'Operations Manager',
    company: 'Logio',
    phone: '+420 777 333 444',
    aiSummary: 'Logio řeší stabilitu směn a onboarding nováčků.',
    hiringSignal: 'Onboarding je pomalý, mistrům chybí data o náladě týmu.',
    lastNews: 'Nasadili nový WMS, tým je přetížený změnami.',
    intentScore: 74,
    personalityType: { type: 'Analytical', advice: 'Jdi do detailu, ukaž data a konkrétní metriky.' }
  },
  {
    id: 'demo-3',
    name: 'Klára Černá',
    role: 'People Partner',
    company: 'Productboard',
    phone: '+420 777 555 666',
    aiSummary: 'Remote týmy hledají lepší signály engagementu.',
    hiringSignal: 'Roste tiché odcházení, chtějí dřívější signály.',
    lastNews: 'Plánují hiring 20 inženýrů Q2.',
    intentScore: 68,
    personalityType: { type: 'Amiable', advice: 'Začni empatií, ptej se na týmové zdraví.' }
  },
];

export const demoCampaigns: Campaign[] = [
  {
    id: 'demo-campaign',
    name: 'Demo Mission',
    description: 'Ukázkové kontakty bez připojení k Supabase',
    contactCount: demoContacts.length,
    contacts: demoContacts,
  },
];

export const demoAnalytics = {
  totalCalls: 18,
  callsToday: 4,
  connectRate: 35,
  revenue: 2200,
  dispositionBreakdown: [
    { name: 'connected', value: 6 },
    { name: 'no-answer', value: 8 },
    { name: 'sent', value: 4 },
  ],
  dailyVolume: [
    { time: 'Mon', value: 5 },
    { time: 'Tue', value: 4 },
    { time: 'Wed', value: 3 },
    { time: 'Thu', value: 4 },
    { time: 'Fri', value: 2 },
  ],
  recentActivity: [
    { id: '1', type: 'call', text: 'Connected with Jana (Behavery)', time: '09:10', action: 'View' },
    { id: '2', type: 'email', text: 'Email sent to Petr (Logio)', time: '08:55', action: 'View' },
    { id: '3', type: 'alert', text: 'Follow up with Klára', time: '08:30', action: 'View' },
  ],
};

export const demoBattleCardBase = {
  opening: 'Dobrý den, volám z Echo. Vidíme signály frustrace v týmu, můžeme to zlepšit během pár týdnů.',
  painPoint: 'Roste fluktuace a tiché odcházení, manažeři nevidí signály včas.',
  hook: 'Echo posílá měsíční pulsy přes SMS a dá vám data o rizikových týmech během 48 hodin.',
  objectionHandlers: [
    { objection: 'Pošlete to do mailu', response: 'Pošlu, ale nejdřív 1 minuta: kde vás teď nejvíc pálí odchody?' },
    { objection: 'Nemáme budget', response: 'Kolik stojí jeden odchod? Echo vyjde jako 1/10 nákladů na nábor.' },
    { objection: 'Máme už nástroj', response: 'Jak často ho lidi vyplňují? Echo má >70 % odpovědí díky SMS.' },
  ],
  estimatedDuration: '3-5 min',
  callToAction: 'Pojďme 15 min příští týden, ukážu vám data z výroby i IT.',
};

export function buildDemoBattleCard(contact: Contact) {
  return {
    ...demoBattleCardBase,
    opening: `Dobrý den, ${contact.name}, tady Echo. Vidíme, že ${contact.company} roste, chcete hlídat únavu týmů?`,
    painPoint: contact.hiringSignal || demoBattleCardBase.painPoint,
  };
}

export const demoScript = `Dobrý den, tady Echo. Vidím, že řešíte stabilitu týmu v ${demoContacts[0].company}. My měříme signály frustrace přes SMS, žádné dlouhé dotazníky. Dává smysl mrknout na 15 minut, jak to snížilo fluktuaci u výroby o 22 %?`;

export const demoEmailDraft = `Předmět: Krátký dotaz k retenci v týmu

Jano, v Echo sledujeme fluktuaci ve výrobě (Behavery) a vidíme, že firmy bez rychlých pulsů ztrácí 1–2 klíčové lidi za kvartál. Máme SMS check, který ukáže rizikové směny do 48 hodin. Má smysl 15 min příští týden?`;

export const demoAnalysis = {
  score: 78,
  summary: 'Dobře jsi zmapoval pain, příště dříve zavři na meeting.',
  strengths: ['Rychlé navázání rapportu', 'Konkrétní ROI příklady'],
  weaknesses: ['Chybělo explicitní next step', 'Více se ptej na rozhodovací proces'],
  coachingTip: 'Po první námitce vždy navrhni konkrétní termín demo callu.',
};
