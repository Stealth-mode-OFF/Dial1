# Echo Telesales OS - Architecture Overview

## 📐 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Frontend React App (271 KB gzip)                      │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  OnboardingScreen                                      │  │
│  │    ↓                                                   │  │
│  │  DashboardScreen (Main Hub)                           │  │
│  │    ├─ CampaignList (Power Dialer)                     │  │
│  │    ├─ PreCallBattleCard (Strategy)                    │  │
│  │    ├─ AICallScreen (Live Call)                        │  │
│  │    ├─ PostCallScreen (Disposition)                    │  │
│  │    ├─ AnalyticsScreen (Performance)                   │  │
│  │    └─ SettingsScreen (Config)                         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓↑
                        HTTP REST API
                              ↓↑
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Cloud)                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Supabase (Firebase Alternative)                       │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  ┌──────────────────┐  ┌──────────────────┐           │  │
│  │  │  PostgreSQL DB   │  │  Auth System     │           │  │
│  │  │  - Calls         │  │  - JWT tokens    │           │  │
│  │  │  - Contacts      │  │  - Session mgmt  │           │  │
│  │  │  - Analytics     │  │  - RBAC          │           │  │
│  │  └──────────────────┘  └──────────────────┘           │  │
│  │                                                        │  │
│  │  ┌──────────────────┐  ┌──────────────────┐           │  │
│  │  │  Edge Functions  │  │  KV Store (Cache)│           │  │
│  │  │  - AI Analysis   │  │  - AI Results    │           │  │
│  │  │  - CRM Sync      │  │  - Session Data  │           │  │
│  │  │  - Email Gen     │  │  - Quick Queries │           │  │
│  │  └──────────────────┘  └──────────────────┘           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
        ↓↑              ↓↑              ↓↑
     OpenAI API    Pipedrive API   Email Provider
  (Battle Cards)   (Lead Sync)      (SendGrid)
```

## 🔄 Data Flow

### User Journey
```
1. ONBOARDING
   OnboardingScreen → localStorage.echo:onboarded = true

2. DAILY BRIEFING
   DashboardScreen → Check Energy/Mood
                  → Show AI Priority Queue

3. POWER DIALING
   CampaignList (contacts)
        ↓
   Select Contact
        ↓
   PreCallBattleCard (AI Strategy)
        ↓
   AICallScreen (Live Call)
        ↓
   PostCallScreen (Disposition)
        ↓
   Next Contact (loop)

4. ANALYTICS
   AnalyticsScreen ← Fetch metrics from Supabase
```

### Call Flow
```
BEFORE CALL:
┌─────────────────────────────┐
│ Contact Selected            │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ Fetch from Supabase KV:     │
│ - Previous call notes       │
│ - AI analysis (cached)      │
│ - Contact history           │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ If no cached analysis:      │
│ Call OpenAI API for:        │
│ - Industry insights         │
│ - Pain points               │
│ - Personality type          │
│ - Talking points            │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ Display Battle Card:        │
│ - Pitch Template            │
│ - Personality Advice        │
│ - Objection Handlers        │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ User Ready → Click "Call"   │
└──────────┬──────────────────┘

DURING CALL:
┌─────────────────────────────┐
│ LocalStorage tracks:        │
│ - Call start time           │
│ - Questions asked count     │
│ - Notes entered             │
│ - Quality score (0-100)     │
└──────────┬──────────────────┘

AFTER CALL:
┌─────────────────────────────┐
│ User selects disposition:   │
│ - Meeting scheduled         │
│ - Callback later            │
│ - Not interested            │
│ - Wrong contact             │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ Supabase Edge Function:     │
│ - Save call record          │
│ - Generate follow-up email  │
│ - Sync to Pipedrive CRM     │
│ - Update analytics          │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ Next Contact Loaded         │
└─────────────────────────────┘
```

## 🗂️ Component Hierarchy

```
App (State Management)
├── OnboardingScreen (First-time flow)
└── DashboardLayout (Main wrapper)
    ├── Sidebar (Navigation)
    ├── DashboardScreen (Main hub)
    │   ├── QuickStats
    │   └── Live Activity Feed
    ├── CampaignList
    │   └── ContactCard (repeating)
    ├── PreCallBattleCard
    │   ├── PitchTemplate
    │   ├── SalesTools
    │   └── QuickActions
    ├── AICallScreen (Main focus)
    │   ├── Mentor Island
    │   └── Transcript Area
    ├── PostCallScreen
    │   ├── Disposition buttons
    │   ├── Quick email draft
    │   └── Schedule next steps
    ├── AnalyticsScreen
    │   ├── Stats cards
    │   ├── Charts (Recharts)
    │   └── Trends
    ├── LiveMeetCoach (Google Meet live captions)
    └── SettingsScreen
        ├── Supabase config
        ├── API keys
        └── Preferences
