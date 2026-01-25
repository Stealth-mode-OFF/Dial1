# Backend Setup Guide

Vaše aplikace je teď v **plné výrobě** s backendem. Veškerá mock data byla odstraněna a vše je propojeno se Supabase.

## Rychlý Start

### 1. Připravte Supabase Project

Pokud ještě nemáte Supabase projekt:
1. Jděte na [supabase.com](https://supabase.com)
2. Vytvořte nový projekt
3. Zkopírujte **Project URL** a **anon public key**

### 2. Nastavte Prostředí

V souboru `.env` (v projektu) nastavte:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### 3. Vytvořte Databázové Tabulky

#### Option A: Automaticky (Doporučeno)
```bash
cd /workspaces/SalesMachine
node scripts/setup-backend.mjs
```

Tento skript automaticky:
- ✅ Zkontroluje Supabase připojení
- ✅ Vytvoří všechny tabulky (pokud neexistují)
- ✅ Nahraje testovací data
- ✅ Potvrdí, že je vše připraveno

#### Option B: Manuálně
1. Jděte do Supabase dashboardu → **SQL Editor**
2. Vytvořte nový query
3. Zkopírujte obsah `supabase/migrations/20260116_create_core_tables.sql`
4. Klikněte **Run**

### 4. Spusťte Aplikaci

```bash
npm run dev
```

Otevřete [http://localhost:3000](http://localhost:3000)

## Co Bylo Upraveno?

### Odstraněny Mock Data
- ❌ Hardcoded "Martin Novák" kontakt
- ❌ Hardcoded BANT data v CallCockpit
- ❌ Fallback demo data v LiveCampaigns
- ❌ Statické KPI a statistiky

### Přidáno Backend Propojení
- ✅ `CommandCenter` - načítá real-time statistiky ze Supabase
- ✅ `LiveCampaigns` - zobrazuje queued kontakty z databáze
- ✅ `CallCockpit` - ukládá call záznamy do Supabase
- ✅ `App.tsx` - dynamicky načítá daily stats

## Database Schema

### Tabulky:

#### `campaigns`
- `id` - UUID primary key
- `name` - Název kampaně
- `description` - Popis
- `status` - 'active', 'paused', 'completed'
- `contacts_count` - Počet kontaktů
- `calls_made` - Počet volaných
- `meetings_booked` - Počet objednaných schůzí

#### `contacts`
- `id` - UUID primary key
- `campaign_id` - Foreign key na campaigns
- `name` - Jméno kontaktu
- `role` - Pozice (CTO, VP Sales, etc.)
- `company` - Název společnosti
- `phone` - Telefonní číslo
- `email` - Email
- `status` - 'queued', 'called', 'completed'
- `source` - Zdroj (LinkedIn, Cold List, Referral)
- `last_touch` - Poslední kontakt (timestamp)
- `ai_summary` - AI souhrn pro kontext

#### `calls`
- `id` - UUID primary key
- `contact_id` - Foreign key na contacts
- `duration` - Délka hovoru (sekundy)
- `outcome` - 'meeting', 'callback', 'not-interested', 'voicemail'
- `transcript_text` - Transkript hovoru
- `stage` - SPIN stage ('opening', 'discovery', 'implication', 'need-payoff', 'close')
- `created_at` - Čas vytvoření

#### `deals`
- `id` - UUID primary key
- `campaign_id` - Foreign key na campaigns
- `contact_id` - Foreign key na contacts
- `name` - Název dealu
- `value` - Hodnota (v EUR)
- `currency` - Měna (EUR, USD, etc.)
- `status` - 'open', 'won', 'lost'
- `expected_close_date` - Očekávaný close date

## Testování

### 1. Command Center
- Zobrazuje real-time data z Supabase
- Počet hovorů dneška
- Hodnota pipeline
- Connect rate

### 2. Live Campaigns
- Zobrazuje queued kontakty
- Klikněte "Start Call" pro simulaci hovoru
- Call se uloží do databáze

### 3. Ověřte Datový Tok

```bash
node scripts/test-backend.mjs
```

Zjistí:
- ✅ Supabase je připojena
- ✅ Kontakty se načítají
- ✅ Statistiky se počítají

## Troubleshooting

### "Kontakt nenalezen"
- Zkontrolujte, že jste spustili `node scripts/setup-backend.mjs`
- Ujistěte se, že v databázi existují kontakty

### "Supabase not configured"
- Zkontrolujte `.env` soubor
- Ujistěte se, že `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY` jsou správné

### "Permission denied" v databázi
- V Supabase dashboardu → **Authentication** → **Policies**
- Ujistěte se, že RLS políčka jsou povoleny pro vaši roli

## Příští Kroky

1. **Pipedrive Integration** - Nastavte `VITE_PIPEDRIVE_API_TOKEN` a `VITE_PIPEDRIVE_DOMAIN`
2. **User Authentication** - Přidejte Auth0/Supabase Auth
3. **Real Phone Integration** - Propojte se s Twilio/VonageAPI
4. **AI Coaching** - Integrace s Claude/GPT pro real-time coaching

## Kontakt na Support

Pokud máte jakékoliv problémy:
1. Zkontrolujte Supabase logs: Dashboard → **Logs** → **API requests**
2. Podívejte se na browser console (F12) pro chyby
3. Spusťte `node scripts/test-backend.mjs` pro diagnózu

---

**Status:** ✅ Plná výroba | Backend propojeny | Mock data odstraněny
