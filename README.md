# Dial1 — Production-Ready Sales Dialer & Meet Coach

**Neobrutalism sales acceleration platform s AI-assisted prep a coaching**

## 🚀 Hlavní funkce

### 🎯 Dialer Mode (Cold Calling)
- 3-column layout: Queue → Active Contact → AI Prep Panel
- Real-time AI battlecards s company insights, pain points
- BANT kvalifikace + keyboard shortcuts
- Demo mode fallback (funguje bez backend API)

### 🎥 Meet Coach Mode (Google Meet Demos)
- SPIN selling framework s 20min scripty
- Live whisper coaching + objection handlers
- Phase tracking + progress visualization

### 🎨 Soft Neobrutalism Design
- Teplé pozadí #f5f0e8, bold 2-3px borders
- Solid shadows 4px 4px 0 #1a1a1a
- Pastel accents: neo-yellow, neo-pink, neo-mint
- 100px tall clickable buttons

## 🛠️ Tech Stack
React 18 + TypeScript + Vite 6.4.1 | Framer Motion | Supabase Edge Functions | Hash routing

## 📦 Quick Start

```bash
npm install          # Závislosti
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run typecheck    # Type checking
```

## ⚙️ Environment (.env.local)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🚀 Deployment (Vercel)

```bash
git push origin main  # Auto-deploy on push
```

Nastav env vars v Vercel Dashboard: VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_ANON_KEY

## 🎯 Production Features

✅ ErrorBoundary + graceful fallbacks | ✅ Lazy loading + optimized bundles (110KB gzipped)  
✅ No hardcoded secrets | ✅ Mode switching (Dialer ↔ Meet Coach via #hash)

## ⌨️ Keyboard Shortcuts (Dialer)
`C` call | `S` skip | `D` demo booked | `N` notes | `↑/↓` navigate | `M` Google Meet | `Space` timer

## 📄 Docs
[Production Checklist](./PRODUCTION_CHECKLIST.md) | [Backend Setup](./BACKEND_SETUP.md) | [Meet Integration](./MEET_COACHING_INTEGRATION_QUICK_START.md)

---

**Status**: ✅ Production Ready | **Version**: 0.1.0 | **Updated**: Feb 5, 2026

