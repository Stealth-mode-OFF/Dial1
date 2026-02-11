import type { CaptionLine } from '../../hooks/useMeetCaptions';
import type { SpinPhase as SpinPhaseLetter } from '../../types/contracts';
import { formatMinutesSeconds } from '../../utils/time';
import type { ScriptBlock, SPINPhase } from './types';

export const formatTime = formatMinutesSeconds;

export const toSpinLetter = (phase: SPINPhase): SpinPhaseLetter => {
  if (phase === 'situation') return 'S';
  if (phase === 'problem') return 'P';
  if (phase === 'implication') return 'I';
  return 'N';
};

export const toOrchestratorStage = (phase: SPINPhase): 'situation' | 'problem' | 'implication' | 'payoff' => {
  if (phase === 'situation') return 'situation';
  if (phase === 'problem') return 'problem';
  if (phase === 'implication') return 'implication';
  return 'payoff';
};

export const fromOrchestratorStage = (stage: string | null | undefined): SPINPhase | null => {
  const s = (stage || '').toString().toLowerCase();
  if (s === 'situation') return 'situation';
  if (s === 'problem') return 'problem';
  if (s === 'implication') return 'implication';
  if (s === 'payoff' || s === 'need-payoff' || s === 'need_payoff') return 'need-payoff';
  return null;
};

export const captionsToChunk = (captions: CaptionLine[], maxChars: number) => {
  const text = captions
    .slice(-60)
    .map((c) => `${c.speaker || '—'}: ${c.text}`)
    .join('\n');
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars);
};

export const spinScriptToBlocks = (script: any): ScriptBlock[] => {
  const out: ScriptBlock[] = [];

  // Already in UI format
  if (Array.isArray(script)) {
    for (const b of script) {
      if (b && typeof b === 'object' && typeof b.phase === 'string' && typeof b.text === 'string') {
        out.push(b as ScriptBlock);
      }
    }
    return out;
  }

  const blocks = Array.isArray(script?.blocks) ? script.blocks : [];
  for (const block of blocks) {
    const phase = (block?.phase || '').toString() as SPINPhase;
    const questions = Array.isArray(block?.questions) ? block.questions : [];
    const tips = Array.isArray(block?.tips) ? block.tips : [];
    const transitions = Array.isArray(block?.transitions) ? block.transitions : [];

    for (const q of questions.slice(0, 6)) {
      out.push({ phase, type: 'question', text: String(q) });
    }
    if (!questions.length && typeof block?.content === 'string' && block.content.trim()) {
      out.push({ phase, type: 'tip', text: block.content.trim() });
    }
    for (const t of tips.slice(0, 2)) {
      out.push({ phase, type: 'tip', text: String(t) });
    }
    for (const tr of transitions.slice(0, 1)) {
      out.push({ phase, type: 'transition', text: String(tr) });
    }
  }

  return out.filter((b) => ['situation', 'problem', 'implication', 'need-payoff'].includes(b.phase));
};

