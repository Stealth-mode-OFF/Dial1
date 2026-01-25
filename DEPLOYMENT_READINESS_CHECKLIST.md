# Deployment Readiness Checklist - Echo Telesales OS

This is the single, ordered TODO list. Do items in order. Do not skip ahead.

Last updated: 2026-01-25
Current step: 1.1 (Env mapping and frontend env wiring)

---

## 0. Source docs review (must be done first)

Required docs to read and use as source of truth:
- [x] src/DOCUMENTATION_INDEX.md
- [x] src/LAUNCH_SUMMARY.md
- [x] src/PRODUCTION_CHECKLIST.md
- [x] src/DEPLOYMENT.md
- [x] src/TESTING.md
- [x] src/MANUAL_TESTING_GUIDE.md
- [x] src/BUG_TRACKER.md

Evidence/notes:
- Docs read and extracted into the checklist below.

Stop here if any doc is missing or outdated.

---

## 1. Environment and secrets (must complete before backend)

### 1.1 Map required environment variables and usage (verifiable)

Frontend (public, Vite):
- VITE_SUPABASE_URL
  - Expected usage: frontend API base
  - Where it should be used: src/utils/supabase/info.tsx or a client helper
  - Current state: src/utils/supabase/info.tsx is hardcoded (projectId/publicAnonKey)
- VITE_SUPABASE_ANON_KEY
  - Expected usage: frontend Authorization bearer for Supabase functions
  - Current state: hardcoded in src/utils/supabase/info.tsx

Backend (Supabase Edge Functions, server-only):
- SUPABASE_URL
  - Used in: src/supabase/functions/server/index.tsx (Deno.env.get)
- SUPABASE_SERVICE_ROLE_KEY
  - Used in: src/supabase/functions/server/index.tsx (Deno.env.get)
- OPENAI_API_KEY
  - Required by docs for AI endpoints (src/DEPLOYMENT.md, src/PRODUCTION_CHECKLIST.md)
  - Must be server-only
- PIPEDRIVE_API_KEY
  - Required by docs for Pipedrive endpoints (src/DEPLOYMENT.md, src/PRODUCTION_CHECKLIST.md)
  - Must be server-only
- SUPABASE_ANON_KEY
  - Required by docs for Edge Function secrets (src/DEPLOYMENT.md)
  - Verify actual usage in code
- SUPABASE_DB_URL (optional)
  - Required by docs if needed (src/PRODUCTION_CHECKLIST.md)

Checklist:
- [x] Confirm frontend uses VITE_* values (removed hardcoded values in src/utils/supabase/info.tsx).
- [x] Confirm server uses only server-only secrets (no exposure to frontend).
- [ ] Record final environment values and where they are set.

### 1.2 Verify secrets are not committed (verifiable)

Commands:
```bash
git log --all --full-history --source -- '*.env*'
cat .gitignore | rg ".env"
```

Checklist:
- [x] No .env files in git history.
- [x] .env* patterns are gitignored.
Notes:
- .gitignore was missing; created in repo root on 2026-01-25 with .env* and standard ignores.

### 1.3 Verify no secrets in build output (verifiable)

Commands:
```bash
npm run build
rg -n "sk-proj|SERVICE_ROLE|PIPEDRIVE|OPENAI" dist/
```

Checklist:
- [ ] No server-only keys in dist output.

Do not continue until Section 1 is complete.

---

## 2. Backend readiness (Supabase)

### 2.1 Supabase project and CLI link (verifiable)

Commands:
```bash
supabase login
supabase link --project-ref <project-id>
supabase status
```

Checklist:
- [ ] Production Supabase project exists.
- [ ] CLI is linked and status is OK.

### 2.2 Edge Function deploy and secrets (verifiable)

Commands (from src/DEPLOYMENT.md):
```bash
supabase functions deploy make-server-139017f8 --no-verify-jwt
supabase secrets set OPENAI_API_KEY="..." PIPEDRIVE_API_KEY="..." SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." SUPABASE_ANON_KEY="..."
supabase secrets list
```

Checklist:
- [ ] Edge Function deployed.
- [ ] All secrets are set in Supabase (and hidden from frontend).

### 2.3 Verify endpoints required by frontend exist

