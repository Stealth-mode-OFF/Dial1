# Supabase + Pipedrive Integration Setup Guide

> Note: This guide is partially legacy. The direct `src/utils/pipedrive/*` clients were removed; the app now uses the unified `make-server-139017f8` edge function (`/pipedrive/*` + KV store).
> Use this for Supabase key collection and initial setup; refer to `DEPLOYMENT.md` for current production steps.

## 🚀 Quick Setup (15 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project" → Select a region (closest to you)
3. Set password (remember it!)
4. Wait for setup (~2 minutes)
5. Go to **Settings** → **API**
6. Copy these values:
   - `Project URL` → Save as `VITE_SUPABASE_URL`
   - `anon public` key → Save as `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → Save as `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Get Pipedrive API Token

1. Go to https://pipedrive.com
2. Log in to your account
3. Go to **Settings** → **Personal preferences** → **API**
4. Copy your API token
5. Save as `PIPEDRIVE_API_KEY` (edge secret)

### Step 3: Create `.env.local` File

Create file: `/Users/josefhofman/Echodialermvp/.env.local`

```env
# Supabase (frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=your-project-id  # optional fallback

# Supabase (edge functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pipedrive (edge functions)
PIPEDRIVE_API_KEY=your-api-token-here

# OpenAI (edge functions)
OPENAI_API_KEY=sk-your-key-here
```

> **Note**: Replace values with your actual credentials from Steps 1 & 2

### Step 4: Verify Setup

After saving `.env.local`, restart the dev server:

```bash
npm run dev
```

Check the browser console - if you see green checkmarks in `SettingsScreen`, you're connected!

---

## 🗄️ Supabase Database Setup

### Create Tables

Run these SQL commands in Supabase **SQL Editor**:

```sql
-- Calls Log Table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  company TEXT NOT NULL,
  date_called TIMESTAMP DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0,
  disposition TEXT, -- 'connected', 'voicemail', 'callback', 'not-interested'
  transcript TEXT,
  notes TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Contacts Cache Table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pipedrive_id TEXT UNIQUE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  intent_score INTEGER,
  ai_summary TEXT,
  hiring_signal TEXT,
  personality_type TEXT,
  last_called TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Analytics Table
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  calls_made INTEGER DEFAULT 0,
  connections INTEGER DEFAULT 0,
  callbacks_scheduled INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own calls"
  ON calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calls"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics"
  ON analytics FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🔌 Pipedrive Sync Integration

### How It Works

1. **App loads** → Fetches contacts from Pipedrive API
2. **On each call** → Logs disposition back to Pipedrive
3. **Real-time** → Uses Pipedrive's API v1.0

### Code Example

See the file we'll create below: `src/utils/pipedrive/sync.ts`

---

## 📝 Create Integration Files

Here's what we'll add to your codebase:

### 1. Pipedrive Sync Utility
### 2. Supabase Client Setup
### 3. Update CampaignList to fetch real Pipedrive data
### 4. Update AICallScreen to log calls to Supabase

---

## ✅ Verification Checklist

- [ ] `.env.local` file created with all keys
- [ ] Supabase project created and URL saved
- [ ] Pipedrive API token generated and saved
- [ ] Database tables created in Supabase
- [ ] Dev server restarted (`npm run dev`)
- [ ] Browser console shows no errors
- [ ] Settings screen shows green checkmarks
- [ ] CampaignList fetches real Pipedrive contacts
- [ ] Calls are logged to Supabase after each call
- [ ] Analytics show real data

---

## 🐛 Troubleshooting

### "Module not found" error
- Restart dev server: `npm run dev`
- Clear node_modules: `rm -rf node_modules && npm install`

### Supabase connection fails
- Check URL format: Should be `https://xxxxx.supabase.co`
- Verify anon key is correct (long string starting with `eyJ`)
- Make sure `.env.local` is in root directory

### Pipedrive API returns 401
- Double-check API token in Settings → Personal preferences
- Token should be long string without spaces
- Regenerate token if unsure

### No real contacts showing
- Check Pipedrive is set to current date filter
- Verify Pipedrive account has leads/contacts
- Check browser console for API errors

---

## 🚀 Next Steps After Integration

1. **Test with real data**
   - Load dashboard
   - Click "Start Power Dialer"
   - See your Pipedrive contacts

2. **Make test call**
   - Select a contact
   - Review battle card
   - Click "Call Now" (simulated)
   - Select disposition
   - Check Supabase DB for logged call

3. **Monitor analytics**
   - Open Analytics screen
   - Should show today's activity
   - Calls count increases as you log calls

4. **Deploy**
   - When ready: `npm run build`
   - Deploy to Vercel
   - Add env vars to Vercel dashboard

---

**You're all set! Now your Echo app is powered by real Pipedrive data and Supabase storage.** 🚀
