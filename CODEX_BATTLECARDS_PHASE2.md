# CODEX PROMPT: Battle Cards Phase 2 – Dynamic Management, AI Generation, Live Integration

## Project Context

Repo: `Stealth-mode-OFF/Dial1` (main branch)
Stack: React + Vite + TypeScript, Supabase Edge Functions (Hono) backend
Supabase project: `jgonvsuzzhbfebstzdjt`

### Current State (Phase 1 – DONE)
- **Data model**: `src/data/objectionCards.ts` — `ObjectionCard` type with 9 categories
- **8 seed cards** in Czech: Pandořina skříňka, Problém u manažerů, Malá firma, HR vs byznys, Upřímnost lidí, Další dashboard, Timing, Cena/rozpočet
- **BattleCardFlip component**: `src/components/BattleCardFlip.tsx` — CSS 3D flip, keyboard accessible, copy buttons
- **BattleCardsPage**: `src/pages/BattleCardsPage.tsx` — responsive grid, keyword search, category filter chips
- **Existing live coaching battlecards**: `src/meetcoach/battlecards.ts` — 12 cards with different schema (triggers-based for real-time detection during calls)
- **Routing**: Hash-based `#battlecards` in `App.tsx`, nav button "🃏 Karty" in Dialer header
- **Styling**: `src/battlecards.css` — neobrutalist design matching app

### Key Differences Between Two Battlecard Systems
1. **`src/data/objectionCards.ts`** (NEW - Phase 1): Study/reference cards. Schema: `title`, `whatProspectSays`, `whatTheyMean`, `commonMistake`, `functionalResponse[]`, `conversationDirection`. For pre-call preparation and training.
2. **`src/meetcoach/battlecards.ts`** (EXISTING): Live coaching cards. Schema: `key`, `category`, `title`, `when_to_use`, `triggers[]`, `primary`, `alt_1`, `alt_2`, `follow_up`, `proof_hook[]`, `dont_say[]`. Used by `engine.ts` to match captions in real-time during MeetCoach.

---

## TASK 1: Dynamic Card Management (CRUD via UI)

### Goal
Allow users to add, edit, and delete objection cards through the UI instead of editing code.

### Implementation Steps

#### 1.1 Supabase Table
```sql
CREATE TABLE objection_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  card_id TEXT NOT NULL, -- slug identifier
  card_order INT DEFAULT 100,
  category TEXT NOT NULL, -- ObjectionCategory enum
  title TEXT NOT NULL,
  what_prospect_says TEXT NOT NULL,
  what_they_mean TEXT NOT NULL,
  common_mistake TEXT NOT NULL,
  functional_response TEXT[] NOT NULL, -- array of sentences
  conversation_direction TEXT NOT NULL,
  is_seed BOOLEAN DEFAULT false, -- true for built-in cards
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the 8 initial cards with is_seed=true
-- These serve as defaults but can be edited by users
```

#### 1.2 Backend Endpoints
```
GET  /objection-cards           → list all cards for user (seeds + custom)
POST /objection-cards           → create new card
PUT  /objection-cards/:id       → update card
DELETE /objection-cards/:id     → delete card (only non-seed or if user confirms)
```

#### 1.3 Frontend: Card Editor Modal
- "Přidat kartu" button on BattleCardsPage
- Click pencil icon on card back → opens edit modal
- Form fields matching ObjectionCard type
- functionalResponse: dynamic list (add/remove/reorder sentences)
- Category dropdown with existing ObjectionCategory options
- Delete button with confirmation

#### 1.4 Migration Path
- On first load, if no DB cards exist, auto-seed from `OBJECTION_CARDS` array
- Existing seed cards get `is_seed: true` flag
- Users can edit seed cards (creates a user-owned copy)

---

## TASK 2: AI-Generated Battle Cards from Transcripts

### Goal
After a call transcript is analyzed, suggest new battle cards based on objections detected in the conversation.

### Implementation Steps

#### 2.1 Backend: New AI endpoint
Add `case 'generate-battlecard'` in `index.ts`:
```typescript
systemPrompt = `You are a sales coaching expert. Analyze the transcript for unresolved objections 
and generate battle cards following this EXACT JSON schema:
{
  title: string,
  whatProspectSays: string (exact quote or paraphrase from transcript),
  whatTheyMean: string (underlying concern),
  commonMistake: string (what NOT to do),
  functionalResponse: string[] (3-5 spoken sentences),
  conversationDirection: string (next step),
  category: "emotional_fear" | "authority_politics" | "financial_roi" | "data_privacy_trust" | "status_quo" | "adoption_engagement" | "value_skepticism" | "timing" | "implementation_tech"
}
Output MUST be in Czech.`;
```

