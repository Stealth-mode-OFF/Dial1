
<!--
    Documentation Index – SalesMachine
    =====================================
    This file maps all key files, folders, and their purpose.
    Use this as your starting point for onboarding or handover.
-->

# 📚 Documentation Index - Echo Telesales OS

> **Centrální rozcestník všech dokumentů** pro development, testing, deployment a maintenance.

---

## 🎯 Kde začít?

### Pro QA / Testery
1. **[LAUNCH_SUMMARY.md](./LAUNCH_SUMMARY.md)** ← **ZAČNĚTE TADY**
2. [TESTING.md](./TESTING.md) - Jak spustit E2E testy
3. [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) - Manuální test scénáře
4. [BUG_TRACKER.md](./BUG_TRACKER.md) - Jak logovat bugy

### Pro Vývojáře
1. **[README.md](./README.md)** ← **ZAČNĚTE TADY**
2. [DEPLOYMENT.md](./DEPLOYMENT.md) - Jak nasadit do produkce
3. [TESTING.md](./TESTING.md) - Jak psát/spouštět testy
4. [BUG_TRACKER.md](./BUG_TRACKER.md) - Aktivní bug list

### Pro Product Ownery / Managery
1. **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** ← **ZAČNĚTE TADY**
2. [LAUNCH_SUMMARY.md](./LAUNCH_SUMMARY.md) - Aktuální status
3. [BUG_TRACKER.md](./BUG_TRACKER.md) - Známé problémy
4. [README.md](./README.md) - Přehled funkcí

---

## 📄 Všechny Dokumenty

### 🚀 Launch & Production

| Document | Purpose | Audience | Priority |
|----------|---------|----------|----------|
| [LAUNCH_SUMMARY.md](./LAUNCH_SUMMARY.md) | Quick launch checklist & status | All | 🔴 P0 |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Kompletní pre-launch checklist | QA, PM | 🔴 P0 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Step-by-step deployment guide | DevOps, Dev | 🔴 P0 |

### 🧪 Testing

| Document | Purpose | Audience | Priority |
|----------|---------|----------|----------|
| [TESTING.md](./TESTING.md) | E2E testing dokumentace | QA, Dev | 🔴 P0 |
| [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) | Manuální test scénáře | QA | 🔴 P0 |
| [BUG_TRACKER.md](./BUG_TRACKER.md) | Bug tracking & management | All | 🔴 P0 |

### 📖 General

| Document | Purpose | Audience | Priority |
|----------|---------|----------|----------|
| [README.md](./README.md) | Hlavní projektová dokumentace | All | 🔴 P0 |
| [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) | Tento dokument - rozcestník | All | 🟡 P1 |

### 🔧 Configuration

| File | Purpose | Audience | Priority |
|------|---------|----------|----------|
| [playwright.config.ts](./playwright.config.ts) | Playwright test configuration | Dev, QA | 🔴 P0 |
| [package.json](./package.json) | NPM dependencies & scripts | Dev | 🔴 P0 |
| [.gitignore](./.gitignore) | Git ignore patterns | Dev | 🔴 P0 |

### 🧪 E2E Test Suites

| Test Suite | Coverage | Priority |
|------------|----------|----------|
| [e2e/01-dashboard.spec.ts](./e2e/01-dashboard.spec.ts) | Dashboard & check-in | 🔴 P0 |
| [e2e/02-campaigns.spec.ts](./e2e/02-campaigns.spec.ts) | Pipedrive sync & campaigns | 🔴 P0 |
| [e2e/03-call-screen.spec.ts](./e2e/03-call-screen.spec.ts) | AI call screen & STT | 🔴 P0 |
| [e2e/04-analytics.spec.ts](./e2e/04-analytics.spec.ts) | Analytics & reporting | 🟡 P1 |
| [e2e/05-settings.spec.ts](./e2e/05-settings.spec.ts) | Settings & config | 🟡 P1 |
| [e2e/06-navigation.spec.ts](./e2e/06-navigation.spec.ts) | Navigation & errors | 🔴 P0 |

---

## 🎯 Quick Commands Reference

### Testing
```bash
# Run all tests
npx playwright test

# Run with UI
npx playwright test --headed

# Run specific test
npx playwright test e2e/01-dashboard.spec.ts

# Debug mode
npx playwright test --debug

# View report
npx playwright show-report
```

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment
```bash
# Deploy backend (Supabase)
supabase functions deploy make-server-139017f8

# Deploy frontend (Vercel)
vercel --prod
```

---

## 📊 Documentation Structure

```
echo-telesales-os/
│
├── 📋 Launch & Production
│   ├── LAUNCH_SUMMARY.md ⭐ (Start here for launch prep)
│   ├── PRODUCTION_CHECKLIST.md
│   └── DEPLOYMENT.md
│
├── 🧪 Testing
│   ├── TESTING.md
│   ├── MANUAL_TESTING_GUIDE.md
│   ├── BUG_TRACKER.md
│   └── e2e/
│       ├── 01-dashboard.spec.ts
│       ├── 02-campaigns.spec.ts
│       ├── 03-call-screen.spec.ts
│       ├── 04-analytics.spec.ts
│       ├── 05-settings.spec.ts
│       └── 06-navigation.spec.ts
│
├── 📖 General
│   ├── README.md ⭐ (Main documentation)
│   └── DOCUMENTATION_INDEX.md (This file)
│
├── 🔧 Configuration
│   ├── playwright.config.ts
│   ├── package.json
│   └── .gitignore
│
└── 💻 Application Code
    ├── App.tsx
    ├── components/
    ├── supabase/
    └── styles/
```

---

## 🔄 Typical Workflow

