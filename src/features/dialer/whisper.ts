import { echoApi } from '../../utils/echoApi';
import { isSupabaseConfigured } from '../../utils/supabase/info';

export const getWhisper = async (objection: string): Promise<string | null> => {
  if (!isSupabaseConfigured || !objection.trim()) return null;
  try {
    const r = await echoApi.ai.generate({
      type: 'battle_card',
      contactName: '',
      company: '',
      contextData: { objection },
    });
    return r?.reframe || r?.response || null;
  } catch {
    return null;
  }
};

