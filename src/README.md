# Echo Dialer MVP - Sales Battle Station

A production-ready "Mild Neo-Brutalism" sales dashboard and dialer prototype, powered by React, Tailwind CSS, and Supabase.

## Features

- **Command Center**: Real-time stats and "AI Priority Queue" for sales focus.
- **Live Campaigns**: Fully interactive dialer with script, battle cards, and outcome tracking.
- **Intelligence Hub**: Analytics dashboard visualization.
- **Meet Coach**: AI Sales Coach configuration.
- **Supabase Backend**: Persistent storage for sales statistics and call logs.

## Deployment Guide

### Prerequisites

1.  **Supabase Project**: You need a Supabase project.
2.  **Environment Variables**: The following variables are required:
    - `VITE_SUPABASE_URL`: Your Supabase Project URL.
    - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.
    - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (for Edge Functions).

### Backend Deployment (Supabase Edge Functions)

The backend logic resides in `/supabase/functions/server`.

1.  **Deploy Function**:
    ```bash
    supabase functions deploy make-server-139017f8 --no-verify-jwt
    ```
    *Note: The function name `make-server-139017f8` matches the hardcoded route in `SalesContext.tsx`.*

2.  **Environment Secrets**:
    Set the secrets for your function:
    ```bash
    supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
    ```

### Frontend Deployment

1.  **Build**:
    ```bash
    npm run build
    ```

2.  **Deploy**:
    Deploy the `dist` folder to your preferred host (Vercel, Netlify, Cloudflare Pages).

### Database Setup

No manual SQL migrations are required. The application automatically initializes the `kv_store_139017f8` table in your Supabase database upon the first server request if it doesn't exist.

## Local Development

1.  Install dependencies: `npm install`
2.  Start dev server: `npm run dev`
3.  The app will default to "Local Mode" if Supabase credentials are missing or the backend is unreachable.
