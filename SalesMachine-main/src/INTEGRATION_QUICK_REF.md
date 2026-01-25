# Integration Quick Reference

## ⚡ 5-Minute Setup

### 1️⃣ Supabase (3 minutes)
```
1. Go to https://supabase.com → Sign up/Login
2. Create New Project
3. Copy keys from Settings → API:
   - Project URL → VITE_SUPABASE_URL (frontend)
   - anon key → VITE_SUPABASE_ANON_KEY (frontend + edge)
   - service_role → SUPABASE_SERVICE_ROLE_KEY (edge)
```
Optional legacy fallback:
- Project ID → VITE_SUPABASE_PROJECT_ID

### 2️⃣ Pipedrive (2 minutes)
```
1. Log into Pipedrive
2. Settings → Personal preferences → API
3. Copy token → PIPEDRIVE_API_KEY (edge secret)
```
Per-user keys are supported via the API endpoint `POST /integrations/pipedrive`.

### 3️⃣ Create `.env.local` (frontend)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx  # optional fallback
```

### 4️⃣ Edge Function Secrets (Supabase)
```
OPENAI_API_KEY=sk-...
PIPEDRIVE_API_KEY=...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# Optional access controls
ECHO_ALLOWED_ORIGINS=https://www.echopulse.cz,https://echopulse.cz
ECHO_DEFAULT_USER_ID=owner
ECHO_REQUIRE_AUTH=false
```

### 5️⃣ Restart & Test
```bash
npm run dev
```

✅ Done! Use the Settings screen to verify Supabase connectivity.

---

## 📁 Integration Files

| File | Purpose |
|------|---------|
| `supabase/functions/make-server-139017f8/index.ts` | Edge API (Pipedrive + AI + analytics) |
| `utils/supabase/info.tsx` | Frontend function base URL + config |
| `SUPABASE_PIPEDRIVE_SETUP.md` | Legacy setup guide (referenced, but not required for KV flow) |

---

## 🔌 Usage in Components

### Fetch Pipedrive Contacts (via Edge)
```tsx
import { buildFunctionUrl, publicAnonKey } from '@/utils/supabase/info';

const url = buildFunctionUrl('pipedrive/contacts');
const res = await fetch(url!, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
const contacts = await res.json();
```

### Log Call (via Edge)
```tsx
const url = buildFunctionUrl('call-logs');
await fetch(url!, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  },
  body: JSON.stringify({
    campaignId: 'campaign-id',
    contactId: '123',
    contactName: 'John Doe',
    companyName: 'TechCorp',
    disposition: 'meeting',
    notes: 'Booked demo',
    duration: 240,
  }),
});
```

### Store Per-User Pipedrive Key (optional)
```tsx
const url = buildFunctionUrl('integrations/pipedrive');
await fetch(url!, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  },
  body: JSON.stringify({ apiKey: 'your-pipedrive-key' }),
});
```

---

## ✅ Verification Steps

1. **Supabase Connected**
   - Open Settings screen
   - Knowledge list loads (or shows empty state)
2. **Pipedrive Connected**
   - CampaignList → Sync contacts
   - Real contacts appear
3. **Call Logging**
   - Complete a call flow
   - Analytics dashboard updates
