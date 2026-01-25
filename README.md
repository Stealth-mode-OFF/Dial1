# Echo Dialer MVP Design

This repository contains the React + TypeScript implementation of the Echo Dialer MVP. It ships with the neo-brutalist Command Center UI, Supabase Edge Function, and helper scripts so you can spin up the full experience locally or deploy it to a hosting platform.

## Getting started
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase + third-party secret values (see the table below).
3. Run `npm run dev` to launch the Vite dev server (default port 4173). Use `?overlay=1` with the debugging overlay to validate pixel-perfect alignment.

## Environment variables
| Name | Purpose | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Frontend Supabase endpoint | Exposed to the browser via Vite (prefixed with `VITE_`). |
| `VITE_SUPABASE_ANON_KEY` | Frontend anonymous key | Same as the project’s anon/public key. |
| `SUPABASE_URL` | Backend Supabase endpoint | Used by the Edge Function and CLI scripts. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Grants the Edge Function full read/write access to your Supabase project. Keep it secret. |
| `SUPABASE_ANON_KEY` | General anon key | Re-used by backend scripts for migrations/seeding. |
| `OPENAI_API_KEY` | OpenAI secret | Used by the Edge Function for AI-powered flows. Do not expose it to the client. |
| `PIPEDRIVE_API_KEY` | Pipedrive token | Server-only credential for syncing CRM data. |
| `ECHO_ALLOWED_ORIGINS` | Optional CORS whitelist | Comma-separated origins (e.g., `https://app.example.com,http://localhost:5173`). Defaults to `*` if empty. |

## Backend setup (Supabase)
1. Install the Supabase CLI and log in (`supabase login`).
2. Link the project using `supabase link --project-ref [your-ref]`.
3. Deploy the Edge Function: `supabase functions deploy make-server-139017f8`.
4. Configure secrets:
   ```bash
   supabase secrets set \
     SUPABASE_URL="https://[project].supabase.co" \
     SUPABASE_SERVICE_ROLE_KEY="service-role-key" \
     SUPABASE_ANON_KEY="anon-key" \
     OPENAI_API_KEY="sk-..." \
     PIPEDRIVE_API_KEY="your-token"
   ```
5. Run `node scripts/setup-backend.mjs` to ensure any migrations execute.
6. Seed test data with `node scripts/seed-database.mjs` (uses the same `.env` values).

## Running the app
- `npm run dev`: start the dev server and navigate to `http://localhost:4173` (or the port printed by Vite).
- `npm run build`: produce a production bundle that can be deployed to your favorite host.

## Notes
- The `DebugOverlay` component can be toggled (`Shift+O`) to compare the live UI against the PNGs inside `public/overlays`.
- Keep sensitive keys (OpenAI, Pipedrive, Supabase service role) on the server/Edge Function; only the `VITE_` variables belong in `.env` files that the client can read.
