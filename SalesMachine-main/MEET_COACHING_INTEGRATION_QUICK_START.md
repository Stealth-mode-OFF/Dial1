# Meet Coaching Quick Start (Echo OS)

> This guide reflects the active `make-server-139017f8` function. The old `meet-coaching` edge function has been removed.

## Login Required

`www.jazykaintegrace.cz` now uses Supabase Auth. Create an email/password user via the Supabase dashboard (or invite teammates) and share the login link—everyone hitting the domain must authenticate before the Echo Pulse dashboard appears.

1) Generate a Call ID
- In Echo OS → Meet Coach screen, use the generated Call ID (copy it).

2) Configure the Chrome Extension (unpacked)
- Endpoint: `https://<project>.supabase.co/functions/v1/make-server-139017f8/meet/transcript`
- Headers: `Authorization: Bearer <ANON_KEY>`
- Body: `{ "callId": "<your-call-id>", "text": "...", "speaker": "user|peer" }`
- Paste the Call ID into the extension popup and click Connect.

3) Start Google Meet
- Join the call and enable captions (CC). New captions will appear in Echo’s Meet Coach feed.

4) Production secrets (Supabase)
- `ECHO_ALLOWED_ORIGINS=https://www.echopulse.cz,https://echopulse.cz`
- `ECHO_DEFAULT_USER_ID=owner` (or your UUID)
- `ECHO_REQUIRE_AUTH=false` (set true when you add JWT/X-Echo-User)

5) Notes
- Works now with anon key for your own usage. Switch to JWT per user when ready.
- Live feed currently polls every ~2s; upgrade to SSE/WebSocket later for lower latency.

---

## 🚀 Pre-Production Deployment Checklist

**Run these steps before opening the preview so it is production-ready.**

| # | Step | Command / Action | Verification |
|---|------|-----------------|--------------|
| 1 | **Build Frontend** | `npm run build` | ✓ Output shows "✓ built in X.XXs" with no errors |
| 2 | **Deploy Edge Function** | `supabase functions deploy make-server-139017f8` | ✓ Output shows "✓ Function deployed" |
| 3 | **Set Env Vars** | Dashboard → Settings → Environment Variables | ✓ All 5 vars present: VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_ANON_KEY, OPENAI_API_KEY, ECHO_ALLOWED_ORIGINS |
| 4 | **Configure ECHO_ALLOWED_ORIGINS** | `ECHO_ALLOWED_ORIGINS=https://www.echopulse.cz,https://echopulse.cz` | ✓ Domain matches preview/production URL |
| 5 | **Reload Chrome Extension** | chrome://extensions → Find extension → Click ↻ Refresh | ✓ Last updated shows "now" |
| 6 | **Test Pipedrive Connect** | Settings → Pipedrive → Paste API token → Click "Connect" | ✓ Badge shows "Connected" (green pulse) |
| 7 | **Test Pipedrive Disconnect** | Settings → Pipedrive → Click "Disconnect" | ✓ Badge shows "Not connected" (amber) |
| 8 | **Verify Call ID Flow** | Start call → Enable captions in Google Meet | ✓ Captions appear in Meet Coach panel within 2s |
| 9 | **Verify Transcript Sync** | Speak in call | ✓ Agent + Peer lines appear in transcript with confidence scores |
| 10 | **Capture Build Output** | Run `npm run build` again + save output to file | ✓ No errors; bundle ~940 KB (276 KB gzip) |
| 11 | **Test Deploy URL** | Open https://www.echopulse.cz | ✓ Page loads; Settings → Pipedrive works |

---

## Deployment Notes

- **ECHO_ALLOWED_ORIGINS**: If you change domains, redeploy the function with the new domain.
- **Bundle Size**: If >1MB, consider code-splitting (discussed in DEPLOYMENT_READY.md).
- **Extension Cache**: Browser may cache extension code; manual refresh required after backend changes.
- **Env Var Propagation**: Changes in Supabase dashboard take effect on next function invocation (no restart needed).
