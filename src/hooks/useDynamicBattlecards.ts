import { useCallback, useState } from 'react';
import type { Battlecard } from '../meetcoach/battlecards';
import { echoApi } from '../utils/echoApi';
import { isSupabaseConfigured } from '../utils/supabase/info';

type SectorBattlecardResponse = {
  detected_sector?: string;
  sector_emoji?: string;
  strategy_insight?: string;
  objections?: Array<{ trigger?: string; rebuttal?: string }>;
};

const safeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'dyn';

const buildTriggers = (trigger: string) => {
  const base = (trigger || '').toString().trim();
  if (!base) return [];
  const tokens = base
    .split(/[\s,.;:!?/()]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 8);
  return Array.from(new Set([base, ...tokens]));
};

const mapToBattlecards = (resp: SectorBattlecardResponse): Battlecard[] => {
  const sector = (resp.detected_sector || 'Sektor').toString().trim();
  const emoji = (resp.sector_emoji || '💡').toString().trim();
  const insight = (resp.strategy_insight || '').toString().trim();
  const objections = Array.isArray(resp.objections) ? resp.objections : [];

  const out: Battlecard[] = [];
  for (let i = 0; i < objections.length; i += 1) {
    const trigger = (objections[i]?.trigger || '').toString().trim();
    const rebuttal = (objections[i]?.rebuttal || '').toString().trim();
    if (!trigger || !rebuttal) continue;

    out.push({
      key: `dyn_${safeKey(sector)}_${i + 1}`,
      category: 'objection',
      title: `${emoji} ${sector}`,
      when_to_use: `Když zazní: „${trigger}“`,
      triggers: buildTriggers(trigger),
      primary: rebuttal,
      follow_up: 'Co by pro vás bylo nejdůležitější ověřit, aby to dávalo smysl?',
      proof_hook: insight ? [`• ${insight}`] : undefined,
      persona_tone: 'věcně, klidně, bez tlaku',
    });
  }

  return out.slice(0, 6);
};

export function useDynamicBattlecards() {
  const [cards, setCards] = useState<Battlecard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ sector?: string; insight?: string; emoji?: string } | null>(null);

  const generate = useCallback(async (payload: { companyName: string; industry?: string; personTitle?: string }) => {
    if (!isSupabaseConfigured) {
      setError('Supabase není nakonfigurovaný');
      return;
    }
    if (!payload.companyName?.trim()) {
      setError('Chybí název firmy');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = (await echoApi.ai.sectorBattleCard(payload)) as SectorBattlecardResponse;
      setMeta({
        sector: resp?.detected_sector,
        insight: resp?.strategy_insight,
        emoji: resp?.sector_emoji,
      });
      setCards(mapToBattlecards(resp || {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generování battlecards selhalo');
      setCards([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setCards([]);
    setMeta(null);
    setError(null);
  }, []);

  return { cards, meta, loading, error, generate, clear };
}

