# Google Meet Live Coaching Integration Plan

This document tracks the immediate integration of the Meet Coach bridge into Echo OS for live sales coaching on Google Meet.

> Reminder: The legacy `meet-coaching` edge function was removed. All calls should target `functions/v1/make-server-139017f8` and its `/meet/transcript` endpoints.

## Scope (this iteration)
- MVP ingest and playback: extension pushes captions, edge stores per-user/per-call, UI shows live stream.
- Secure by user: KV is namespaced by userId, default demo user stays available.
- Frontend entry: "Meet Coach" nav + simple call ID generator, live feed, clipboard copy.
- Chrome extension (unpacked) configured to hit the new edge endpoint (not Supabase REST with anon key).

## What shipped now
- Edge endpoints:
  - `POST /functions/v1/make-server-139017f8/meet/transcript`  → stores events under `user:{id}:meet:{callId}:events` (keeps last 200).
  - `GET  /functions/v1/make-server-139017f8/meet/transcript/:callId?since=ts` → returns events since timestamp.
- Frontend:
  - New screen `Meet Coach` (nav) with call ID generator, copy button, connect, clear, and live feed.
- Defaults:
  - Works with `ECHO_DEFAULT_USER_ID` when auth is off; ready for JWT/X-Echo-User when enabled.

## To configure for production
1) Supabase function secrets (already used elsewhere):
   - `ECHO_ALLOWED_ORIGINS=https://www.echopulse.cz,https://echopulse.cz`
   - `ECHO_DEFAULT_USER_ID=owner` (or your user id)
   - `ECHO_REQUIRE_AUTH=false` (set true when you wire Auth/JWT)
2) Extension endpoint:
   - POST to: `https://<project>.supabase.co/functions/v1/make-server-139017f8/meet/transcript`
   - Headers: `Authorization: Bearer <ANON_KEY>` (for your own use; switch to user JWT later)
   - Body: `{ "callId": "<session-id>", "text": "...", "speaker": "user|peer" }`
   - In Chrome extension code, set `ENDPOINT = https://<project>.supabase.co/functions/v1/make-server-139017f8/meet/transcript` and send the anon key in Authorization.
3) Frontend environment:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` set (already required).

## Next steps (post-MVP)
- Auth: Require JWT or `x-echo-user` to enforce per-user isolation.
- SSE/WebSocket: Replace polling with server-sent events for lower latency.
- Session model: Persist `meet_sessions` table to track who/when and map to campaigns.
- Coaching layer: run live LLM analysis on rolling transcript window for micro-tips.
- Extension hardening: dynamic session picker, visible status, and resend on transient failures.
