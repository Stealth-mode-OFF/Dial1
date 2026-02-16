# Spark Prompt: Pipedrive B2B Data Enrichment & Lead Import App

## PROJECT OVERVIEW

Build a production-ready web application for **B2B data enrichment and lead management** integrated with **Pipedrive CRM**. The app targets Czech/Slovak B2B salespeople and must automatically enrich leads and organizations with business data from public registries, dramatically reducing manual CRM data entry and improving lead qualification.

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (auth + DB + Edge Functions), Pipedrive API v1/v2.

---

## CORE MODULES

### MODULE 1: Lead Import

#### 1.1 CSV/Excel Import

- Upload CSV/XLSX file with leads (columns: company name, contact name, email, phone, website, notes)
- Intelligent column mapping UI (auto-detect columns by header names, allow manual remapping)
- Preview imported data before pushing to Pipedrive
- Duplicate detection: before import, check if organization/person already exists in Pipedrive (search by name, email, IČO)
- Import creates: Organization → Person → Lead (or Deal) in Pipedrive, linked together
- Batch import with progress bar, error handling per row, downloadable error report

#### 1.2 Manual Lead Entry

- Quick-add form: enter just company name or IČO → auto-fill everything from ARES
- Single-field smart search: type company name or IČO, show autocomplete suggestions from ARES
- One-click "Create in Pipedrive" after enrichment preview

#### 1.3 Web Scraper Import (Bonus)

- Paste a URL (firmy.cz, LinkedIn company page, etc.) → extract company name, IČO, contacts
- Bulk URL import from a text list

---

### MODULE 2: Data Enrichment Engine

This is the core value. When a lead/organization enters the system (via import, webhook, or manual trigger), enrich it with ALL available data.

#### 2.1 Czech Business Registry (ARES) Enrichment

**API:** `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat`

- **Method:** POST with JSON body `{"obchodniJmeno": "company name", "start": 0, "pocet": 5}` for search by name
- **Method:** GET `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}` for lookup by IČO

**Data points to extract from ARES:**
| Field | ARES JSON path | Pipedrive target |
|-------|---------------|-----------------|
| IČO (Company ID) | `ico` | Org custom field + Deal custom field |
| DIČ (VAT/Tax ID) | `dic` | Org custom field |
| Company legal name | `obchodniJmeno` | Organization name |
| Legal form | `pravniForma` (code) → map to text (s.r.o., a.s., OSVČ, etc.) | Org custom field |
| Registered address | `sidlo.textovaAdresa` | Org address field |
| Street | `sidlo.nazevUlice` + `sidlo.cisloDomovni`/`cisloOrientacni` | Org address |
| City | `sidlo.nazevObce` | Org address |
| ZIP | `sidlo.psc` | Org address |
| Date founded | `datumVzniku` | Org custom field |
| Company status | `stavSubjektu` (active / in liquidation / dissolved) | Org custom field |
| NACE industry codes | `czNace[].kod` + `czNace[].text` | Org custom field (primary NACE as industry) |
| Company size category | `kategorieVelikosti` (if available) | Org custom field |
| Data source verified | `zdroj` | Org note |

#### 2.2 Email Domain Intelligence

From contact email (e.g., `jan.novak@firma.cz`), extract:

- **Company website** → `https://firma.cz`
- **Domain age** (via WHOIS or similar) → indicates company maturity
- Flag generic email providers (gmail.com, seznam.cz, centrum.cz, email.cz, outlook.com, yahoo.com, icloud.com, hotmail.com) — these are low-confidence leads, mark them

#### 2.3 Website Scraping Enrichment

From the company website:

- **IČO** → regex scan for patterns like `IČO:\s*(\d{8})`, `IČ:\s*(\d{8})`, `Reg\.?\s*č[íi]slo:\s*(\d{8})`
- **DIČ** → regex for `DIČ:\s*(CZ\d{8,10})`
- **Phone numbers** → regex for Czech format `+420\s?\d{3}\s?\d{3}\s?\d{3}`
- **Social links** → LinkedIn, Facebook, Twitter/X URLs
- **Technology stack detection** (from HTML meta tags, scripts): detects if they use Shopify, WordPress, etc. — useful for tech sales
- **Meta description** → company summary for salesperson context
- **Employee count hints** → from "O nás" / "About us" pages if mentioned

