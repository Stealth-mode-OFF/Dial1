/**
 * Analysis Engine — Multi-stage transcript analysis pipeline
 *
 * Pipeline: transcript → LLM interpretation → summary → coaching narrative
 *
 * Each stage has a typed input/output contract. Pure functions handle
 * deterministic steps (parsing, metrics); LLM stages run on the backend.
 */

// ──────────────────────────────────────────────
// Stage 1: Parsed Transcript
// ──────────────────────────────────────────────

export interface TranscriptTurn {
  speaker: string;
  text: string;
  timestamp?: string;
}

export interface ParsedTranscript {
  turns: TranscriptTurn[];
  speakers: string[];
  meSpeaker: string;
  turnCount: number;
}

// ──────────────────────────────────────────────
// Stage 2: Metrics (local computation)
// ──────────────────────────────────────────────

export interface TalkMetrics {
  talkRatioMe: number;
  talkRatioProspect: number;
  totalWordsMe: number;
  totalWordsProspect: number;
  fillerWords: Record<string, number>;
  fillerWordRate: number;
  turnCount: number;
}

// ──────────────────────────────────────────────
// Stage 3: LLM Interpretation (returned by backend)
// ──────────────────────────────────────────────

export interface CategoryScore {
  score: number;
  note: string;
}

export interface QuestionItem {
  text: string;
  type: string;
  phase: string;
  quality: string;
}

export interface ObjectionItem {
  objection: string;
  response: string;
  quality: string;
}

export interface SpinPhaseDetail {
  count: number;
  examples: string[];
  quality: string;
}

export interface Interpretation {
  score: number;
  categoryScores: Record<string, CategoryScore>;
  strengths: string[];
  weaknesses: string[];
  fillerWordsAnalysis: string;
  talkRatioAnalysis: string;
  spinCoverage: Record<string, SpinPhaseDetail>;
  questionsAsked: QuestionItem[];
  objectionsHandled: ObjectionItem[];
}

// ──────────────────────────────────────────────
// Stage 4: Summary
// ──────────────────────────────────────────────

export interface AnalysisSummary {
  headline: string;
  keyMoments: string[];
  scoreExplanation: string;
  spinNotesPipedrive: string;
}

// ──────────────────────────────────────────────
// Stage 5: Coaching Narrative
// ──────────────────────────────────────────────

export interface CoachingAction {
  title: string;
  description: string;
  example?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PracticeScenario {
  situation: string;
  betterApproach: string;
}

export interface CoachingNarrative {
  /** Story-format coaching overview — what happened, why it matters */
  narrative: string;
  /** Ordered list of specific improvement actions */
  actions: CoachingAction[];
  /** Replay moments where a different approach would help */
  practiceScenarios: PracticeScenario[];
  /** One-sentence motivational takeaway */
  motivationalClose: string;
}

// ──────────────────────────────────────────────
// Full pipeline result (all stages combined)
// ──────────────────────────────────────────────

export interface FullAnalysisResult {
  parsed: ParsedTranscript;
  metrics: TalkMetrics;
  interpretation: Interpretation;
  summary: AnalysisSummary;
  coaching: CoachingNarrative;
}

// ──────────────────────────────────────────────
// Client-side transcript parsing (mirrors backend)
// ──────────────────────────────────────────────

const FMT1 = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+?):\s*(.+)$/;
const FMT2 = /^(.+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*$/;
const FMT3 = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)\s*$/;
const FMT4 = /^(.+?):\s+(.+)$/;

/**
 * Parse raw transcript text into structured turns.
 * Supports tLDV and common transcript formats.
 */
export function parseTranscript(raw: string): TranscriptTurn[] {
  const lines = raw.trim().split('\n');
  const turns: TranscriptTurn[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    let m = line.match(FMT1);
    if (m) {
      turns.push({ timestamp: m[1], speaker: m[2].trim(), text: m[3].trim() });
      i++; continue;
    }

    m = line.match(FMT2);
    if (m && i + 1 < lines.length) {
      const textLine = lines[i + 1]?.trim();
      if (textLine && !textLine.match(FMT2) && !textLine.match(FMT3)) {
        turns.push({ speaker: m[1].trim(), timestamp: m[2], text: textLine });
        i += 2; continue;
      }
    }

    m = line.match(FMT3);
    if (m && i + 1 < lines.length) {
      const textLine = lines[i + 1]?.trim();
      if (textLine && !textLine.match(FMT2) && !textLine.match(FMT3)) {
        turns.push({ speaker: m[2].trim(), timestamp: m[1], text: textLine });
        i += 2; continue;
      }
    }

    m = line.match(FMT4);
    if (m) {
      turns.push({ speaker: m[1].trim(), text: m[2].trim() });
      i++; continue;
    }

    if (turns.length > 0) {
      turns[turns.length - 1].text += ' ' + line;
    }
    i++;
  }

  return turns;
}

