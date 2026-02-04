# 🎯 Echo Telesales OS

> **2026 Edition** - Lightweight, AI-powered sales copilot that gives you the edge before every call.  
> Inteligentní platforma pro obchodníky s AI asistencí, automatickým přepisem hovoru a integrací s Pipedrive CRM.

---

## 📖 O Projektu

**Echo Telesales OS** je moderní webová aplikace navržená pro sales týmy, která kombinuje:

- 🤖 **AI analýzu kontaktů** pomocí GPT-4o
- 🎤 **Přepis řeči** přímo v prohlížeči (Web Speech API)
- 📊 **Integraci s Pipedrive** CRM
- 💡 **Inteligentní signály** pro zvýšení úspěšnosti prodeje
- 📈 **Analytics a reporting** výkonu

---

## ✨ Hlavní Funkce

### 1. Modern Dashboard & Energy Tracking

- ✨ **Bento grid layout** - Minimalist, focused design
- 🔋 **Real-time energy meter** - Tracks fatigue, suggests breaks
- 📊 **Live performance stats** - Calls, connect rate, revenue in real-time
- ⚡ **Quick actions** - One-click to start calling
- 🎯 **AI Priority Queue** - Leads sorted by intent score

### 2. Power Dialer with Personality Intelligence

- 📞 **Speed dial interface** - Call in seconds, not minutes
- 🧠 **Personality-based pitches** - Auto-generated openings
- 🎮 **Contact scoring** - 0-100 intent score visualization
- 📍 **Hiring signal detection** - Know who's hiring
- 💪 **Type indicators** - Driver, Analytical, Amiable, Expressive

### 3. Pre-Call Battle Cards

- 💡 **Strategic insights** - Industry, pain points, talking points
- 🎭 **Personality advice** - "Be direct with Drivers", "Use data with Analyticals"
- 🛡️ **Objection handlers** - Pre-loaded rebuttals
- 📈 **Win probability** - AI predicts likelihood of success

### 4. Live Call Metrics

- ⏱️ **Call timer** - Tracks duration with quality indicators
- 📊 **Quality scoring** - Real-time engagement level
- ❓ **Question counter** - Track discovery depth
- 🎙️ **Speech-to-Text** - Transcribe as you talk
- 💬 **Quick notes** - Capture insights during call

### 5. Post-Call Intelligence

- 📝 **One-click dispositions** - Meeting, callback, not interested
- ✉️ **Auto-draft emails** - Generate follow-ups instantly
- 📅 **Schedule callbacks** - Set reminders automatically
- 💾 **CRM sync** - Auto-logs to Pipedrive
- 📊 **Call analysis** - AI breakdown of what worked

### 6. Real-Time Analytics

- 📈 **Performance dashboard** - Calls, connect rate, revenue
- 📊 **Trends** - Daily, weekly, monthly patterns
- 🏆 **Team leaderboards** - Friendly competition
- 🎯 **Forecast** - Pipeline projections based on current pace
- Call log historie
- Win rate tracking

---

## 🚀 Rychlý Start

### Prerekvizity

- **Node.js** 18+
- **npm** nebo **yarn**
- **Supabase** účet (zdarma tier stačí)
- **Pipedrive** účet s API přístupem
- **OpenAI** API key (GPT-4o)

---

## Neo‑Brutal Dialer UI (2026-02-04)

### What changed
- Single-screen neo‑brutal dialer (no scrolling) s jasným focusem na aktuální kontakt + velká akční tlačítka.
- Keyboard-first flow + localStorage persistence pro session stats a notes.

### Keyboard shortcuts
- `C` — Call (tel:)
- `S` — Skip
- `D` — Demo booked
- `N` — Focus notes
- `↑ / ↓` — Queue
- `M` — Open Google Meet

### Instalace

```bash
# 1. Clone repository
git clone [repo-url]
cd echo-telesales-os

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Vytvořte .env.local soubor (viz níže)

# 4. Run development server
npm run dev

# 5. Open browser
# http://localhost:5173
```

---

## 🔐 Environment Variables

Vytvořte soubor `.env.local` v root složce:

