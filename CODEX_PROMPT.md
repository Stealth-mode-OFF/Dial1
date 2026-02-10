# Codex Task: EchoPulse AI Sales Intelligence — Major Upgrade

## WHO YOU ARE
You are working on **EchoPulse / Echo Dialer** — a Czech B2B sales tool (React + Vite frontend, Supabase Edge Functions backend). The app has two main UIs:
1. **Dialer** (`src/DialerAppNew.tsx`) — cold calling with phase-based UX (prep → calling → wrapup)
2. **MeetCoach** (`src/MeetCoachAppNew.tsx`) — 20-min Google Meet demo coaching with SPIN framework (prep → live → wrapup)

## WHAT EXISTS BUT IS DISCONNECTED
The codebase has powerful AI infrastructure that is **built but NOT wired up**. Your job is to connect it and dramatically improve the AI value for sales reps.

### Existing unused systems:
1. **`useBrief` hook** (`src/hooks/useBrief.ts`) — calls `POST /ai/brief` + `POST /ai/call-script` but is NOT used in either DialerAppNew or MeetCoachAppNew
2. **`useLiveCoach` hook** (`src/hooks/useLiveCoach.ts`) — calls `POST /ai/live-coach` with live captions + SPIN stage but is NOT connected to MeetCoachAppNew
3. **`POST /ai/spin/next`** — sophisticated multi-agent SPIN orchestrator (5 parallel agents + orchestrator) that expects `transcriptWindow` from live calls but NO frontend sends it data
4. **`POST /ai/analyze-call`** — post-call scoring/analysis endpoint but nothing calls it from the wrapup phase
5. **`POST /ai/sector-battle-card`** — generates industry-specific battlecards dynamically but the live coaching only uses 12 static hardcoded cards
6. **`POST /ai/generate` with type `call-intelligence`** — generates massive pre-call brief with certiantyBuilders, loopingScripts, callTimeline but Dialer uses hardcoded script instead
7. **Evidence/Facts pipeline** (`POST /evidence/*`, `POST /precall/context`) — full document ingestion → extraction → review → pack system, not exposed in UI

## YOUR TASKS (ordered by impact)

### TASK 1: Wire `useBrief` into Dialer PREP phase
**File:** `src/DialerAppNew.tsx`

In the PREP phase (before calling), the Dialer currently shows a static contact card. Instead:
- Call `useBrief({ domain: contact.company_website, personName: contact.name, role: contact.role, notes: contact.notes })` when a contact is selected
- Show the Brief data in the LeadHero component: company summary, person insights, signals (buying signals), landmines (things to avoid)
- Replace the hardcoded `DEMO_SCRIPT` with the AI-generated `CallScript` from `useBrief` — show `openingVariants[0]`, `qualification` questions, `objections` handlers
- Show a loading skeleton while Brief is generating
- The Brief is cached 30min in the hook already, so it won't re-fetch unnecessarily

### TASK 2: Wire `useLiveCoach` into MeetCoach LIVE phase
**File:** `src/MeetCoachAppNew.tsx`

