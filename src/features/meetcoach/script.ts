import { echoApi } from '../../utils/echoApi';
import type { Lead, ScriptBlock } from './types';
import { spinScriptToBlocks } from './helpers';

export const generateDemoScript = async (lead: Lead): Promise<ScriptBlock[]> => {
  try {
    const result = await echoApi.ai.generate({
      type: 'spin-script',
      contactName: lead.name,
      company: lead.company,
      goal: 'Pochopit potřeby klienta a dohodnout další krok',
      contextData: {
        contact_id: lead.id,
        role: lead.role,
        industry: lead.industry,
        notes: lead.notes,
      },
    });
    const script = result?.script || null;
    return spinScriptToBlocks(script);
  } catch {
    return [
      {
        phase: 'situation',
        type: 'question',
        text: `Jak teď řešíte sales proces v ${lead.company}?`,
        followUp: 'Kolik lidí na tom pracuje?',
      },
      { phase: 'situation', type: 'question', text: 'Jaké nástroje používáte?', followUp: 'Jak jste s nimi spokojeni?' },
      { phase: 'problem', type: 'question', text: 'Co vás na současném řešení trápí nejvíc?', followUp: 'Jak často se to děje?' },
      { phase: 'problem', type: 'question', text: 'Kde ztrácíte nejvíc času?', followUp: 'Kolik času týdně?' },
      { phase: 'implication', type: 'question', text: 'Co to znamená pro váš tým?', followUp: 'Jak to ovlivňuje výsledky?' },
      { phase: 'implication', type: 'question', text: 'Kolik vás to stojí měsíčně?', followUp: 'A ročně?' },
      { phase: 'need-payoff', type: 'question', text: 'Jak by vypadal ideální stav?', followUp: 'Co by to pro vás změnilo?' },
      {
        phase: 'need-payoff',
        type: 'question',
        text: 'Co kdybyste mohli ušetřit 10 hodin týdně?',
        followUp: 'Na co byste ten čas využili?',
      },
    ];
  }
};