```env
# Frontend (Vite)
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_PROJECT_ID=your-project-id  # optional fallback
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend (Supabase Edge Functions)
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=sk-...
PIPEDRIVE_API_KEY=your-pipedrive-api-key

# Optional access controls
ECHO_ALLOWED_ORIGINS=https://www.echopulse.cz,https://echopulse.cz
ECHO_DEFAULT_USER_ID=owner
ECHO_REQUIRE_AUTH=false
```

Note: A `.env.local` file with placeholder keys (`VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY`) has been added to the project root; replace those placeholders with your real Supabase values before running the dev server.

### Kde získat API klíče?

1. **Supabase**: https://supabase.com/dashboard

   - Vytvořte projekt
   - Settings → API → Copy keys

2. **OpenAI**: https://platform.openai.com/api-keys

   - Create new secret key
   - Zkopírujte klíč (ukáže se jen jednou!)

3. **Pipedrive**: https://[company].pipedrive.com/settings/api
   - Personal preferences → API
   - Generate new token

---

## 🧪 Testování

### E2E Testy (Playwright)

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run all tests
npx playwright test

# Run with UI
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# View report
npx playwright show-report
```

**Dokumentace testů**: Viz [TESTING.md](./TESTING.md)

### Test Coverage

✅ **6 test suites** pokrývají:

- Dashboard & Check-In
- Campaigns & Pipedrive Sync
- AI Call Screen & Speech-to-Text
- Analytics & Reporting
- Settings & Configuration
- Navigation & Error Handling

---

## 📁 Struktura Projektu

```
echo-telesales-os/
├── components/
│   ├── AICallScreen.tsx       # Hlavní call screen s AI asistencí
│   ├── CampaignList.tsx       # Seznam kampaní a kontaktů
│   ├── DashboardScreen.tsx    # Dashboard a check-in
│   ├── AnalyticsScreen.tsx    # Analytics a grafy
│   ├── SettingsScreen.tsx     # Nastavení
│   └── layout/
│       ├── DashboardLayout.tsx # Hlavní layout wrapper
│       ├── Header.tsx         # Top navigation
│       └── Sidebar.tsx        # Side navigation
├── supabase/
│   └── functions/
│       └── server/
│           ├── index.tsx      # API routes (Hono server)
│           └── kv_store.tsx   # KV store utility (READ ONLY)
├── e2e/                       # Playwright E2E tests
│   ├── 01-dashboard.spec.ts
│   ├── 02-campaigns.spec.ts
│   ├── 03-call-screen.spec.ts
│   ├── 04-analytics.spec.ts
│   ├── 05-settings.spec.ts
│   └── 06-navigation.spec.ts
├── App.tsx                    # Main app component
├── TESTING.md                 # Testing documentation
├── BUG_TRACKER.md             # Bug tracking
├── PRODUCTION_CHECKLIST.md    # Pre-launch checklist
└── README.md                  # This file
```

---

## 🔧 Technologie

### Frontend

- **React** 18+ (Hooks, TypeScript)
- **Tailwind CSS** 4.0
- **Lucide React** (Icons)
- **Recharts** (Grafy)
- **Web Speech API** (Speech-to-Text)

### Backend

- **Supabase** (Database, Auth, Edge Functions)
- **Hono** (Web server framework)
- **KV Store** (Persistent caching)

### AI & Integrations

- **OpenAI GPT-4o** (Contact analysis, personality detection)
- **Pipedrive API** (CRM integration)

### Testing

- **Playwright** (E2E testing)
- **Cross-browser** (Chrome, Firefox, Safari)
- **Mobile testing** (iOS, Android simulators)

---

## 🎨 Design System

### Colors

- **Primary**: Green (`#16a34a`) - CTA, success states
- **Secondary**: Amber (`#f59e0b`) - Highlights, AI signals
- **Neutral**: Slate (`#64748b`) - Text, borders

### Typography

- **Font**: System font stack (čeština-optimized)
- **Sizes**: Defined in `globals.css`

### Responsive Breakpoints

- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

---

## 🐛 Bug Tracking & Issues

**Aktivní bug tracking**: Viz [BUG_TRACKER.md](./BUG_TRACKER.md)

### Nahlášení chyby

1. Zkontrolujte BUG_TRACKER.md, jestli již není nahlášená
2. Přidejte nový záznam s:
   - Priority (P0-P3)
   - Kroky k reprodukci
   - Očekávané vs. reálné chování
   - Screenshot/console error

---