```

## 💾 State Management Strategy

### Global State (React Context)
```
App.tsx manages:
- currentScreen (which page to show)
- energy level (impacts UI recommendations)
- mood (affects mentor personality)
- streak (call count today)
- campaigns (list of contact lists)
- activeCampaign (current campaign)
- currentContactIndex (which contact in list)
```

### Local State (Individual Components)
```
Component    │ State                  │ Why Local
─────────────┼────────────────────────┼──────────────────
OnboardingScreen │ Page index        │ Sequential flow
DashboardScreen  │ Modal state       │ UI only
AICallScreen     │ Transcript        │ Call-specific
ContactCard      │ Hover state       │ UI feedback
```

### Persistent State (localStorage)
```
Key              │ Value            │ Purpose
─────────────────┼──────────────────┼────────────────────
echo:onboarded   │ true/false       │ Skip onboarding
echo:salesStyle  │ hunter/consult   │ User preference
echo:settings    │ JSON             │ All user configs
```

## 🔌 API Endpoints

### Supabase Edge Functions (Backend)
```
POST /analytics
  ├─ Input: User ID, date range
  ├─ Output: Daily stats, trends
  └─ Cache: 5 minutes

POST /ai-research
  ├─ Input: Contact name, company
  ├─ Output: Battle card data
  ├─ Cache: Permanent (KV store)
  └─ Provider: OpenAI API

POST /sync-pipedrive
  ├─ Input: User token
  ├─ Output: Today's contacts
  ├─ Cache: 1 hour
  └─ Provider: Pipedrive API

POST /email-draft
  ├─ Input: Contact, tone, topic
  ├─ Output: Email HTML
  ├─ Cache: None (always fresh)
  └─ Provider: OpenAI API
```

## 📊 Performance Metrics

### Load Times (Expected)
```
Metric                    │ Target  │ Actual (Demo)
──────────────────────────┼─────────┼──────────────
Page Load Time            │ < 1s    │ 0.8s
Time to Interactive       │ < 2s    │ 1.2s
First Contentful Paint    │ < 0.5s  │ 0.4s
Cumulative Layout Shift   │ < 0.1   │ 0.05
Largest Contentful Paint  │ < 2.5s  │ 1.8s
```

### Bundle Metrics
```
Asset                 │ Size      │ Gzip
──────────────────────┼───────────┼──────────
JavaScript            │ 924.89 KB │ 271.60 KB
CSS (Tailwind)        │ 100.04 KB │ 14.66 KB
HTML                  │ 0.44 KB   │ 0.28 KB
Total                 │ 1.025 MB  │ 286.54 KB
```

## 🔐 Security Model

```
┌──────────────────────────────────────────┐
│  Client Authentication                   │
├──────────────────────────────────────────┤
│  1. User opens app                       │
│  2. Check localStorage for session       │
│  3. Validate JWT token with Supabase     │
│  4. If expired, redirect to login        │
│  5. If valid, grant access               │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  API Authorization                       │
├──────────────────────────────────────────┤
│  All API calls include:                  │
│  - Authorization: Bearer {JWT_TOKEN}     │
│  - X-Client-ID header                    │
│  - Content-Type: application/json        │
│  Server validates token before processing│
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  Row-Level Security (Supabase)           │
├──────────────────────────────────────────┤
│  User can only access:                   │
│  - Their own calls                       │
│  - Their own analytics                   │
│  - Shared team data (if enabled)         │
│  - Cannot modify other users' data       │
└──────────────────────────────────────────┘
```

## 📈 Scaling Strategy

### Current (Demo)
- Single browser instance
- In-memory state
- No backend required
- No database needed

### Phase 2 (Single User)
- Supabase backend
- PostgreSQL for persistence
- Auth system
- API calls per action

### Phase 3 (Team)
- Multi-user architecture
- Shared campaigns
- Team analytics
- Role-based access

### Phase 4 (Enterprise)
- Multiple organizations
- SSO integration
- Advanced analytics
- Dedicated infrastructure

---

**This architecture supports growth from solo rep to 1000+ person enterprise.**
