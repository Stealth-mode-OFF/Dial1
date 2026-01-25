# 🚀 Deployment Guide - Echo Telesales OS

> Krok-za-krokem guide pro nasazení aplikace do production.

---

## 📋 Pre-Deployment Checklist

Před začátkem deploymentu **MUSÍTE** splnit:

- ✅ Všechny E2E testy prošly (`npx playwright test`)
- ✅ Žádné P0/P1 bugy v `BUG_TRACKER.md`
- ✅ `PRODUCTION_CHECKLIST.md` je kompletně vyplněný
- ✅ Manuální testy dokončeny (`MANUAL_TESTING_GUIDE.md`)
- ✅ Performance benchmarks splněny
- ✅ Security audit dokončen

**Pokud není vše ✅, NEDEPLOYUJTE!**

---

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   Vercel/       │ ← Frontend (React + Vite)
│   Netlify       │
└────────┬────────┘
         │
         ↓ API Calls
┌─────────────────┐
│   Supabase      │ ← Backend (Edge Functions + KV Store)
│   Edge Function │
└────────┬────────┘
         │
         ↓ External APIs
┌─────────────────┐
│   Pipedrive     │ ← CRM Integration
│   OpenAI        │ ← AI Analysis
└─────────────────┘
```

---

## 🔧 Step 1: Supabase Backend Setup

### 1.1 Create Supabase Project

```bash
# Visit https://supabase.com/dashboard
# Click "New Project"
# Fill in:
# - Name: echo-telesales-production
# - Database Password: [STRONG PASSWORD - save it!]
# - Region: Europe (closest to users)
```

### 1.2 Get Supabase Credentials

```bash
# In Supabase Dashboard:
# Settings → API

# Copy these values:
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (different, longer)
```

### 1.3 Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase

# Or download binary from:
# https://github.com/supabase/cli/releases
```

### 1.4 Login & Link Project

```bash
# Login
supabase login

# Link to your project
supabase link --project-ref [your-project-id]
# You'll be prompted for database password

# Test connection
supabase status
```

### 1.5 Deploy Edge Function

```bash
# Deploy the server
supabase functions deploy make-server-139017f8

# Set environment secrets
supabase secrets set OPENAI_API_KEY="sk-proj-..."
supabase secrets set PIPEDRIVE_API_KEY="your-pipedrive-token"
supabase secrets set SUPABASE_URL="https://[project-id].supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
supabase secrets set SUPABASE_ANON_KEY="eyJhbGci..."
supabase secrets set ECHO_ALLOWED_ORIGINS="https://www.echopulse.cz,https://echopulse.cz"
supabase secrets set ECHO_DEFAULT_USER_ID="owner"
supabase secrets set ECHO_REQUIRE_AUTH="false"

# Verify secrets (values will be hidden)
supabase secrets list
```

### 1.6 Test Edge Function

```bash
# Test endpoint
curl https://[project-id].supabase.co/functions/v1/make-server-139017f8/campaigns \
  -H "Authorization: Bearer [ANON_KEY]"

# Should return empty array [] or existing campaigns
```

---

## 🌐 Step 2: Frontend Deployment (Vercel)

### 2.1 Prepare Repository

```bash
# Ensure code is in Git
git init
git add .
git commit -m "Production ready"

# Push to GitHub/GitLab
git remote add origin [your-repo-url]
git push -u origin main
```

### 2.2 Connect Vercel

```bash
# Visit https://vercel.com
# Click "New Project"
# Import from GitHub/GitLab
# Select your repository
```

### 2.3 Configure Environment Variables

In Vercel Dashboard:
```
Settings → Environment Variables

Add these (for Production):
┌────────────────────────────────┬───────────────────────────┐
│ Name                           │ Value                     │
├────────────────────────────────┼───────────────────────────┤
│ VITE_SUPABASE_URL              │ https://[id].supabase.co  │
│ VITE_SUPABASE_PROJECT_ID       │ [id] (optional fallback)  │
│ VITE_SUPABASE_ANON_KEY         │ eyJhbGci...               │
└────────────────────────────────┴───────────────────────────┘
```

⚠️ **IMPORTANT**: 
- Use `VITE_` prefix for frontend variables
- DO NOT add `OPENAI_API_KEY` or `PIPEDRIVE_API_KEY` here (server-only!)

### 2.4 Deploy

```bash
# Vercel will auto-deploy from main branch
# Or manually:
vercel --prod

# Deployment URL will be:
# https://echo-telesales-os.vercel.app (or custom domain)
```

### 2.5 Configure Custom Domain (Optional)

```bash
# In Vercel Dashboard:
# Settings → Domains
# Add domain: sales.yourdomain.com

# Update DNS:
# Type: CNAME
# Name: sales
# Value: cname.vercel-dns.com
```

---

## 🌐 Alternative: Netlify Deployment

### 2A.1 Deploy to Netlify

```bash
# Visit https://netlify.com
# Drag & drop `dist` folder after build

# Or using CLI:
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### 2A.2 Environment Variables

```bash
# In Netlify Dashboard:
# Site settings → Environment variables

VITE_SUPABASE_URL=https://[id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 2A.3 Build Settings

```bash
# Build command: npm run build
# Publish directory: dist
# Node version: 18
```

---

## 🔐 Step 3: Environment Configuration

### 3.1 Production Environment File

Create `.env.production`:

```env
# Frontend (public, safe to expose)
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend (server-only, NEVER expose)
# These are set in Supabase, not in frontend!
# OPENAI_API_KEY=sk-proj-... (DO NOT ADD HERE)
# PIPEDRIVE_API_KEY=... (DO NOT ADD HERE)
# SUPABASE_SERVICE_ROLE_KEY=... (DO NOT ADD HERE)
```

