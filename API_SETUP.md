# 🔑 API Setup Guide

## Co potřebuješ nastavit:

### 1. **OpenAI API Key**
1. Jdi na https://platform.openai.com/api-keys
2. Vytvoř nový API klíč
3. Zkopíruj klíč (začíná `sk-...`)

### 2. **Pipedrive API Key**
1. Přihlaš se do Pipedrive
2. Jdi do **Settings > Personal Preferences > API**
3. Zkopíruj svůj API token

### 3. **Supabase Project**
1. Jdi na https://supabase.com/dashboard
2. Vytvoř nový projekt (nebo použij existující)
3. Jdi do **Project Settings > API**
4. Zkopíruj:
   - Project URL
   - `anon` public key
   - Project ID (z URL)

---

## 🚀 Jak nastavit pro lokální vývoj:

### Krok 1: Frontend (.env.local)
Vytvoř soubor `.env.local` v rootu projektu:

```bash
# Frontend - viditelné v browseru
VITE_SUPABASE_URL=https://TVUJ-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=tvuj-anon-key
VITE_SUPABASE_PROJECT_ID=TVUJ-PROJECT-ID
```

### Krok 2: Backend (Supabase Secrets)
Nastav secrets pro Supabase Edge Functions:

```bash
# Přihlaš se do Supabase CLI
npx supabase login

# Linkni projekt
npx supabase link --project-ref TVUJ-PROJECT-ID

# Nastav secrets
npx supabase secrets set OPENAI_API_KEY=sk-tvuj-openai-key
npx supabase secrets set PIPEDRIVE_API_KEY=tvuj-pipedrive-key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tvuj-service-role-key
```

---

## 🌐 Jak nastavit pro Vercel production:

### Vercel Environment Variables:
```bash
# Frontend variables (všechny environmenty)
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_PROJECT_ID
```

Nebo přes Vercel Dashboard:
1. Jdi do **Project Settings > Environment Variables**
2. Přidej:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

Backend secrets (OPENAI_API_KEY, PIPEDRIVE_API_KEY) zůstávají v Supabase, ne ve Vercelu!

---

## ✅ Test připojení:

### Test 1: Supabase
```bash
curl https://TVUJ-PROJECT-ID.supabase.co/functions/v1/make-server-139017f8/health
```
Mělo by vrátit: `{"status":"ok",...}`

### Test 2: OpenAI
```bash
curl https://TVUJ-PROJECT-ID.supabase.co/functions/v1/make-server-139017f8/ai/sector-battle-card \
  -H "Authorization: Bearer TVUJ-ANON-KEY" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"TechCorp","industry":"Software"}'
```

### Test 3: Pipedrive
```bash
curl https://TVUJ-PROJECT-ID.supabase.co/functions/v1/make-server-139017f8/integrations/pipedrive \
  -H "Authorization: Bearer TVUJ-ANON-KEY"
```
Mělo by vrátit: `{"configured":true}` nebo info o API klíči

---

## 🐛 Debugging:

Pokud něco nefunguje:

1. **Check Supabase Logs:**
   ```bash
   npx supabase functions logs make-server-139017f8
   ```

2. **Check lokální konzole** v browseru (F12)

3. **Verify secrets jsou nastavené:**
   ```bash
   npx supabase secrets list
   ```

---

## 📝 Quick Setup Checklist:

- [ ] OpenAI API key získán a nastaven v Supabase secrets
- [ ] Pipedrive API key získán a nastaven v Supabase secrets  
- [ ] Supabase projekt vytvořen
- [ ] `.env.local` vytvořen s VITE_ proměnnými
- [ ] Vercel environment variables nastaveny (pro production)
- [ ] Edge function deployed: `npx supabase functions deploy make-server-139017f8`
- [ ] Test API calls fungují

---

**Ready to go!** 🚀
