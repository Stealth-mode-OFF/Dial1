# 🚀 Deployment Guide: endora.cz

> Complete step-by-step instructions to deploy Echo Dialer MVP to endora.cz

---

## ✅ Pre-Deployment Checklist

- ✅ Build passing: `npm run build` (940 KB)
- ✅ All env vars configured
- ✅ Git repository clean and committed
- ✅ Domain endora.cz registered and accessible
- ✅ Supabase project created and edge function deployed

---

## 📋 Deployment Steps

### Step 1: Prepare Repository for Vercel

```bash
# Ensure all changes are committed
cd /Users/josefhofman/Echodialermvp
git add -A
git commit -m "Configure for endora.cz deployment"

# Push to remote (GitHub, GitLab, Bitbucket)
git push origin main
```

### Step 2: Set Up Supabase Backend

```bash
# 1. Login to Supabase CLI
supabase login

# 2. Link to your project
supabase link --project-ref [your-project-id]

# 3. Deploy the edge function
supabase functions deploy make-server-139017f8

# 4. Set production environment secrets
supabase secrets set OPENAI_API_KEY="sk-proj-..."
supabase secrets set PIPEDRIVE_API_KEY="your-pipedrive-api-token"
supabase secrets set ECHO_ALLOWED_ORIGINS="https://endora.cz,https://www.endora.cz"
supabase secrets set ECHO_DEFAULT_USER_ID="owner"
supabase secrets set ECHO_REQUIRE_AUTH="false"

# 5. Verify secrets (values hidden)
supabase secrets list
```

### Step 3: Deploy Frontend to Vercel

#### Option A: Via Vercel CLI (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Link project to Vercel
cd /Users/josefhofman/Echodialermvp
vercel link

# 3. Set production environment variables
vercel env add VITE_SUPABASE_URL
# Paste: https://[your-project-id].supabase.co

vercel env add VITE_SUPABASE_PROJECT_ID
# Paste: [your-project-id]

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: your-anon-key

# 4. Configure custom domain in Vercel Dashboard
# - Settings → Domains
# - Add: endora.cz
# - Add: www.endora.cz
# - Update DNS at your registrar (CNAME to cname.vercel-dns.com)

# 5. Deploy to production
vercel --prod
```

#### Option B: Via Vercel Dashboard

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import from Git (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. Add environment variables:
   - `VITE_SUPABASE_URL=https://[project-id].supabase.co`
   - `VITE_SUPABASE_PROJECT_ID=[project-id]`
   - `VITE_SUPABASE_ANON_KEY=[your-key]`
7. Click "Deploy"
8. After deployment succeeds, go to Settings → Domains
9. Add custom domains:
   - `endora.cz`
   - `www.endora.cz`
10. Update DNS at your domain registrar

### Step 4: Configure DNS for endora.cz

At your domain registrar (e.g., Namecheap, GoDaddy):

```
Type: CNAME
Name: @  (or leave blank for root)
Value: cname.vercel-dns.com

Also add:
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Wait 24-48 hours for DNS propagation.

### Step 5: Production Verification

1. **Test Domain Access**
   ```bash
   curl -I https://endora.cz
   # Should return 200 OK
   ```

2. **Test Supabase Connection**
   - Open https://endora.cz
   - Go to Settings
   - Check that Supabase URL is displayed correctly
   - Verify no console errors (F12)

3. **Test Pipedrive Integration**
   - Settings → Pipedrive
   - Paste Pipedrive API token
   - Click "Connect"
   - Verify connection succeeds (green badge)

4. **Test Google Meet Coaching**
   - Start a call with Google Meet
   - Enable captions (CC)
   - Verify captions sync to Echo's Meet Coach feed

5. **Performance Check**
   ```bash
   # Verify bundle size
   npm run build
   # Should be ~940 KB (276 KB gzip)
   ```

---

## 🔒 Security Checklist

- ✅ No API keys in `dist/` folder
  ```bash
  grep -r "sk-proj" dist/  # Should be empty
  grep -r "SERVICE_ROLE" dist/  # Should be empty
  ```

- ✅ HTTPS enforced (Vercel provides SSL/TLS automatically)

- ✅ CORS configured correctly
  ```
  ECHO_ALLOWED_ORIGINS=https://endora.cz,https://www.endora.cz
  ```

- ✅ Environment variables set only in Vercel Dashboard (not in `.env` files)

- ✅ Supabase secrets stored securely in Supabase CLI

---

## 📊 Monitoring & Maintenance

### View Deployment Logs

```bash
# CLI
vercel logs [deployment-id]

# Or via Dashboard:
# https://vercel.com/dashboard/[project-name]/deployments
```

### Monitor Performance

```bash
# Vercel Analytics Dashboard:
# https://vercel.com/dashboard/[project-name]/analytics

# Real User Monitoring (RUM) available under Settings → Analytics
```

### Rollback Deployment

```bash
vercel rollback
```

### Auto-Deploy on Git Push

Vercel automatically deploys whenever you push to `main` branch.

```bash
# To disable auto-deploy:
# Vercel Dashboard → Settings → Git → Uncheck "Deploy on push"

# To manually deploy:
vercel --prod
```

---

## 🚨 Troubleshooting

### Domain shows "Did Not Send" in Browser

**Problem**: Browser can't reach endora.cz

**Solution**:
1. Verify DNS is pointing to Vercel
   ```bash
   nslookup endora.cz
   # Should show: cname.vercel-dns.com
   ```
2. Wait 24-48 hours for propagation
3. Try clearing browser cache and restarting

### Supabase Connection Failed

**Problem**: Dashboard shows "Supabase not configured"

**Solution**:
1. Verify env vars in Vercel Dashboard:
   - Settings → Environment Variables
   - Check: VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_ANON_KEY
2. Redeploy after adding/updating env vars:
   ```bash
   vercel --prod
   ```
3. Clear browser cache (Cmd+Shift+R)

### Pipedrive Connection Returns 401

**Problem**: "Invalid API Token"

**Solution**:
1. Verify Supabase secret is set:
   ```bash
   supabase secrets list
   # Check: PIPEDRIVE_API_KEY present
   ```
2. Redeploy edge function:
   ```bash
   supabase functions deploy make-server-139017f8
   ```

### Build Fails with "Module Not Found"

**Problem**: Deploy fails with "Cannot find module..."

**Solution**:
1. Check dependencies are installed:
   ```bash
   npm install
   ```
2. Verify `package.json` is committed
3. Check Vercel build logs for full error message

---

## 📞 Support & Next Steps

- **Documentation**: See [MEET_COACHING_INTEGRATION_QUICK_START.md](./MEET_COACHING_INTEGRATION_QUICK_START.md)
- **Issues**: Check [BUG_TRACKER.md](./src/BUG_TRACKER.md)
- **API Docs**: See [DEPLOYMENT.md](./src/DEPLOYMENT.md)

---

## ✨ Success Criteria

- ✅ https://endora.cz loads (no 404)
- ✅ Dashboard displays with stats
- ✅ Pipedrive connect/disconnect works
- ✅ Google Meet coaching captions sync
- ✅ No console errors (F12)
- ✅ Bundle size: ~940 KB (acceptable)
- ✅ Build time: < 3 seconds
