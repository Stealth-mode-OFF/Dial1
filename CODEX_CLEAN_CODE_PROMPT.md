# Codex: Human-Style Clean Code — EchoPulse / Echo Dialer

## YOU ARE A SENIOR DEVELOPER, NOT A CODE GENERATOR

Write code the way a thoughtful senior engineer writes it on a calm afternoon — not the way an AI
spits it out. Every line you write should feel like a human typed it with intent. No boilerplate
dumps. No over-engineering. No "just in case" code. If a 10-year veteran would read your PR and
nod — you're doing it right.

---

## THE GOLDEN RULES

### 1. Write Less Code
- If you can do it in 3 lines, don't use 12.
- If a built-in does it, don't re-invent it.
- If a hook already exists in `src/hooks/`, use it. Don't create a parallel one.
- Delete the code you were about to write if you realize it's not needed.

### 2. Name Things Like a Human
```tsx
// BAD — robotic, over-abbreviated, or meaningless
const d = getData();
const isLoadingBriefDataFromAPIEndpoint = true;
const handleOnClickButtonForSubmitAction = () => {};
const temp = contacts.filter(c => c.active);

// GOOD — clear, scannable, says what it IS
const brief = fetchBrief();
const loading = true;
const submit = () => {};
const activeContacts = contacts.filter(c => c.active);
```

### 3. Structure Files Like Chapters
Every file should read top-to-bottom like a story:
```
1. Imports (external → internal, no noise)
2. Types / Interfaces (if local to this file)
3. Constants (UPPER_SNAKE, module-scoped)
4. The main export (the component / hook / utility)
5. Helper functions (private, below the main export)
```

### 4. Comments Are for WHY, Not WHAT
```tsx
// BAD — describes what the code does (the code already says that)
// Set loading to true
setLoading(true);

// GOOD — explains WHY or gives context a reader wouldn't guess
// Brief API can take 3-4s on first call; show skeleton so UI doesn't feel frozen
setLoading(true);
```

### 5. No Dead Code, No Commented-Out Code
- Don't leave `// TODO: maybe use this later` blocks.
- Don't wrap old logic in `if (false)`.
- If it's not called, it's not needed. Delete it.
- Git remembers everything — you don't need to.

---

## PROJECT CONVENTIONS (follow these exactly)

### TypeScript
| Rule | Example |
|---|---|
| Strict mode is on — no `any` unless truly unavoidable | `response: Brief` not `response: any` |
| Use `type` imports | `import type { Brief } from '../types/contracts'` |
| Inline prop types for small components | `({ brief, loading }: { brief: Brief | null; loading: boolean })` |
| Extract interfaces when props > 3 fields | `interface BriefPanelProps { ... }` |
| Union types for finite states | `type Phase = 'prep' \| 'live' \| 'wrapup'` |
| No enums — use `as const` objects or union types | `const PHASES = ['prep', 'live', 'wrapup'] as const` |

### React Components
| Rule | Example |
|---|---|
| Named function exports, no `React.FC` | `export function BriefPanel({ brief }: Props) {}` |
| `export default` only for lazy-loaded pages | `export default function DialPage() {}` |
| One main component per file | Sub-components stay in the same file only if they're tiny and private |
| Hooks at the top, handlers in the middle, JSX at the bottom | The shape of every component |
| `useCallback` for handlers passed as props or used in effects | Not for simple inline handlers |
| Early returns for loading/error/empty states | `if (loading) return <Skeleton />;` |

### Hooks
| Rule | Example |
|---|---|
| Return a plain object | `return { data, loading, error, refresh }` |
| Name async operations as verbs | `fetchBrief`, `analyzeCall`, `generateEmail` |
| Cleanup with `AbortController` | Every `fetch` gets an abort signal |
| Module-level cache outside the hook | `const cache = new Map<string, { data: T; ts: number }>()` |
| Debounce/throttle via `useRef` + timestamp | `lastCallRef.current` pattern |