#### 2.4 VIES VAT Validation (EU)

**API:** `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`

- Validate DIČ against EU VIES system
- Confirm company is active VAT payer → B2B signal (legitimate business)
- Returns: company name, address (cross-reference with ARES data)

#### 2.5 Number of Employees Estimation

Sources (in priority order):

1. **ARES `kategorieVelikosti`** field (if present): `00`=no employees, `10`=1-5, `20`=6-9, `30`=10-19, `40`=20-24, `50`=25-49, `60`=50-99, `70`=100-199, `80`=200-249, `90`=250-499, `100`=500-999, `110`=1000+
2. **Czech Statistical Office (CZSO) / RES** → `https://apl.czso.cz/irsw/detail.jsp?pession_id={ico}` (scrape if no API)
3. **LinkedIn company page** (with headless browser) → "X employees on LinkedIn"
4. **Website scraping** → look for employee mentions on "About" / "O nás" pages
5. **Heuristic from NACE + legal form** (a.s. = likely larger, OSVČ = 1 person)

#### 2.6 Financial Data (Bonus - Czech Justice Ministry)

From `https://or.justice.cz/` (Obchodní rejstřík):

- **Annual revenue** (from published financial statements / Sbírka listin)
- **Statutory directors** (jednatelé, members of board) → potential decision makers
- **Shareholders** (společníci) → ownership structure
- **Date of last filing** → indicates company activity level

#### 2.7 Enrichment Confidence Score

Calculate a confidence score (0-100%) for each enriched record:

- IČO found + verified in ARES = +30
- Address validated = +10
- Email domain matches company website = +15
- VIES VAT validated = +15
- Employee count found = +10
- Website accessible and contains company info = +10
- Financial data available = +10
- Score determines lead quality badge: 🟢 High (70+), 🟡 Medium (40-69), 🔴 Low (<40)

---

### MODULE 3: Pipedrive Integration

#### 3.1 Custom Fields Setup

On first run / setup page, auto-create these custom fields in Pipedrive if they don't exist:

**Organization custom fields:**
| Field name | Type | Purpose |
|-----------|------|---------|
| IČO | varchar | Czech business registration number |
| DIČ | varchar | VAT / Tax ID |
| Company ID (ICO) | varchar | Backup IČO field |
| Legal Form | varchar | s.r.o., a.s., OSVČ, k.s., v.o.s., etc. |
| NACE Industry | varchar | Primary NACE code + description |
| Founded Date | date | Date of company registration |
| Company Status | varchar | Active / In Liquidation / Dissolved |
| Employee Count | varchar | Number of employees (range or exact) |
| Employee Size Category | enum | Micro (1-9) / Small (10-49) / Medium (50-249) / Large (250+) |
| Annual Revenue | varchar | Last known annual revenue |
| Enrichment Score | int | Confidence score 0-100 |
| Enrichment Date | date | When data was last enriched |
| Data Source | varchar | ARES, Web, Manual |
| LinkedIn URL | varchar | Company LinkedIn page |
| Website | varchar | Company website (auto-fill from email domain) |

**Deal custom fields:**
| Field name | Type | Purpose |
|-----------|------|---------|
| Company ID (IČO) | varchar | Mirrored from org for quick reference |

**Person custom fields:**
| Field name | Type | Purpose |
|-----------|------|---------|
| LinkedIn Profile | varchar | Personal LinkedIn URL |
| Role / Seniority | enum | C-Level / VP / Director / Manager / Specialist / Other |
| Decision Maker | boolean | Is this person a decision maker? |

#### 3.2 Pipedrive API Integration