### 1. Initial Setup (Developer)
```
README.md
↓
Install dependencies
↓
Configure environment variables
↓
Start development
```

### 2. Testing Phase (QA)
```
LAUNCH_SUMMARY.md
↓
TESTING.md (automated tests)
↓
MANUAL_TESTING_GUIDE.md (manual scenarios)
↓
BUG_TRACKER.md (log issues)
↓
Fix bugs → Re-test
```

### 3. Production Prep (All)
```
PRODUCTION_CHECKLIST.md
↓
Complete all sections
↓
Get sign-offs
↓
Review BUG_TRACKER.md (zero P0/P1)
↓
Ready for deployment
```

### 4. Deployment (DevOps)
```
DEPLOYMENT.md
↓
Deploy backend
↓
Deploy frontend
↓
Configure environment
↓
Run smoke tests
↓
Enable monitoring
↓
✅ LAUNCH!
```

### 5. Post-Launch (All)
```
Monitor errors
↓
Check performance
↓
Review user feedback
↓
Update BUG_TRACKER.md
↓
Iterate and improve
```

---

## 📝 Document Maintenance

### When to Update

| Document | Update Frequency | Trigger |
|----------|------------------|---------|
| README.md | On major changes | New features, tech changes |
| TESTING.md | On test changes | New test suites, tools |
| BUG_TRACKER.md | Daily/Weekly | New bugs, bug fixes |
| PRODUCTION_CHECKLIST.md | Before each launch | Process improvements |
| DEPLOYMENT.md | On infra changes | New hosting, CI/CD |
| LAUNCH_SUMMARY.md | Before launch | Status updates |

### Document Owners

| Document Category | Owner | Reviewers |
|-------------------|-------|-----------|
| Launch & Production | Product Owner | Dev, QA |
| Testing | QA Lead | Dev |
| General | Tech Lead | All |
| Configuration | DevOps | Dev |

---

## 🆘 Help & Support

### Need Help Finding Something?

**Want to...**
- ✅ **Run tests?** → [TESTING.md](./TESTING.md)
- 🐛 **Report a bug?** → [BUG_TRACKER.md](./BUG_TRACKER.md)
- 🚀 **Deploy app?** → [DEPLOYMENT.md](./DEPLOYMENT.md)
- 📋 **Check launch readiness?** → [LAUNCH_SUMMARY.md](./LAUNCH_SUMMARY.md)
- 📖 **Understand project?** → [README.md](./README.md)
- 🧪 **Do manual testing?** → [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)
- ✅ **Pre-launch checklist?** → [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

### Can't Find What You Need?

1. Check this index
2. Use search: `Ctrl+Shift+F` (VS Code)
3. Check inline code comments
4. Ask team lead

---

## 📊 Documentation Status

| Document | Complete | Reviewed | Last Updated |
|----------|----------|----------|--------------|
| README.md | ✅ | 🟡 | Dec 2024 |
| TESTING.md | ✅ | 🟡 | Dec 2024 |
| MANUAL_TESTING_GUIDE.md | ✅ | 🟡 | Dec 2024 |
| BUG_TRACKER.md | ✅ | 🟡 | Dec 2024 |
| PRODUCTION_CHECKLIST.md | ✅ | 🟡 | Dec 2024 |
| DEPLOYMENT.md | ✅ | 🟡 | Dec 2024 |
| LAUNCH_SUMMARY.md | ✅ | 🟡 | Dec 2024 |
| DOCUMENTATION_INDEX.md | ✅ | 🟡 | Dec 2024 |

**Legend**: ✅ Done | 🟡 Needs Review | 🔴 Incomplete

---

## 🎓 For New Team Members

### Onboarding Checklist

**Day 1**:
- [ ] Read [README.md](./README.md)
- [ ] Setup development environment
- [ ] Run `npm install` and `npm run dev`
- [ ] Run E2E tests: `npx playwright test`

**Day 2-3**:
- [ ] Read [TESTING.md](./TESTING.md)
- [ ] Run manual tests from [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)
- [ ] Review [BUG_TRACKER.md](./BUG_TRACKER.md)
- [ ] Understand AI caching implementation

**Day 4-5**:
- [ ] Read [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- [ ] Read [DEPLOYMENT.md](./DEPLOYMENT.md)
- [ ] Shadow a deployment (if possible)
- [ ] Contribute first bug fix or feature

**Week 2+**:
- [ ] Participate in testing cycle
- [ ] Help with documentation updates
- [ ] Contribute to E2E test suite
- [ ] Full stack development tasks

---

## 📞 Contacts & Resources

### Internal
- **Tech Lead**: [Name] - [Email/Slack]
- **QA Lead**: [Name] - [Email/Slack]
- **DevOps**: [Name] - [Email/Slack]
- **Product Owner**: [Name] - [Email/Slack]

### External Resources
- **Supabase Docs**: https://supabase.com/docs
- **Playwright Docs**: https://playwright.dev
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com

### Project Links
- **Repository**: [GitHub URL]
- **Production**: [Production URL]
- **Staging**: [Staging URL]
- **Supabase Dashboard**: [Supabase URL]
- **Vercel Dashboard**: [Vercel URL]

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial documentation suite created |

---

## ✅ Documentation Completeness

**Coverage**:
- ✅ Development setup
- ✅ Testing (automated + manual)
- ✅ Bug tracking
- ✅ Production checklist
- ✅ Deployment process
- ✅ Launch preparation
- ✅ Configuration
- ✅ Architecture overview

**All areas covered!** ✨

---

**📚 Happy reading! If you're preparing for launch, start with [LAUNCH_SUMMARY.md](./LAUNCH_SUMMARY.md)**

---

*Last Updated*: December 2024  
*Maintained by*: [Your Team]  
*Version*: 1.0.0