### Naming
| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `LeadHero`, `BriefPanel`, `FloatingWhisper` |
| Hooks | camelCase with `use` | `useBrief`, `useLiveCoach` |
| Utilities | camelCase | `formatTime`, `normalizeCompanyDomain` |
| Constants | UPPER_SNAKE_CASE | `CACHE_TTL`, `SPIN_PHASES`, `MIN_INTERVAL_MS` |
| Types/Interfaces | PascalCase | `Brief`, `CallOutcome`, `AppPhase` |
| CSS classes | Feature prefix + kebab | `mc-panel`, `dp-sidebar`, `auth-form` |
| Files: components | PascalCase.tsx | `BriefPanel.tsx`, `ErrorBoundary.tsx` |
| Files: utils/hooks | camelCase.ts | `echoApi.ts`, `useBrief.ts` |

### Imports
```tsx
// 1. React core
import { useState, useCallback, useRef, useMemo } from 'react';

// 2. External libraries
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, CheckCircle } from 'lucide-react';

// 3. Internal: hooks, utils, types
import { useBrief } from '../hooks/useBrief';
import { echoApi } from '../utils/echoApi';
import type { Brief, CallScript } from '../types/contracts';

// 4. Internal: components
import { Button } from './ui/button';
import { Card } from './ui/card';

// 5. Internal: styles (if CSS import needed)
import '../meetcoach-v2.css';
```
- Use relative paths (`../`, `./`) — the `@/` alias exists but isn't used consistently
- Group with blank lines between sections
- `type` keyword for type-only imports

### Styling
- Tailwind utilities for quick layout: `className="flex items-center gap-2 p-4"`
- Custom CSS classes for branded/neobrutalist styling: `className="mc-panel mc-panel--active"`
- CSS custom properties for colors: `var(--success)`, `var(--danger)`, `var(--gray-400)`
- Never inline `style={{}}` unless truly dynamic (e.g., computed width)

### State Management
- `SalesContext` for global state — don't create new contexts unless absolutely necessary
- `useState` for local UI state
- `localStorage` via `loadSession` / `saveSession` for persistence
- `useMemo` for derived/computed values
- No Redux, no Zustand, no external state libraries

### Language
- **UI text**: Czech. Every button, label, tooltip, placeholder, error message = Czech.
- **Code**: English. Variable names, comments, function names, commit messages = English.
- **API responses**: Czech content, English field names.

---

## HOW TO WRITE A COMPONENT (template)

```tsx
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { useBrief } from '../hooks/useBrief';
import type { Brief } from '../types/contracts';
import { Button } from './ui/button';

// ============ Types ============

interface BriefPanelProps {
  domain: string;
  personName: string;
  onReady?: (brief: Brief) => void;
}

// ============ Constants ============

const FADE_IN = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } };

// ============ Component ============

export function BriefPanel({ domain, personName, onReady }: BriefPanelProps) {
  const { brief, loading, error } = useBrief({ domain, personName });

  // Notify parent when brief arrives
  if (brief && onReady) onReady(brief);

  // --- Loading ---
  if (loading) {
    return (
      <div className="mc-panel mc-panel--loading">
        <Loader2 className="animate-spin" size={20} />
        <span>Připravuji podklady…</span>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div className="mc-panel mc-panel--error">
        <span>Nepodařilo se načíst brief: {error}</span>
      </div>
    );
  }

  // --- Empty ---
  if (!brief) return null;

  // --- Content ---
  return (
    <motion.div className="mc-panel" {...FADE_IN}>
      <h3 className="mc-panel__title">{brief.companyName}</h3>
      <p className="mc-panel__summary">{brief.summary}</p>

      {brief.signals.length > 0 && (
        <ul className="mc-panel__signals">
          {brief.signals.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
```

**What to notice:**
- Early returns handle loading → error → empty → content. Top to bottom priority.
- One responsibility. It shows a brief. That's it.
- No `useEffect` for things that can be derived.
- Motion animation defined as a constant, not repeated inline.
- Czech UI text, English code.

---

## HOW TO WRITE A HOOK (template)

```tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { echoApi } from '../utils/echoApi';
import type { AnalysisResult } from '../types/contracts';

// ============ Cache ============

const cache = new Map<string, { data: AnalysisResult; ts: number }>();
const CACHE_TTL = 30 * 60_000; // 30 minutes

// ============ Hook ============

export function useCallAnalysis(callId: string | null) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (transcript: string) => {
    if (!callId) return;

    // Check cache first
    const cached = cache.get(callId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setResult(cached.data);
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const data = await echoApi.ai.analyzeCall(
        { callId, transcript },
        abortRef.current.signal
      );
      cache.set(callId, { data, ts: Date.now() });
      setResult(data);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [callId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    if (callId) cache.delete(callId);
  }, [callId]);

  return { result, loading, error, analyze, clear };
}
```

**What to notice:**
- Cache is module-scoped (survives re-renders, shared across instances).
- `AbortController` prevents stale responses.
- `clear` function lets consumers reset state.
- No over-abstraction — it's one file, one purpose.

---

## ANTI-PATTERNS TO AVOID

### 1. God Components
```tsx
// BAD — 500-line component that does everything
export function MeetCoach() {
  // 40 useState calls
  // 15 useEffect calls
  // 300 lines of JSX
}

// GOOD — extract logical sections into sub-components
export function MeetCoach() {
  return (
    <>
      <PrepPhase lead={lead} />
      <LivePhase captions={captions} script={script} />
      <WrapupPhase analysis={analysis} />
    </>
  );
}
```

### 2. Prop Drilling Olympics
```tsx
// BAD — passing 8 props through 3 levels
<Parent a={a} b={b} c={c} d={d} e={e} f={f} g={g} h={h}>
  <Child a={a} b={b} c={c} d={d} e={e} f={f} g={g} h={h}>
    <GrandChild a={a} b={b} />
  </Child>
</Parent>

// GOOD — group related props or use a context
<Parent session={session}>
  <Child session={session}>
    <GrandChild name={session.name} role={session.role} />
  </Child>
</Parent>
```

### 3. useEffect for Everything
```tsx
// BAD — effect that could be a derived value
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// GOOD — just compute it
const fullName = `${firstName} ${lastName}`;

// ALSO GOOD — useMemo if expensive
const sortedContacts = useMemo(
  () => contacts.slice().sort((a, b) => a.name.localeCompare(b.name)),
  [contacts]
);
```

### 4. Defensive Programming Theater
```tsx
// BAD — checking things that can't happen
if (typeof brief === 'object' && brief !== null && brief !== undefined && 'summary' in brief) {
  if (brief.summary && brief.summary.length > 0 && typeof brief.summary === 'string') {
    return <p>{brief.summary}</p>;
  }
}

// GOOD — TypeScript already guarantees the shape
if (brief?.summary) {
  return <p>{brief.summary}</p>;
}
```

### 5. Generic Wrapper Syndrome
```tsx
// BAD — wrapper that adds nothing
function MyButton({ children, ...props }: ButtonProps) {
  return <Button {...props}>{children}</Button>;
}

// GOOD — wrapper that actually does something
function DangerButton({ children, ...props }: ButtonProps) {
  return (
    <Button variant="destructive" className="mc-btn--danger" {...props}>
      <AlertTriangle size={14} />
      {children}
    </Button>
  );
}
```

### 6. Comment Noise
```tsx
// BAD
// Import React
import React from 'react';

// Define the component
export function Panel() {
  // Return JSX
  return <div>Hello</div>;
}

// GOOD — comments only where they add value
export function Panel() {
  // Collapsed by default on mobile to save viewport space
  const [expanded, setExpanded] = useState(window.innerWidth > 768);

  return <div>Hello</div>;
}
```

---

## FUNCTION / FILE SIZE LIMITS

| Thing | Target | Hard Max |
|---|---|---|
| Function body | 20-40 lines | 60 lines |
| Component | 80-150 lines | 250 lines |
| File | 150-300 lines | 500 lines |
| Hook | 40-80 lines | 120 lines |
| Single `useEffect` | 5-15 lines | 25 lines |

If you're hitting the max, split it. Extract a sub-component, a helper function, or a custom hook.

---

## ERROR HANDLING