```
Base URL: https://api.pipedrive.com/v1
Auth: ?api_token={PIPEDRIVE_API_KEY}

Key endpoints:
GET    /deals           — list all deals (paginated, 100/page)
GET    /deals/{id}      — get deal detail
PATCH  /deals/{id}      — update deal custom fields
GET    /organizations   — list all orgs
GET    /organizations/{id} — get org detail
PATCH  /organizations/{id} — update org custom fields
POST   /organizations   — create new org
GET    /persons         — list all persons
PATCH  /persons/{id}    — update person
POST   /persons         — create new person
GET    /leads           — list all leads
POST   /leads           — create new lead
PATCH  /leads/{id}      — update lead
GET    /organizationFields — list org custom fields (to get field keys)
GET    /dealFields       — list deal custom fields
GET    /personFields     — list person custom fields
POST   /organizationFields — create new org custom field
POST   /dealFields       — create new deal custom field
POST   /personFields     — create new person custom field
POST   /webhooks         — register webhook for events
```

#### 3.3 Webhook-Based Auto-Enrichment

Register Pipedrive webhooks to auto-enrich when:

- `added.organization` → new org created → trigger enrichment
- `added.deal` → new deal created → enrich associated org
- `added.person` → new person created → extract domain, enrich org
- `updated.organization` → if IČO field was manually entered → validate + fill rest
- `added.lead` → new lead created → enrich

Webhook handler should be a Supabase Edge Function or Next.js API route that:

1. Receives webhook payload
2. Checks if org needs enrichment (IČO empty or enrichment_date > 30 days)
3. Queues enrichment job (to avoid Pipedrive rate limits: 100 req/10sec for premium)
4. Processes enrichment asynchronously
5. Writes results back to Pipedrive

#### 3.4 Bulk Enrichment

- "Enrich All" button → iterate all organizations in Pipedrive, enrich those missing data
- Progress tracking with real-time updates (SSE or polling)
- Skip already-enriched records (unless "Force Re-enrich" is checked)
- Rate limiting: max 2 requests/second to ARES, max 8 req/sec to Pipedrive
- Detailed log/report: X enriched, Y skipped, Z failed (with reasons)
- Export enrichment report as CSV

---

### MODULE 4: Dashboard & UI

#### 4.1 Main Dashboard

- **Enrichment overview:** Total orgs, enriched count, pending count, failed count
- **Recent enrichments:** Last 20 enriched records with status
- **Data quality score:** Average enrichment confidence across all orgs
- **Charts:** Enrichment coverage pie chart, industry breakdown, company size distribution

#### 4.2 Enrichment Queue View

- List of pending enrichments with status (queued / processing / done / error)
- Retry failed enrichments
- Cancel queued items
- Filter by status, date range

#### 4.3 Organization Detail View

- Show all enriched data for a single org
- Side-by-side: current Pipedrive data vs. enriched data (diff view)
- "Apply to Pipedrive" button (selective — checkboxes for each field)
- "Open in Pipedrive" link
- History of enrichment attempts

#### 4.4 Settings Page

- Pipedrive API key configuration
- Custom field mapping (auto-detect existing fields, map them)
- Enrichment preferences: which modules to enable (ARES, VIES, web scraping, etc.)
- Auto-enrichment toggle (webhook-based)
- Rate limit configuration
- Notification preferences (email on completion, on errors)

---

### MODULE 5: Lead Scoring & Qualification

Based on enriched data, auto-calculate a lead score to help salespeople prioritize:

| Signal                              | Score Impact       |
| ----------------------------------- | ------------------ |
| Company has IČO (verified)          | +10                |
| Active company (not dissolved)      | +10                |
| Company size > 10 employees         | +5 to +20 (scaled) |
| Has a website                       | +5                 |
| Business email (not generic)        | +10                |
| VIES VAT validated                  | +5                 |
| Industry matches target verticals   | +15                |
| Contact is C-Level / Decision maker | +15                |
| Company founded > 2 years ago       | +5                 |
| Has financial data / revenue info   | +5                 |

Score ranges:

- 🔥 **Hot Lead** (80-100): Ready for immediate outreach
- 🟢 **Qualified** (60-79): Good prospect, schedule contact
- 🟡 **Nurture** (30-59): Needs more research/qualification
- 🔴 **Cold** (0-29): Low priority or insufficient data

Write the score to a Pipedrive custom field so salespeople see it directly in CRM.

---

## TECHNICAL ARCHITECTURE

### Database Schema (Supabase)