## 🚀 Deployment

### Production Checklist

**PŘED NASAZENÍM** projděte: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

### Build pro Production

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview

# Deploy
# (Depends on your hosting - Vercel/Netlify/etc.)
```

### Supabase Edge Functions Deployment

```bash
# Login to Supabase CLI
supabase login

# Link project
supabase link --project-ref [your-project-id]

# Deploy functions
supabase functions deploy make-server-139017f8

# Set secrets
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set PIPEDRIVE_API_KEY=...
```

---

## 📊 Performance

### Expected Metrics

- **Dashboard load**: < 2s
- **Pipedrive sync**: < 5s (50 contacts)
- **AI analysis**: 5-15s (first time), < 1s (cached)
- **Bundle size**: < 500KB (gzipped)

### Caching Strategy

- AI intelligence data: **Permanent** (KV store)
- Pipedrive contacts: **Session** (re-sync daily)
- Call logs: **Permanent** (KV store)

---

## 🔒 Bezpečnost

### Protected Keys (Server Only)

⚠️ **NIKDY** neexpozujte na frontend:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `PIPEDRIVE_API_KEY`

### Client-Safe Keys

✅ Lze použít na frontendu:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Security Checklist

- [ ] No API keys in console logs
- [ ] No sensitive data in localStorage
- [ ] All API calls over HTTPS
- [ ] Input validation on backend
- [ ] Rate limiting on API endpoints

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run tests: `npx playwright test`
4. Commit: `git commit -m "feat: my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

### Coding Standards

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (if configured)
- **Linting**: ESLint (if configured)
- **Comments**: Czech or English, explain WHY not WHAT

---

## 📚 Dokumentace

### Pro Vývojáře

- [TESTING.md](./TESTING.md) - E2E testing setup
- [BUG_TRACKER.md](./BUG_TRACKER.md) - Known issues
- `supabase/functions/make-server-139017f8/index.ts` - API documentation (inline)

### Pro QA

- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Pre-launch checklist
- [TESTING.md](./TESTING.md) - Test scenarios

### Pro Product

- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Success criteria

---

## 🆘 Troubleshooting

### "Failed to fetch from Pipedrive"

- Zkontrolujte `PIPEDRIVE_API_KEY` v environment variables
- Ověřte, že API token není expirovaný
- Check Pipedrive API status: https://status.pipedrive.com

### "OpenAI API Error"

- Zkontrolujte `OPENAI_API_KEY`
- Ověřte kredity na účtu: https://platform.openai.com/usage
- Check rate limits (30k TPM pro GPT-4o)

### "Speech-to-Text nefunguje"

- Povolte mikrofon v prohlížeči (permissions)
- Funguje pouze v Chrome/Edge (Web Speech API)
- Vyžaduje HTTPS (nebo localhost)

### "Grafy se nezobrazují"

- Check console for Recharts errors
- Verify data format v Analytics
- ResponsiveContainer needs fixed height

---

## 📝 Changelog

### v1.0.0 (December 2024)

- ✅ Pipedrive integrace (sync only today's activities)
- ✅ AI analýza kontaktů (GPT-4o)
- ✅ Speech-to-Text (Web Speech API)
- ✅ Persistent AI caching (KV store)
- ✅ BANT framework
- ✅ Low energy mode
- ✅ Analytics & reporting
- ✅ E2E test suite (Playwright)
- ✅ Production-ready checklist

### Recent Fixes

- Fixed: Empty Win Probability scores (all 75%)
- Fixed: Recharts negative dimensions error
- Fixed: Mock data in production
- Fixed: AI re-analyzing on every open (caching implemented)

---

## 📞 Support & Contact

**Technical Issues**: [Your Email/Slack]  
**Bug Reports**: Create issue in BUG_TRACKER.md  
**Feature Requests**: [Your Process]

---

## 📄 License

[Your License] - © 2024 [Your Company]

---

## 🎉 Acknowledgments

- **Figma** - Design tool
- **Supabase** - Backend infrastructure
- **OpenAI** - AI capabilities
- **Pipedrive** - CRM integration
- **Playwright** - E2E testing framework

---

**Built with ❤️ for sales teams**

_Last Updated_: December 2024  
_Version_: 1.0.0  
_Status_: 🟢 Production Ready (pending final checklist)