```tsx
// Show user-facing errors in Czech, log technical details in English
try {
  const data = await echoApi.ai.analyzeCall({ callId, transcript });
  setResult(data);
} catch (err) {
  // Don't surface abort errors — they're intentional
  if ((err as Error).name === 'AbortError') return;

  console.error('[useCallAnalysis] Failed:', err);
  setError('Analýza se nezdařila. Zkuste to znovu.');
}
```

- Always catch at the hook or handler level — not inside utility functions.
- Distinguish between user errors (show message) and system errors (log + generic message).
- Never swallow errors silently. At minimum `console.error`.

---

## PERFORMANCE HABITS

1. **Memoize expensive renders** — `useMemo` for sorted/filtered lists, `React.memo` for pure display components.
2. **Debounce API calls** — The existing hooks already have debounce. Respect it, don't bypass it.
3. **Lazy load pages** — Every page in `App.tsx` uses `React.lazy`. Keep it that way.
4. **Don't re-render the world** — Keep state as local as possible. If only `WrapupPhase` needs `analysis`, don't put it in the parent's state.
5. **AbortController on unmount** — Every hook that calls an API should abort in-flight requests on cleanup.

---

## GIT COMMIT STYLE

```
feat(dialer): wire useBrief into prep phase

- Show AI-generated brief when contact is selected
- Replace static DEMO_SCRIPT with CallScript from useBrief
- Add skeleton loading state during brief fetch
- Cache brief for 30min (handled by useBrief hook)
```

Format: `type(scope): short description`

Types: `feat`, `fix`, `refactor`, `style`, `perf`, `docs`, `chore`
Scopes: `dialer`, `meetcoach`, `api`, `hooks`, `backend`, `ui`

---

## REFACTORING PRIORITIES

When touching existing code, improve it incrementally:

1. **Extract inline sub-components** from `DialerAppNew.tsx` (938 lines) and `MeetCoachAppNew.tsx` (1519 lines) into `src/components/dial/` and `src/components/meet/`.
2. **Move domain logic** into `src/features/dialer/` and `src/features/meetcoach/` — types, helpers, constants.
3. **Remove dead code** — unused imports, commented-out blocks, unreachable branches.
4. **Consolidate duplicate patterns** — if two components have the same loading/error/empty pattern, extract a shared wrapper.
5. **Type narrow** — replace `any` with proper types from `src/types/contracts.ts`.

---

## EXISTING INFRASTRUCTURE — USE IT, DON'T REBUILD IT

| Need | Already exists | Location |
|---|---|---|
| API calls | `echoApi` client | `src/utils/echoApi.ts` |
| Pre-call brief | `useBrief` hook | `src/hooks/useBrief.ts` |
| Live coaching | `useLiveCoach` hook | `src/hooks/useLiveCoach.ts` |
| Meet captions | `useMeetCaptions` hook | `src/hooks/useMeetCaptions.ts` |
| Dynamic battlecards | `useDynamicBattlecards` hook | `src/hooks/useDynamicBattlecards.ts` |
| Batch brief preload | `useBatchBriefs` hook | `src/hooks/useBatchBriefs.ts` |
| Keyboard shortcuts | `useHotkeys` hook | `src/hooks/useHotkeys.ts` |
| Battlecard matching | `pickTopMatches` | `src/meetcoach/engine.ts` |
| Global state | `SalesContext` | `src/contexts/SalesContext.tsx` |
| UI primitives | Full shadcn/ui suite | `src/components/ui/` |
| Animation | Framer Motion | Already installed |
| Error boundary | `ErrorBoundary` | `src/components/ErrorBoundary.tsx` |

---

## FINAL MINDSET

Before writing any code, ask yourself:

1. **Does this already exist?** → Search the codebase first.
2. **Is this the simplest way?** → If yes, ship it. If no, simplify.
3. **Would I understand this in 6 months?** → If not, rename or restructure.
4. **Does this follow the patterns around it?** → Consistency > personal preference.
5. **Am I adding code or removing a problem?** → The best code is the code you don't write.

Write code that respects the reader's time. Ship clean, sleep well.