```sql
-- Enrichment jobs queue
CREATE TABLE enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipedrive_org_id INTEGER,
  pipedrive_deal_id INTEGER,
  pipedrive_person_id INTEGER,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','processing','done','error','skipped')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','webhook','bulk','import')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

-- Enriched organization cache
CREATE TABLE enriched_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipedrive_org_id INTEGER UNIQUE NOT NULL,
  org_name TEXT,
  ico TEXT,
  dic TEXT,
  legal_form TEXT,
  nace_code TEXT,
  nace_description TEXT,
  address_full TEXT,
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  founded_date DATE,
  company_status TEXT,
  employee_count TEXT,
  employee_category TEXT,
  annual_revenue TEXT,
  website TEXT,
  linkedin_url TEXT,
  enrichment_score INTEGER,
  data_sources TEXT[], -- ['ares','web','vies']
  raw_ares_data JSONB,
  raw_web_data JSONB,
  synced_to_pipedrive BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Import history
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  total_rows INTEGER,
  imported INTEGER DEFAULT 0,
  enriched INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  error_report JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

-- API settings per user (multi-tenant ready)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  pipedrive_api_key TEXT,
  pipedrive_domain TEXT,
  auto_enrich_enabled BOOLEAN DEFAULT true,
  enrichment_modules TEXT[] DEFAULT ARRAY['ares','web','vies'],
  target_industries TEXT[],
  webhook_secret TEXT,
  field_mapping JSONB, -- maps our field names to Pipedrive custom field keys
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### API Architecture

```
/api/
  /enrichment/
    POST /enrich          — enrich a single org (by org_id or by company name/IČO)
    POST /enrich-bulk     — start bulk enrichment of all orgs
    GET  /enrich-status   — get status of enrichment queue
    GET  /enrich-history  — get recent enrichment results

  /import/
    POST /csv             — upload and parse CSV file
    POST /csv/preview     — preview parsed data with column mapping
    POST /csv/execute     — execute import to Pipedrive + trigger enrichment

  /pipedrive/
    POST /webhook         — receive Pipedrive webhook events
    GET  /fields          — list all custom fields (org, deal, person)
    POST /fields/setup    — auto-create missing custom fields in Pipedrive
    GET  /orgs            — proxy to list orgs with enrichment status overlay
    GET  /stats           — dashboard statistics

  /lookup/
    GET  /ares?q=name     — search ARES by company name
    GET  /ares/:ico       — get ARES detail by IČO
    GET  /vies?dic=CZ123  — validate VAT via VIES
    GET  /web?url=...     — scrape website for business data
```

### Key Implementation Notes

1. **Rate Limiting Strategy:**
   - ARES API: max 2 requests/second, no auth required, free
   - Pipedrive API: 100 requests per 10 seconds (premium plans), use queuing
   - Website scraping: add 500ms-1000ms delay between requests, respect robots.txt
   - Use Supabase Edge Function queue or pg_cron for async processing

2. **Error Handling:**
   - ARES returns 404 for non-existent IČO → mark as "not found"
   - Website scraping may timeout → set 5s timeout, mark as "partial"
   - Pipedrive API may rate-limit → exponential backoff with jitter
   - Log all enrichment attempts with full context for debugging

3. **Caching:**
   - Cache ARES results for 30 days (company data changes rarely)
   - Cache website scrape results for 7 days
   - Store all raw API responses in `enriched_orgs.raw_ares_data` for audit trail

4. **Security:**
   - Pipedrive API keys stored encrypted in Supabase
   - Webhook endpoints validate Pipedrive webhook signature
   - All API routes authenticated via Supabase auth
   - No sensitive data exposed in client-side code

5. **Generic Email Domain Blacklist:**
   ```
   gmail.com, googlemail.com, yahoo.com, yahoo.cz, outlook.com, hotmail.com,
   live.com, msn.com, icloud.com, me.com, seznam.cz, centrum.cz, email.cz,
   post.cz, atlas.cz, volny.cz, tiscali.cz, quick.cz, iol.cz, azet.sk,
   zoznam.sk, pobox.sk, mail.ru, protonmail.com, tutanota.com, aol.com
   ```

---

## PROVEN ARES API EXAMPLES

### Search by company name:

```
POST https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat
Content-Type: application/json

