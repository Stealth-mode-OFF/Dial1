import { BATTLECARDS, PANIC_ALIASES, type Battlecard, type BattlecardCategory } from "./battlecards";

export type FeedLine = {
  id: string;
  ts: number;
  text: string;
  speakerName?: string | null;
};

export type MatchResult = {
  card: Battlecard;
  score: number;
};

const CATEGORY_PRIORITY: Record<BattlecardCategory, number> = {
  security: 4,
  "next-step": 3,
  objection: 2,
  persona: 1,
};

export function normalizeForMatch(input: string): string {
  const s = (input || "").toString().toLowerCase();
  // Remove diacritics to make matching more forgiving for Czech text.
  const noMarks = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return noMarks
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function weightForTrigger(trigger: string): number {
  // Approximation:
  // - multiword phrases behave like "exact phrase" (5)
  // - single tokens behave like "synonym" (3)
  return trigger.trim().includes(" ") ? 5 : 3;
}

function getAliasTriggersForKey(key: string): string[] {
  const out: string[] = [];
  for (const [alias, toKey] of Object.entries(PANIC_ALIASES)) {
    if (toKey === key) out.push(alias);
  }
  return out;
}

export function scoreCard(card: Battlecard, lines: string[]): number {
  const triggers = [...card.triggers, ...getAliasTriggersForKey(card.key)];
  if (!triggers.length) return 0;

  let total = 0;
  for (const line of lines) {
    const hay = normalizeForMatch(line);
    if (!hay) continue;
    let hitCount = 0;

    for (const trig of triggers) {
      const needle = normalizeForMatch(trig);
      if (!needle) continue;
      if (hay.includes(needle)) {
        total += weightForTrigger(trig);
        hitCount += 1;
      }
    }

    if (hitCount >= 2) total += 2; // bonus for multi-trigger sentence
  }
  return total;
}

export function pickTopMatches(
  feed: FeedLine[],
  opts: { windowMs: number; now: number; cooldownUntilByKey: Record<string, number | undefined> },
): { best: MatchResult | null; alt: MatchResult | null; persona: MatchResult | null } {
  const cutoff = opts.now - opts.windowMs;
  const recent = feed.filter((l) => l.ts >= cutoff).map((l) => l.text);
  if (!recent.length) return { best: null, alt: null, persona: null };

  const scored: MatchResult[] = [];
  const personas: MatchResult[] = [];

  for (const card of BATTLECARDS) {
    const cooldownUntil = opts.cooldownUntilByKey[card.key];
    if (cooldownUntil && cooldownUntil > opts.now) continue;

    const s = scoreCard(card, recent);
    if (s <= 0) continue;
    if (card.category === "persona") personas.push({ card, score: s });
    else scored.push({ card, score: s });
  }

  const sort = (a: MatchResult, b: MatchResult) => {
    const pa = CATEGORY_PRIORITY[a.card.category];
    const pb = CATEGORY_PRIORITY[b.card.category];
    if (pa !== pb) return pb - pa;
    if (a.score !== b.score) return b.score - a.score;
    return a.card.key.localeCompare(b.card.key);
  };

  scored.sort(sort);
  personas.sort(sort);

  const best = scored[0] || null;
  const persona = personas[0] || null;

  let alt: MatchResult | null = null;
  if (best && scored.length >= 2) {
    const candidate = scored[1];
    if (candidate && candidate.score >= best.score - 2 && candidate.card.key !== best.card.key) {
      alt = candidate;
    }
  }

  return { best, alt, persona };
}

export function getCategoryPriority(category: BattlecardCategory): number {
  return CATEGORY_PRIORITY[category] ?? 0;
}