### 3.2 Verify No Secrets Leaked

```bash
# Check git
git log --all --full-history --source -- '*.env*'

# Should be in .gitignore
cat .gitignore | grep .env

# Check frontend bundle
npm run build
grep -r "sk-proj" dist/  # Should find nothing
grep -r "SERVICE_ROLE" dist/  # Should find nothing
```

---

## 📊 Step 4: Post-Deployment Verification

### 4.1 Smoke Test (Critical Paths)

Visit production URL and test:

1. **Dashboard Loads**
   ```
   https://[your-domain].vercel.app/
   ✅ No console errors
   ✅ Stats display
   ✅ Check-in works
   ```

2. **Pipedrive Sync**
   ```
   Navigate to Campaigns → Sync Pipedrive
   ✅ Contacts load
   ✅ No API errors
   ✅ Correct data displayed
   ```

3. **AI Analysis**
   ```
   Open first contact
   ✅ AI analysis runs
   ✅ Intelligence displayed
   ✅ Data cached correctly
   ```

4. **Analytics**
   ```
   Navigate to Analytics
   ✅ Graphs render
   ✅ No Recharts errors
   ```

### 4.2 Performance Check

```bash
# Run Lighthouse audit
# Chrome DevTools → Lighthouse → Analyze page

# Target scores:
Performance: > 85
Accessibility: > 90
Best Practices: > 90
SEO: > 85
```

### 4.3 Error Monitoring

```bash
# Check Supabase logs
# Supabase Dashboard → Edge Functions → Logs

# Look for:
✅ No 500 errors
✅ No CORS errors
✅ API calls succeeding
```

---

## 🔄 Step 5: CI/CD Setup (Optional)

### 5.1 GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: vercel/deploy-action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 🔧 Step 6: Monitoring Setup

### 6.1 Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/react

# Add to App.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://[key]@sentry.io/[project]",
  environment: "production"
});
```

### 6.2 Analytics (Google Analytics)

```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 6.3 Uptime Monitoring

Services to consider:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom** (paid): https://pingdom.com
- **Better Uptime** (free tier): https://betteruptime.com

Set alerts for:
- [ ] Website down (> 2 minutes)
- [ ] Response time > 5s
- [ ] SSL certificate expiring

---

## 🚨 Step 7: Rollback Plan

### 7.1 Vercel Rollback

```bash
# In Vercel Dashboard:
# Deployments → Previous deployment → Promote to Production

# Or via CLI:
vercel rollback [deployment-url]
```

### 7.2 Supabase Edge Function Rollback

```bash
# Supabase Dashboard → Edge Functions → Deployments
# Select previous version → Restore

# Or redeploy old code:
git checkout [previous-commit]
supabase functions deploy make-server-139017f8
```

### 7.3 Emergency Contacts

```
🚨 Production Down:
1. [Developer Name] - [Phone/Slack]
2. [DevOps Lead] - [Phone/Slack]
3. [CTO/Manager] - [Phone/Slack]

Response Times:
- P0 (Site down): < 15 minutes
- P1 (Feature broken): < 1 hour
- P2 (Minor issue): < 24 hours
```

---

## 📝 Step 8: Documentation Handoff

### 8.1 Update Documentation

- [ ] Update README.md with production URL
- [ ] Document any production-specific configuration
- [ ] Add troubleshooting section for common issues
- [ ] Update environment variable documentation

### 8.2 Team Onboarding

Share with team:
- [ ] Production URL
- [ ] Supabase dashboard access
- [ ] Vercel/Netlify dashboard access
- [ ] Monitoring dashboard URLs
- [ ] Emergency runbook

---

## ✅ Deployment Complete Checklist

Before considering deployment "done":

- [ ] Frontend deployed and accessible
- [ ] Backend Edge Function deployed
- [ ] All environment variables configured
- [ ] Smoke tests passed
- [ ] Performance audit passed
- [ ] Error monitoring configured
- [ ] Uptime monitoring configured
- [ ] Rollback plan tested
- [ ] Team notified
- [ ] Documentation updated

---

## 🎉 Post-Launch

### Week 1
- [ ] Monitor errors daily
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Address any P1 bugs immediately

### Week 2-4
- [ ] Review analytics data
- [ ] Optimize slow queries
- [ ] Plan feature iterations
- [ ] Update documentation based on learnings

---

## 🆘 Common Issues & Solutions

### "API calls failing in production"
```bash
# Check CORS configuration in Supabase Edge Function
# Verify environment variables are set correctly
# Check Supabase Edge Function logs for errors
```

### "Build fails on Vercel"
```bash
# Check Node version (should be 18+)
# Verify all dependencies in package.json
# Check build logs for specific error
```

### "Environment variables not working"
```bash
# Must use VITE_ prefix for Vite
# Redeploy after adding new env vars
# Clear build cache in Vercel if needed
```

### "Slow performance in production"
```bash
# Enable CDN caching
# Optimize images (convert to WebP)
# Check bundle size (should be < 500KB)
# Enable compression in hosting
```

---

## 📞 Support Channels

**Technical Issues**:
- Supabase Status: https://status.supabase.com
- Vercel Status: https://vercel-status.com
- OpenAI Status: https://status.openai.com
- Pipedrive Status: https://status.pipedrive.com

**Documentation**:
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Vite Docs: https://vitejs.dev

---

**🎊 Congratulations on deploying to production!**

*Last Updated*: December 2024  
*Version*: 1.0.0