{
  "obchodniJmeno": "Behavera",
  "start": 0,
  "pocet": 5
}
```

Response contains `ekonomickeSubjekty[]` array with:

```json
{
  "ico": "12345678",
  "obchodniJmeno": "Behavera s.r.o.",
  "dic": "CZ12345678",
  "pravniForma": "112",
  "datumVzniku": "2020-01-15",
  "datumAktualizace": "2024-06-01",
  "sidlo": {
    "kodStatu": "CZ",
    "nazevStatu": "Česká republika",
    "nazevKraje": "Hlavní město Praha",
    "nazevOkresu": "Praha",
    "nazevObce": "Praha",
    "nazevMestskeCasti": "Vinohrady",
    "nazevUlice": "Korunní",
    "cisloDomovni": 2569,
    "cisloOrientacni": 105,
    "psc": 10100,
    "textovaAdresa": "Korunní 2569/105, Vinohrady, 101 00 Praha 10"
  },
  "czNace": [
    { "kod": "620", "text": "Činnosti v oblasti informačních technologií" }
  ]
}
```

### Lookup by IČO:

```
GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/05752779
```

### IČO Regex Patterns for Website Scraping:

```javascript
const ICO_PATTERNS = [
  /I[Čč][Oo]\s*[:.]?\s*(\d{8})/i,
  /IČ\s*[:.]?\s*(\d{8})/i,
  /Company\s*ID\s*[:.]?\s*(\d{8})/i,
  /Reg(?:istration)?\s*(?:No|Number|nr|č[íi]slo)\s*[:.]?\s*(\d{8})/i,
  /Identifika[čc]n[ií]\s*[čc][ií]slo\s*[:.]?\s*(\d{8})/i,
];
```

---

## PIPEDRIVE API REFERENCE

### Authentication

All requests append `?api_token=YOUR_API_KEY` as query parameter.

### Key Patterns

**Pagination (v1):**

```
GET /v1/deals?start=0&limit=100
→ response.additional_data.pagination.more_items_in_collection = true/false
→ response.additional_data.pagination.next_start = 100
```

**Custom fields:**
Custom fields are 40-character hex hashes. Get field keys via:

```
GET /v1/organizationFields
GET /v1/dealFields
GET /v1/personFields
```

**Update custom fields on org:**

```
PUT /v1/organizations/{id}
Body: { "field_hash_key": "value" }
```

**Create custom field:**

```
POST /v1/organizationFields
Body: { "name": "IČO", "field_type": "varchar" }
→ returns field key in response.data.key
```

**Webhooks:**

```
POST /v1/webhooks
Body: {
  "subscription_url": "https://your-app.com/api/pipedrive/webhook",
  "event_action": "added",
  "event_object": "organization"
}
```

**Leads (v1):**

```
GET  /v1/leads            — list leads
POST /v1/leads            — create lead (requires title + person_id or organization_id)
PATCH /v1/leads/{id}      — update lead
DELETE /v1/leads/{id}     — delete lead
```

---

## UI/UX REQUIREMENTS

### Design System

- Clean, modern SaaS dashboard design
- Color scheme: dark sidebar (#1a1a2e), white content area, blue accents (#3b82f6)
- Use shadcn/ui components (Tables, Cards, Badges, Dialog, Progress, Tabs)
- Responsive but desktop-first (salespeople use desktop)
- Czech language support (UI labels in Czech, with English fallback)

### Key Screens

1. **Dashboard** — KPIs, charts, recent activity
2. **Import** — File upload → Column mapping → Preview → Execute
3. **Enrichment** — Queue view, status, retry actions
4. **Organizations** — Searchable list with enrichment status badges
5. **Org Detail** — All enriched data, Pipedrive diff, apply buttons
6. **Settings** — API key, field mapping, modules toggle
7. **Lookup** — Quick IČO/name search against ARES (standalone tool)

### Interaction Patterns

- Drag & drop CSV upload
- Real-time enrichment progress (SSE or WebSocket)
- Toast notifications for completed enrichments
- Keyboard shortcuts for power users (Ctrl+K for search, etc.)
- Bulk select + bulk action on organization list

---

## WHAT MAKES THIS VALUABLE FOR B2B SALESPEOPLE

1. **Time saved:** Instead of manually googling every company, IČO, employee count — it's all automatic. Saves 5-10 min per lead × 50 leads/day = 4-8 hours/day.

2. **Better lead qualification:** With employee count, industry, company age, and revenue — salespeople instantly know if a lead is worth pursuing. No more wasting time on too-small or wrong-industry prospects.

3. **Data consistency:** All CRM records have the same fields filled in the same format. Reports and filters actually work. Pipeline forecasting becomes reliable.

4. **Compliance:** IČO and DIČ are needed for invoicing in Czech Republic. Having them pre-filled means faster quote-to-contract cycle.

5. **Competitive intelligence:** Knowing a prospect's tech stack, company size, and financial health gives salespeople an edge in negotiations.

6. **Automatic CRM hygiene:** Webhooks ensure every new record gets enriched immediately — no decay, no stale data, no "I forgot to fill it in" excuse.

---

## IMPLEMENTATION PRIORITY ORDER

1. **Phase 1 — Core Enrichment:** ARES lookup by IČO + by name, write to Pipedrive org fields, basic UI
2. **Phase 2 — Lead Import:** CSV upload, column mapping, Pipedrive push + enrichment trigger
3. **Phase 3 — Auto-Enrichment:** Webhook setup, queue system, background processing
4. **Phase 4 — Website Scraping:** Extract IČO, phone, social links from company websites
5. **Phase 5 — Advanced Data:** VIES validation, employee estimation, financial data, lead scoring
6. **Phase 6 — Polish:** Dashboard charts, export reports, Czech i18n, multi-user

---

## FILES STRUCTURE

```
/app
  /page.tsx                    — Dashboard
  /import/page.tsx             — CSV Import
  /enrichment/page.tsx         — Enrichment Queue
  /organizations/page.tsx      — Org List
  /organizations/[id]/page.tsx — Org Detail
  /lookup/page.tsx             — Quick ARES Lookup
  /settings/page.tsx           — Settings
  /api/
    /enrichment/route.ts       — Enrichment endpoints
    /import/route.ts           — Import endpoints
    /pipedrive/webhook/route.ts — Webhook handler
    /lookup/ares/route.ts      — ARES proxy
    /lookup/vies/route.ts      — VIES proxy
    /lookup/web/route.ts       — Website scraper
