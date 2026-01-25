# Vercel Deployment Checklist (Echo Dialer)

## Prerequisites
- Node 18+ (Vercel default) and npm available.
- Supabase project with edge function `make-server-139017f8` deployed.
- Required secrets available (see Env Vars).

## Vercel Settings
- Framework: **Vite**
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Environment Variables (Vercel Project)
Set these in Vercel → Project → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (server-side usage only)
- `PIPEDRIVE_API_KEY` (server-side usage only, if required)
- `ECHO_ALLOWED_ORIGINS` (match your production domain)
- Optional overrides: `VITE_SPIN_MODEL`, `VITE_SPIN_ANALYSIS_MODEL`, `VITE_SPIN_TEMPERATURE`

## Build & Deploy Steps
1) `npm install`
2) `npm run build`
3) Vercel will serve static assets from `dist/`.

## Post-Deploy Smoke Test
- Load the deployed URL; ensure no env/config errors surface.
- Settings → Integrations: connect/disconnect Pipedrive (using test key).
- Dashboard renders without “Configuration Required”.
- Check browser console: no uncaught errors.

## Observability (minimum)
- Enable edge/function logs in Supabase: `supabase functions logs make-server-139017f8 --follow` during staging smoke test.
- Add frontend error monitoring (e.g., Sentry) before GA.

## Rollback
- Use Vercel “Promote previous deployment” if a regression is found.