/**
 * Identify which speaker is the sales rep (heuristic: first speaker).
 */
export function identifyMeSpeaker(turns: TranscriptTurn[]): string {
  const speakers = [...new Set(turns.map(t => t.speaker))];
  if (speakers.length <= 1) return speakers[0] || 'Me';
  return speakers[0];
}

/**
 * Build a ParsedTranscript from raw text.
 */
export function buildParsedTranscript(raw: string, meSpeakerOverride?: string): ParsedTranscript {
  const turns = parseTranscript(raw);
  const speakers = [...new Set(turns.map(t => t.speaker))];
  const meSpeaker = meSpeakerOverride || identifyMeSpeaker(turns);
  return { turns, speakers, meSpeaker, turnCount: turns.length };
}

// ──────────────────────────────────────────────
// Coaching narrative builder (local, from analysis)
// ──────────────────────────────────────────────

/**
 * Build a local fallback coaching narrative from analysis data
 * when the backend LLM-generated narrative is unavailable.
 */
export function buildFallbackCoachingNarrative(
  interpretation: Interpretation,
  metrics: TalkMetrics,
): CoachingNarrative {
  const actions: CoachingAction[] = [];

  // Talk ratio action
  if (metrics.talkRatioMe > 60) {
    actions.push({
      title: 'Snížit poměr mluvení',
      description: `Mluvíš ${metrics.talkRatioMe}% času. Ideál je 30-40%. Zkus po každé otázce počkat 3 sekundy déle.`,
      priority: 'high',
    });
  }

  // Filler words action
  if (metrics.fillerWordRate > 3) {
    const topFillers = Object.entries(metrics.fillerWords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([w]) => `„${w}"`)
      .join(', ');
    actions.push({
      title: 'Redukovat parazitní slova',
      description: `Filler rate ${metrics.fillerWordRate}%. Nejčastější: ${topFillers}. Nahraď tiché pauzy.`,
      priority: metrics.fillerWordRate > 5 ? 'high' : 'medium',
    });
  }

  // Weaknesses → actions
  for (const w of interpretation.weaknesses.slice(0, 2)) {
    actions.push({ title: 'Oblast ke zlepšení', description: w, priority: 'medium' });
  }

  // Practice scenarios from missed/weak objections
  const practiceScenarios: PracticeScenario[] = interpretation.objectionsHandled
    .filter(o => o.quality === 'weak' || o.quality === 'missed')
    .slice(0, 2)
    .map(o => ({
      situation: `Klient řekl: „${o.objection}"`,
      betterApproach: o.quality === 'missed'
        ? 'Příště reaguj validací pocitu a otevřenou otázkou.'
        : `Místo „${o.response.slice(0, 60)}…" zkus validovat a přerámovat.`,
    }));

  // Narrative
  const level = interpretation.score >= 70 ? 'solidní' : interpretation.score >= 40 ? 'průměrný' : 'slabý';
  const narrative = [
    `Celkově ${level} hovor (${interpretation.score}/100).`,
    interpretation.strengths.length > 0 ? `Silná stránka: ${interpretation.strengths[0]}.` : '',
    interpretation.weaknesses.length > 0 ? `Největší příležitost ke zlepšení: ${interpretation.weaknesses[0]}.` : '',
    actions.length > 0 ? `Zaměř se na ${actions.length} ${actions.length === 1 ? 'konkrétní akci' : 'konkrétních akcí'} níže.` : '',
  ].filter(Boolean).join(' ');

  const motivationalClose = interpretation.score >= 70
    ? 'Dobrá práce — drž tenhle standard a posouvej se dál.'
    : interpretation.score >= 40
      ? 'Základ máš, teď to dotáhni na další level.'
      : 'Každý skvělý obchodník začínal na nule. Začni s jednou věcí a zlepšuj se.';

  return { narrative, actions, practiceScenarios, motivationalClose };
}