/lib
  /pipedrive.ts                — Pipedrive API client wrapper
  /ares.ts                     — ARES API client
  /vies.ts                     — VIES API client
  /scraper.ts                  — Website scraper
  /enrichment-engine.ts        — Orchestrator: runs all enrichment sources, merges results, calculates score
  /queue.ts                    — Job queue management
  /field-mapping.ts            — Pipedrive custom field detection/creation
/components
  /dashboard/                  — Dashboard widgets
  /import/                     — Import wizard components
  /enrichment/                 — Queue & status components
  /org/                        — Organization list & detail
  /ui/                         — shadcn/ui components
/supabase
  /migrations/                 — SQL migrations
  /functions/
    /enrich-worker/            — Edge Function for async enrichment
    /pipedrive-webhook/        — Edge Function for webhook handling
```

---

## CRITICAL REMINDERS

- All ARES API calls are FREE and require NO authentication
- ARES has no official rate limit but be respectful (max 2 req/sec)
- Pipedrive custom field keys are 40-char hex strings, NOT field names
- Pipedrive v1 pagination uses `start`+`limit`, v2 uses `cursor`
- Always check if a custom field already exists before creating it (use GET /organizationFields first)
- Czech IČO is always exactly 8 digits (leading zeros matter! e.g., "00027383")
- Czech DIČ format is "CZ" + 8-10 digits
- Legal form codes from ARES need mapping: 112=s.r.o., 121=a.s., 101=OSVČ (živnostník), etc.
- Store enriched data locally (Supabase) as cache AND audit trail — don't rely only on Pipedrive
- Handle Pipedrive API 429 (rate limit) with exponential backoff
- Website scraping should have a 5-second timeout per domain
- Some companies have IČO on their website footer, some in "Kontakt" or "O nás" pages — scrape multiple pages