Frontend calls (non-exhaustive, see src/components/* and src/contexts/SalesContext.tsx):
- /campaigns
- /pipedrive/contacts
- /ai/generate
- /ai/analyze-call
- /ai/speak
- /contact-intel/:id
- /call-logs
- /analytics
- /knowledge
- /mentor-chat

Checklist:
- [ ] Each endpoint is implemented in Edge Function code.
- [ ] If missing, implement or point frontend to the correct backend.

### 2.4 Database, RLS, storage, CORS, rate limits (verifiable)

Checklist:
- [ ] KV table exists: kv_store_139017f8 (verify in Supabase).
- [ ] RLS policies reviewed and correct for production.
- [ ] Storage buckets/policies configured if used.
- [ ] CORS configured for production domain(s).
- [ ] Rate limiting configured for API endpoints.
- [ ] Backups and retention configured.

Do not continue until Section 2 is complete.

---

## 3. Frontend build and runtime

### 3.1 Production build and preview (verifiable)

Commands:
```bash
npm run build
npm run preview
```

Checklist:
- [ ] Build succeeds without errors.
- [ ] Preview loads and matches expected UI.

### 3.2 Routing and assets (verifiable)

Checklist:
- [ ] All main routes/screens load after refresh.
- [ ] Overlay assets exist and load: public/overlays/*
- [ ] Debug overlay works (Shift+O and URL ?overlay=1).

Do not continue until Section 3 is complete.

---

## 4. Testing (automated + manual)

### 4.1 Automated Playwright tests (verifiable)

Commands (from src/TESTING.md):
```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
npx playwright show-report
```

Checklist:
- [ ] All 6 suites pass (e2e/01..06).
- [ ] Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari pass.
- [ ] No console errors during test run.
- [ ] Test report reviewed.

### 4.2 Manual test scenarios (verifiable)

From src/MANUAL_TESTING_GUIDE.md:
- [ ] Scenario 1: Complete User Journey (P0)
- [ ] Scenario 2: Speech-to-Text (P0)
- [ ] Scenario 3: Real Pipedrive Sync (P0)
- [ ] Scenario 4: Energy Drain Over Time (P1)
- [ ] Scenario 5: Mobile Device Testing (P0)
- [ ] Scenario 6: Cross-Browser (P1)
- [ ] Performance tests (throttling + offline)
- [ ] Security checks (console, storage, network)

### 4.3 Bug status (verifiable)

Checklist:
- [ ] Update src/BUG_TRACKER.md with results.
- [ ] P0 bugs = 0.
- [ ] P1 bugs = 0.

Do not continue until Section 4 is complete.

---

## 5. Performance

### 5.1 Lighthouse targets (verifiable)

Checklist (from src/DEPLOYMENT.md + src/PRODUCTION_CHECKLIST.md):
- [ ] Performance > 85
- [ ] Accessibility > 90
- [ ] Best Practices > 90
- [ ] SEO > 85

### 5.2 Core metrics and API latency (verifiable)

Checklist:
- [ ] Dashboard load < 2s
- [ ] TTI < 3s
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Pipedrive sync < 10s for 50 contacts
- [ ] AI analysis < 15s first run, < 1s cached
- [ ] Analytics < 3s

### 5.3 Bundle size (verifiable)

Commands:
```bash
npm run build
du -sh dist/
```

Checklist:
- [ ] Initial bundle < 500KB.
- [ ] No memory leaks after 30 min of use.

Do not continue until Section 5 is complete.

---

## 6. Security

### 6.1 Dependency audit (verifiable)

Commands:
```bash
npm audit
```

Checklist:
- [ ] No high/critical vulnerabilities without mitigation.

### 6.2 Secrets exposure checks (verifiable)

Checklist:
- [ ] OPENAI_API_KEY not in frontend.
- [ ] PIPEDRIVE_API_KEY not in frontend.
- [ ] SUPABASE_SERVICE_ROLE_KEY not in frontend.

### 6.3 Input validation, CORS, rate limiting (verifiable)

Checklist:
- [ ] Backend validates inputs on all endpoints.
- [ ] CORS restricted to production domains.
- [ ] Rate limits configured on API endpoints.
- [ ] No sensitive data stored in localStorage.

Do not continue until Section 6 is complete.

---

## 7. Observability

### 7.1 Error tracking and logs (verifiable)

Checklist:
- [ ] Error tracking configured (Sentry or equivalent) in src/App.tsx.
- [ ] Supabase Edge Function logs are monitored.
- [ ] API errors are visible and alertable.

### 7.2 Uptime and alerting (verifiable)

Checklist:
- [ ] Uptime monitoring enabled.
- [ ] Alerts configured (down > 2 min, latency > 5s).

Do not continue until Section 7 is complete.

---

## 8. Deployment

### 8.1 Pre-deploy checks (verifiable)

Checklist:
- [ ] src/PRODUCTION_CHECKLIST.md fully completed.
- [ ] src/LAUNCH_SUMMARY.md status updated.
- [ ] Version and changelog updated.
- [ ] Release/rollback plan prepared.

### 8.2 Deploy backend and frontend (verifiable)

Commands:
```bash
supabase functions deploy make-server-139017f8 --no-verify-jwt
vercel --prod
# or netlify deploy --prod
```

Checklist:
- [ ] Backend deployed.
- [ ] Frontend deployed.
- [ ] Environment variables verified in production.

### 8.3 Smoke tests (verifiable)

Checklist (from src/DEPLOYMENT.md):
- [ ] Dashboard loads without console errors.
- [ ] Pipedrive sync works and returns contacts.
- [ ] AI analysis runs and caches.
- [ ] Analytics charts render.

Do not continue until Section 8 is complete.

---

## 9. Final Go/No-Go Gate (must be last)

GO only if ALL are true (from src/LAUNCH_SUMMARY.md):
- [ ] All automated tests pass.
- [ ] All manual tests completed.
- [ ] Zero P0 bugs.
- [ ] Zero P1 bugs.
- [ ] Performance benchmarks met.
- [ ] Security audit passed.
- [ ] Browser compatibility verified.
- [ ] Mobile responsive verified.
- [ ] Documentation complete.
- [ ] Backend deployed successfully.
- [ ] Frontend deployed successfully.
- [ ] Environment variables configured.
- [ ] Monitoring enabled.
- [ ] Dev/QA/PO sign-offs obtained.

NO-GO if ANY are false.

---

## Execution log (update as you go)

- 2026-01-25: Docs reviewed and checklist created (Sections 0 and 1.1 partially evaluated).
- 2026-01-25: Added root .gitignore and verified no .env files in git history (Section 1.2 complete).
- 2026-01-25: Updated src/utils/supabase/info.tsx to derive projectId/anon key from VITE_ env vars (Section 1.1 partial).
- 2026-01-25: Verified server-only secrets only referenced in docs and Edge Function code (Section 1.1 partial).
