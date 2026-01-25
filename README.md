
<!--
  SalesMachine – Main README
  =====================================
  This is the main entry point for developers and handover.
  See DOCUMENTATION_INDEX.md for a full file map and onboarding.
-->

# Echo Dialer MVP Design

This is a code bundle for Echo Dialer MVP Design. The original project is available at https://www.figma.com/design/7KPWbkqHT21RN2sdfM58tV/Echo-Dialer-MVP-Design.

## Running the code

1. Install deps: `npm i`
2. Create `.env` from `.env.example` and fill `VITE_SUPABASE_URL` (preferred) or `VITE_SUPABASE_PROJECT_ID`, plus `VITE_SUPABASE_ANON_KEY`.
3. Start dev server: `npm run dev`

## Supabase Edge Function

- The deployable edge function lives in `supabase/functions/make-server-139017f8`.
- Deploy with Supabase CLI: `supabase functions deploy make-server-139017f8`
- Backend secrets required: `OPENAI_API_KEY`, `PIPEDRIVE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

