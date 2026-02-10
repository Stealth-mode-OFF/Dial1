# CODEX PROMPT: Email System Phase 2 – Gmail Draft API + Smart Sequencing

## Project Context

Repo: `Stealth-mode-OFF/Dial1` (main branch)
Stack: React + Vite + TypeScript frontend, Supabase Edge Functions (Hono) backend
Backend file: `supabase/functions/make-server-139017f8/index.ts` (~5800 lines)
Supabase project: `jgonvsuzzhbfebstzdjt`

### Current State (Phase 1 – DONE)
- **Dialer (cold calls)**: Pre-filled Czech template email, editable textarea, `mailto:` button with SmartBCC
- **MeetCoach (demos)**: AI-generated custom follow-up email (type `email-demo`), editable textarea, `mailto:` with SmartBCC
- SmartBCC address stored in `UserSettings.smartBccAddress` (SalesContext, localStorage)
- Backend handles `case 'email-demo'` in `index.ts` with a rich prompt using transcript context, SPIN data, AI analysis
- Emails are currently sent via `mailto:` — user reviews in textarea, then clicks "Otevřít v e-mailu" to open their mail client

### Key Files
- `src/DialerAppNew.tsx` – Dialer with cold call template email (~line 955)
- `src/MeetCoachAppNew.tsx` – MeetCoach with AI demo email (SummaryHero component ~line 458)
- `src/contexts/SalesContext.tsx` – UserSettings type with `smartBccAddress`
- `src/pages/SettingsWorkspace.tsx` – Settings UI with SmartBCC field
- `src/utils/echoApi.ts` – API client (untyped `ai.generate(payload: any)`)
- `supabase/functions/make-server-139017f8/index.ts` – backend (case 'email-demo' at ~line 4228)

---

## TASK 1: Gmail Draft API Integration

### Goal
Replace the `mailto:` flow with Gmail Draft API. When user clicks "Otevřít v e-mailu", create a Gmail draft instead of opening a mailto link. The user then goes to Gmail and sends it manually (still human-in-the-loop).

### Implementation Steps

#### 1.1 Google OAuth2 Setup
- Add Google OAuth2 flow to Settings page (new connection card next to Pipedrive/OpenAI)
- Scopes needed: `https://www.googleapis.com/auth/gmail.compose` (create drafts only)
- Store OAuth tokens in Supabase KV (same pattern as Pipedrive/OpenAI keys):
  - `gmail_access_token`, `gmail_refresh_token`, `gmail_token_expiry`
- Add refresh token logic to backend
- Use Google's OAuth2 redirect flow (not popup)

#### 1.2 Backend Endpoint: `/gmail/create-draft`
Add new Hono route in `index.ts`:
```typescript
app.post('/gmail/create-draft', async (c) => {
  const { userId } = getUserId(c);
  const { to, subject, body, bcc } = await c.req.json();
  
  // Get Gmail access token from KV, refresh if expired
  const token = await getGmailToken(userId);
  
  // Create draft via Gmail API
  // POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
  // Body: { message: { raw: base64url(RFC 2822 message) } }
  
  // Return draft ID + Gmail URL to open draft
  return c.json({ ok: true, draftId, gmailUrl: `https://mail.google.com/mail/u/0/#drafts/${draftId}` });
});
```

#### 1.3 Frontend: `echoApi.ts` Extension
Add typed methods:
```typescript
gmail: {
  createDraft: (payload: { to: string; subject: string; body: string; bcc?: string }) => Promise<{ ok: boolean; draftId: string; gmailUrl: string }>,
  getStatus: () => Promise<{ configured: boolean; email?: string }>,
}
```

#### 1.4 Frontend: Button Upgrade
In both DialerAppNew and MeetCoachAppNew, replace the `<a href="mailto:...">` with:
```tsx
// If Gmail is connected → create draft + open in Gmail
// If not → fallback to mailto:
<button onClick={async () => {
  if (gmailConfigured) {
    const { gmailUrl } = await echoApi.gmail.createDraft({ to, subject, body, bcc: smartBccAddress });
    window.open(gmailUrl, '_blank');
  } else {
    window.open(mailtoUrl, '_blank');
  }
}}>
  📧 Otevřít v e-mailu
</button>
```

#### 1.5 Settings UI
Add "Google / Gmail" connection card in `SettingsWorkspace.tsx`:
- "Connect Gmail" button → starts OAuth flow
- Shows connected email address when configured
- "Disconnect" button
- Test button: tries to list drafts to verify access

### Important Constraints
- NEVER auto-send. Only create drafts. User must click send in Gmail.
- Handle token refresh gracefully (Gmail tokens expire in 1 hour)
- If OAuth fails, fall back to mailto: silently
- Use Google Cloud project credentials stored as Supabase secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- OAuth redirect URL: `{SUPABASE_URL}/functions/v1/make-server-139017f8/gmail/callback`

---

## TASK 2: Email History per Contact

### Goal
Track which emails were sent to which contacts. Show email history in the precall/wrapup views.

### Implementation Steps

#### 2.1 Supabase Table
```sql
CREATE TABLE email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  contact_name TEXT,
  company TEXT,
  email_type TEXT NOT NULL, -- 'cold' | 'demo-followup' | 'sequence-d1' | 'sequence-d3'
  subject TEXT,
  body TEXT,
  recipient_email TEXT,
  gmail_draft_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'manual', -- 'manual' | 'gmail-draft' | 'auto-sequence'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_log_contact ON email_log(owner_user_id, contact_id);