Currently MeetCoachAppNew receives Google Meet captions via `useMeetCaptions()` but only runs local keyword matching. Instead:
- Import and use `useLiveCoach` hook
- Feed it the captions chunk (last 2000 chars of caption text) + the current SPIN phase
- When `useLiveCoach` returns `tips`, show them as floating whispers (replace the current hardcoded `WHISPER_TIPS` rotation)
- When it returns `nextSpinQuestion`, show it prominently as the suggested next question
- Keep the local battlecard matching as a fallback (it's faster), but overlay AI coaching tips when available
- The hook has 8s debounce built in, so it won't spam the API

### TASK 3: Add post-call AI analysis to WRAPUP phases
**Files:** `src/DialerAppNew.tsx`, `src/MeetCoachAppNew.tsx`

In both apps, the WRAPUP phase currently shows basic time stats. Add:
- Call `echoApi.ai.analyzeCall()` with any available transcript/notes data
- Show the AI score (0-100), strengths, weaknesses, and coaching tip
- For MeetCoach: use the captions collected during the live phase as the transcript
- For Dialer: use the call notes/disposition entered by the user
- Add a "Generate follow-up email" button that calls `echoApi.ai.generate({ type: 'email', ... })` with the call context
- Show the generated email in a copyable text area

### TASK 4: Upgrade the SPIN script generation prompt
**File:** `supabase/functions/make-server-139017f8/index.ts`

Find the `spin-script` case in the `/ai/generate` endpoint (around line 4200+). The current prompt generates a basic SPIN script. Upgrade it:

1. **Add the prospect's industry context**: Use `INDUSTRY_KNOWLEDGE` to customize questions for their sector (Manufacturing vs IT vs Corporate)
2. **Add evidence-gating**: Before generating, check if there are approved facts for this contact in `v_approved_facts`. If yes, weave them into the script as proof points. If no evidence, generate validation questions instead of claims.
3. **Add the Straight Line Persuasion certainty scale**: For each SPIN block, add a `certaintyTarget` field (1-10) indicating what certainty level this question should build toward
4. **Add "red lines"**: Things the rep should NEVER say based on `dont_say` from battlecards matching the prospect's likely objections
5. **Make the script time-aware**: Each block should have a `targetMinute` field so the rep knows pacing (e.g., Situation: 0-5min, Problem: 5-10min, etc.)
6. **Return `transitionPhrases`**: Natural Czech phrases to bridge between SPIN phases (e.g., "To je zajímavé, a když se na to podíváme z druhé strany...")

The response JSON schema should be:
```json
{
  "script": {
    "totalDuration": 1200,
    "blocks": [
      {
        "phase": "situation",
        "type": "question",
        "text": "...",
        "followUp": "...",
        "certaintyTarget": 3,
        "targetMinute": 2,
        "proofPoint": "...|null",
        "redLines": ["..."]
      }
    ],
    "transitionPhrases": {
      "situation_to_problem": "...",
      "problem_to_implication": "...",
      "implication_to_need": "..."
    },
    "closingTechniques": [...],
    "objectionHandlers": [...]
  }
}
```

### TASK 5: Connect the multi-agent SPIN orchestrator to MeetCoach
**Files:** `src/MeetCoachAppNew.tsx`, `src/utils/echoApi.ts`

The `POST /ai/spin/next` endpoint is the most sophisticated AI in the system — 5 parallel SPIN agents analyzing the transcript in real-time. Connect it:

- During the LIVE phase, accumulate captions into a `transcriptWindow` (last 14 turns)
- Every 15-20 seconds (or when the user advances to the next block), call `echoApi.ai.spinNext()` with:
  ```json
  {
    "transcriptWindow": [...last 14 caption lines...],
    "recap": "current situation summary",
    "dealState": { "stage": "currentSpinPhase", "objectionCount": 0 },
    "stageTimers": { "situation": 120, "problem": 0, ... }
  }
  ```
- When the orchestrator returns, update the coaching UI:
  - `say_next` → Show as the primary suggested question (replace current static script block)
  - `coach_whisper` → Show as floating whisper
  - `confidence` → If < 0.35, show "(pause — listen more)" instead of a question
  - `stage` → Auto-advance the SPIN phase if the orchestrator suggests a different stage
  - `risk` → Show as a subtle warning indicator

This makes the demo coaching truly adaptive — the AI watches what the prospect says and adjusts the script in real-time instead of following a static list.

### TASK 6: Improve the `call-intelligence` prompt for pre-call prep
**File:** `supabase/functions/make-server-139017f8/index.ts`

Find the `call-intelligence` case in `/ai/generate`. Current prompt is good but can be improved:

1. **Add a "first 20 seconds" section**: The most critical part of a cold call. Generate 3 variants of the opening line, each with a different angle (curiosity, social proof, direct value)
2. **Add "voicemail script"**: 80% of cold calls go to voicemail. Generate a 30-second voicemail script variant
3. **Add "gatekeeper script"**: How to get past the assistant/receptionist with a confident, non-salesy approach
4. **Add "LinkedIn message draft"**: If the call doesn't connect, suggest a LinkedIn InMail follow-up
5. **Include Czech culture context**: Add to the system prompt that Czech B2B buyers are skeptical of hype, value directness, and respond to concrete ROI numbers. They hate being "sold to" but love being "consulted with."

### TASK 7: Dynamic battlecard generation
**File:** `src/MeetCoachAppNew.tsx` or new file `src/hooks/useDynamicBattlecards.ts`

Currently the 12 battlecards in `meetcoach/battlecards.ts` are static. Before a demo starts (PREP phase):
- Call `echoApi.ai.sectorBattleCard({ companyName: lead.company, industry: lead.industry, personTitle: lead.role })`
- Merge the returned dynamic cards with the static ones
- Use the combined set for real-time matching during the LIVE phase
- This means the coaching is customized for the prospect's industry instead of generic

### TASK 8: Auto-generate CRM notes on wrapup
**Files:** `src/DialerAppNew.tsx`, `src/MeetCoachAppNew.tsx`

In the WRAPUP phase, add an "Save to CRM" button:
- Collect: duration, SPIN phase times, AI analysis score, user notes, key captions
- Call `echoApi.addPipedriveNote({ personId, content: formattedNote })` with a structured note
- The note format should include: call outcome, duration, key topics, next steps, AI coaching score
- Show success/error feedback

## IMPORTANT CONSTRAINTS
- All user-facing text must be in **Czech** (buttons, labels, tooltips, AI responses)
- Keep the **neobrutalist design** — solid borders, offset shadows, bold colors
- Use existing CSS variables from `meetcoach-v2.css` and `dialer-v2.css`
- Don't change the phase-based UX pattern (prep → live/calling → wrapup)
- Don't remove any existing working functionality
- The Supabase Edge Function is in `supabase/functions/make-server-139017f8/index.ts` — it's a single 5000+ line Hono server
- API calls go through `src/utils/echoApi.ts`
- AI model preferences: `gpt-4o` for quality prompts, `gpt-4o-mini` for speed/cost-sensitive real-time calls
- The `useBrief` hook caches for 30min, the Brief endpoint caches in KV for 2h
- The `useLiveCoach` hook has 8s debounce

## FILE MAP
```
src/DialerAppNew.tsx          — Dialer UI (phase-based)
src/MeetCoachAppNew.tsx       — MeetCoach UI (phase-based)
src/dialer-v2.css             — Dialer styles
src/meetcoach-v2.css          — MeetCoach styles
src/hooks/useBrief.ts         — Brief + CallScript hook (UNUSED)
src/hooks/useLiveCoach.ts     — Live coaching hook (UNUSED)
src/hooks/useMeetCaptions.ts  — Google Meet captions hook
src/utils/echoApi.ts          — API client (all endpoints)
src/meetcoach/battlecards.ts  — 12 static battlecards (Czech)
src/meetcoach/engine.ts       — Keyword matching engine
src/types/contracts.ts        — Brief/CallScript/LiveCoach types
src/App.tsx                   — Router
supabase/functions/make-server-139017f8/index.ts — Backend (5000+ lines)
```

## SUCCESS CRITERIA
After these changes:
1. A sales rep opens the Dialer → sees an AI-generated company brief + personalized script before calling
2. During a Google Meet demo, the system watches live captions and provides adaptive SPIN coaching in real-time (not static tips)
3. After any call, the rep gets an AI score, strengths/weaknesses, and can auto-generate a follow-up email + CRM note
4. The battlecards adapt to each prospect's industry instead of being generic
5. All existing phase-based UX and neobrutalist design is preserved