#### 2.2 Frontend: "Generovat karty z transkriptu" button
- In TranscriptAnalyzer results section, add button "🃏 Generovat battle karty"
- Shows preview of AI-suggested cards
- User can approve/edit/dismiss each card
- Approved cards get saved to DB

#### 2.3 Deduplication
- Before saving, check if a similar card already exists (fuzzy title match)
- If duplicate found, offer to merge/update instead of create new

---

## TASK 3: Live Coaching Integration

### Goal
Bridge the two battlecard systems: when a new objection card is created in the study system, auto-generate a live coaching entry for MeetCoach.

### Implementation Steps

#### 3.1 Auto-generate triggers
When saving an ObjectionCard, use GPT to generate trigger keywords:
```typescript
// From objection card fields, extract keywords for live matching
const triggers = await generateTriggers({
  title: card.title,
  whatProspectSays: card.whatProspectSays,
  whatTheyMean: card.whatTheyMean,
});
// Returns: ["pandořa", "lavina", "otevřít", "problémy", ...] 
```

#### 3.2 Unified Card Registry
Create `src/data/unifiedBattlecards.ts`:
- Merges `objectionCards` (study) + `meetcoach/battlecards` (live) into one registry
- Each card has both study fields AND live coaching fields
- Engine.ts reads from unified registry

#### 3.3 Live Surfacing
During MeetCoach live phase, when a caption matches a trigger:
- Show the objection card title + functionalResponse in the whisper panel
- Add "📋 Otevřít kartu" button that shows full card detail

---

## TASK 4: Battle Card Analytics

### Goal
Track which cards get used, opened, copied — to understand what objections are most common and which responses work.

### Implementation Steps

#### 4.1 Event Tracking Table
```sql
CREATE TABLE battlecard_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  card_id TEXT NOT NULL, -- references objection_cards.card_id
  event_type TEXT NOT NULL, -- 'view' | 'flip' | 'copy_response' | 'copy_direction' | 'used_in_call'
  context TEXT, -- 'study' | 'live_call' | 'transcript'
  contact_id TEXT, -- optional: which contact was this used with
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4.2 Frontend: Track Events
- On card flip → log 'flip' event
- On copy button click → log 'copy_response' or 'copy_direction'
- On live coaching surface → log 'used_in_call' with contact_id

#### 4.3 Analytics Dashboard
- Top 5 most viewed cards
- Most copied responses
- Objections by category distribution
- Cards never used (candidates for improvement)

---

## TASK 5: Spaced Repetition Training Mode

### Goal
Help sales reps memorize objection responses through spaced repetition (like flashcards).

### Implementation Steps
- "Tréninkový režim" button on BattleCardsPage
- Shows one card at a time, front only
- User thinks of response, then flips to check
- Rate: "Uměl jsem" (knew it) / "Nevěděl jsem" (didn't know)
- Cards rated poorly appear more frequently (SM-2 algorithm)
- Daily streak counter
- Store repetition data in localStorage (or Supabase for persistence)

**This is a nice-to-have. Implement only after Tasks 1-3 are done.**

---

## Development Priorities
1. **TASK 1** (CRUD) – 3-4 hours, foundation for everything else
2. **TASK 3** (Live Integration) – 2-3 hours, high value for sales reps
3. **TASK 2** (AI Generation) – 2-3 hours, compound value with transcripts
4. **TASK 4** (Analytics) – 1-2 hours, nice insight
5. **TASK 5** (Spaced Repetition) – 3-4 hours, SKIP for now

## How to Add a New Card (Current Phase 1)
Edit `src/data/objectionCards.ts`, append to `OBJECTION_CARDS` array:
```typescript
{
  id: 'unique-slug',
  order: 9, // increment from last card
  category: 'emotional_fear', // one of ObjectionCategory
  title: 'Card Title',
  whatProspectSays: 'What the prospect says',
  whatTheyMean: 'What they really mean',
  commonMistake: 'What NOT to do',
  functionalResponse: [
    'Sentence 1.',
    'Sentence 2.',
    'Sentence 3.',
  ],
  conversationDirection: 'Where to steer the conversation',
}
```