```

#### 2.2 Backend: Log Email
When creating a Gmail draft or when user copies email (via a new "Mark as sent" button), log it:
```typescript
app.post('/email/log', async (c) => {
  const { userId } = getUserId(c);
  const { contactId, contactName, company, emailType, subject, body, recipientEmail, gmailDraftId } = await c.req.json();
  // Insert into email_log
});
```

#### 2.3 Frontend: Email History Component
Show in wrapup/precall: "Poslední e-maily:" section with date + type + subject of last 3 emails sent to this contact.

---

## TASK 3: Smart Sequencing (D+1, D+3 Auto-Follow-ups)

### Goal
After a cold call or demo, if no response after 1 day or 3 days, auto-generate a shorter follow-up email draft.

### Implementation Steps

#### 3.1 Sequence Definition
```typescript
const COLD_SEQUENCE = [
  { delay_days: 1, type: 'sequence-d1', prompt: 'Short bump email referencing the original cold email. Max 50 words. Czech.' },
  { delay_days: 3, type: 'sequence-d3', prompt: 'Final follow-up with social proof or case study reference. Max 80 words. Czech.' },
];

const DEMO_SEQUENCE = [
  { delay_days: 1, type: 'sequence-d1', prompt: 'Thank-you + "jsem k dispozici pokud máte otázky" bump. Max 50 words. Czech.' },
  { delay_days: 3, type: 'sequence-d3', prompt: 'Specific value add - share relevant case study or ROI data. Max 100 words. Czech.' },
];
```

#### 3.2 Supabase Table: Scheduled Emails
```sql
CREATE TABLE email_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'draft-created' | 'cancelled' | 'sent'
  context JSONB, -- original email context for AI generation
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3.3 Backend: Cron Job (Supabase pg_cron or Edge Function cron)
Every hour, check for pending scheduled emails where `scheduled_for <= now()`:
1. Generate email content using AI
2. Create Gmail draft (if Gmail connected) or prepare for manual send
3. Update status to 'draft-created'
4. Notify user (browser notification or in-app badge)

#### 3.4 Frontend: Sequence Management
In wrapup, after saving CRM note, show:
```
☐ Naplánovat follow-up sekvenci
  → D+1: Krátký bump (zítra v 9:00)
  → D+3: Case study follow-up (za 3 dny v 9:00)
```
User toggles on/off. When enabled, creates `email_schedule` rows.

In Dashboard/Settings, show active sequences with cancel buttons.

### Important Constraints
- Sequences only CREATE DRAFTS, never auto-send
- User can cancel any scheduled email
- If user manually sends an email to the same contact, auto-cancel the sequence
- Default send time: 9:00 CET (configurable in settings)
- Include email_log reference so we don't send duplicate content

---

## TASK 4: Type the Email API Interface

### Goal
Replace `echoApi.ai.generate(payload: any)` with proper TypeScript types.

### Implementation
In `src/utils/echoApi.ts`:
```typescript
type EmailColdPayload = {
  type: 'email' | 'email-cold';
  contactName: string;
  company: string;
  goal: string;
  contextData?: {
    outcome?: string;
    duration_sec?: number;
    notes?: string;
    aiAnalysis?: any;
  };
};

type EmailDemoPayload = {
  type: 'email-demo';
  contactName: string;
  company: string;
  goal: string;
  contextData?: {
    totalTimeSec?: number;
    phaseTimes?: Record<string, number>;
    aiAnalysis?: any;
    keyCaptions?: string;
    notes?: string;
    outcome?: string;
    duration_sec?: number;
  };
};

type AIGeneratePayload = EmailColdPayload | EmailDemoPayload | SpinScriptPayload | /* other types */;

type AIGenerateResult = {
  content: string;
};

// Then in echoApi:
ai: {
  generate: (payload: AIGeneratePayload): Promise<AIGenerateResult>,
}
```

---

## TASK 5: A/B Template Testing (FUTURE – Low Priority)

### Goal
Test different cold email templates and track open/response rates.

### Notes
- Store template variants in Supabase table `email_templates`
- Randomly assign variant A or B per contact
- Track: opened (via tracking pixel), replied (via Gmail API read), meeting booked (via Pipedrive deal stage)
- Dashboard to see conversion rates per template
- This requires open tracking (tracking pixel URL) — implement only if Gmail Draft API is done

**Skip this for now. Come back after Tasks 1-4 are production-stable.**

---

## Development Priorities
1. **TASK 4** (Type the API) – 30 min, low risk, do first
2. **TASK 1** (Gmail Draft API) – 2-4 hours, core feature
3. **TASK 2** (Email History) – 1-2 hours, useful for context
4. **TASK 3** (Smart Sequencing) – 3-5 hours, complex but high value
5. **TASK 5** (A/B Testing) – SKIP for now

## Testing Notes
- Test Gmail OAuth flow in dev with `http://localhost:5173` redirect
- Mock Gmail API in unit tests
- Verify SmartBCC is correctly added to RFC 2822 message headers
- Test token refresh: set short expiry and verify auto-refresh works
- Verify `mailto:` fallback when Gmail is not connected
