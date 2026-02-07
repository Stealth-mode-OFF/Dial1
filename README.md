# Echo Dialer MVP (Supabase + Vite + React)

Production-ready MVP: auth, workspaces, contacts, call sessions, call notes, and strict RLS (workspace membership).

## Tech
- Frontend: React + TypeScript + Vite
- Backend: Supabase (Auth + Postgres)
- Deploy: Vercel (static SPA)

## Requirements
- Node.js (local)
- A Supabase project

## Environment Variables
Create `.env` (or set on Vercel):

- `VITE_SUPABASE_URL` (example: `https://<project-ref>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` (Supabase Project Settings → API → `anon public`)

See `.env.example`.

## Supabase Setup (DB + RLS)
1. Create a Supabase project.
2. In Supabase Dashboard:
   - Auth → Providers: enable Email.
   - Auth → Email Auth: enable “Email + Password”.
3. Apply migrations in `supabase/migrations/`.

Recommended (Supabase CLI):
1. Install CLI and login.
2. From repo root:
   - `supabase link --project-ref <your-project-ref>`
   - `supabase db push`

What migrations create:
- `workspaces`, `workspace_members`
- `contacts`
- `call_sessions`
- `call_notes`
- RLS enabled + policies enforcing workspace membership
- onboarding: personal workspace auto-created for new users (trigger on `auth.users`)
- RPC: `ensure_personal_workspace()` (idempotent)
- RPC: `end_call_session(session_id, outcome)` (computes duration)

## Local Dev
1. Install deps: `npm install`
2. Configure env: copy `.env.example` → `.env` and fill values
3. Run: `npm run dev`

## Deploy (Vercel)
1. Import the repo in Vercel.
2. Set environment variables (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy.

SPA routing:
- `vercel.json` includes a rewrite so `/contacts/<id>` works.

## Smoke Test (Manual)
1. Open `/login`
2. Sign up with email + password
   - expected: redirect to Contacts
   - expected: personal workspace auto-created
3. Create a contact
   - expected: it appears in the list
4. Open the contact detail
5. Click “Start call”
   - expected: active session appears and shows started time
6. End the call with an outcome
   - expected: session shows outcome + duration seconds
7. Add a note to the session
   - expected: note appears in list and persists on reload
8. Go to “Calls” tab
   - expected: recent sessions list shows and links back to the contact
9. Go to “Settings” tab and sign out
   - expected: returns to `/login`

## Spec
See `SPEC.md` for entities, screens, and Definition of Done.

