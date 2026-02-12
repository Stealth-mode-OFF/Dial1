// ═══════════════════════════════════════════════════════════════
// DIALER CONFIGURATION — single source of truth
// ═══════════════════════════════════════════════════════════════

import type { CallOutcome } from "./types";

/** Scheduler embed URL for booking demos */
export const SCHEDULER_URL =
  "https://behavera.pipedrive.com/scheduler/GX27Q8iw/konzultace-jak-ziskat-jasna-data-o-svem-tymu-30-minutes";

/** Pipedrive company subdomain — used to build person/deal URLs */
export const PIPEDRIVE_DOMAIN = "behavera.pipedrive.com";

/** Auto-dial countdown seconds after no-answer */
export const AUTO_DIAL_SECONDS = 3;

/** Delay before auto-focusing first input during a call (ms) */
export const CALL_FOCUS_DELAY_MS = 3000;

/** Default SMS template */
export const DEFAULT_SMS_TEMPLATE =
  "Dobrý den, zkoušel/a jsem Vás zastihnout telefonicky. Rád/a bych s Vámi probral/a možnou spolupráci. Můžeme se spojit?";

/** Qualification questions — used in ReadyPhase, CallingPhase, WrapupConnectedCard */
export const QUAL_QUESTIONS = [
  {
    id: "size",
    label: "Velikost",
    prompt: "Kolik zaměstnanců máte?",
    script:
      "Naše řešení je nejvhodnější pro firmy od 50 do 500 zaměstnanců, kolik je vás?",
    followUp:
      "Super, to je přesně pro vás. Teď jsme to spustili v Raynetu, Prusovi atd.",
    placeholder: "Počet zaměstnanců…",
    icon: "👥",
  },
  {
    id: "mood",
    label: "Nálada",
    prompt: "Zjišťujete pravidelně náladu v týmech?",
    script: "Zjišťujete pravidelně jaká je nálada ve vašich týmech?",
    followUpNo:
      "Ne → Aha, to je škoda, dá se pomocí toho odhalit spoustu věcí.",
    followUpYes: "Ano → A jak to děláte?",
    placeholder: "Ano / Ne + detaily…",
    icon: "🎯",
  },
  {
    id: "decision",
    label: "Rozhodovatel",
    prompt: "Kdo rozhoduje o nákupu?",
    script: "Je třeba přizvat někoho dalšího pro případné rozhodnutí?",
    placeholder: "Kdo rozhoduje…",
    icon: "🔑",
  },
] as const;

/** Opening script line */
export const OPENING_SCRIPT =
  "Dobrý den, tady Josef z Behavery. My jsme český startup a řešíme vedení společností, aby jejich zaměstnanci byli více angažovaní…";

/** Outcome display config */
export const OUTCOME_CONFIG: Record<
  CallOutcome,
  { label: string; icon: string; color: string }
> = {
  connected: { label: "Dovoláno", icon: "✅", color: "green" },
  "no-answer": { label: "Nedovoláno", icon: "📵", color: "red" },
  meeting: { label: "Demo domluveno", icon: "📅", color: "gold" },
};

/** Keyboard shortcuts reference */
export const SHORTCUTS = {
  ready: { call: "C", skip: "→", navigate: "↑↓" },
  calling: { noAnswer: "1", connected: "2", meeting: "3", tab: "Tab" },
  wrapupNoAnswer: { sms: "S", pause: "Space", next: "Enter" },
  wrapupConnected: { save: "⌘↵", next: "Enter" },
};
