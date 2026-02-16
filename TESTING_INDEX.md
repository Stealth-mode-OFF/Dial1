# Manual Testing - Complete Documentation Index

## 📚 Overview

This repository contains comprehensive manual testing documentation for the Echo Dialer application. This index helps you navigate all testing resources.

---

## 🎯 I Want To...

### "I need to test the app RIGHT NOW" ⚡
**→ Start here:** `QUICK_TEST_CHECKLIST.md`  
**Time:** 30 minutes  
**What:** Critical features only, rapid validation

### "I need comprehensive testing for production" 🏢
**→ Start here:** `MANUAL_TEST_EXECUTION_REPORT.md`  
**Time:** 2 hours  
**What:** Detailed test scenarios with full documentation

### "I need to understand how to test" 📖
**→ Start here:** `MANUAL_TESTING_README.md`  
**Time:** 5 minutes read  
**What:** Quick start guide and overview

### "I need to test manually across browsers" 🌐
**→ Start here:** `src/MANUAL_TESTING_GUIDE.md`  
**Time:** 75 minutes  
**What:** Original comprehensive testing guide

---

## 📄 Document Reference

### Primary Testing Documents

| Document | Purpose | Time | Priority |
|----------|---------|------|----------|
| **MANUAL_TESTING_README.md** | Quick start & overview | 5 min read | ⭐⭐⭐ Start here |
| **QUICK_TEST_CHECKLIST.md** | Rapid critical testing | 30 min | ⭐⭐⭐ Most useful |
| **MANUAL_TEST_EXECUTION_REPORT.md** | Comprehensive testing | 2 hours | ⭐⭐ Production ready |
| **src/MANUAL_TESTING_GUIDE.md** | Original detailed guide | 75 min | ⭐ Reference |

### Configuration & Setup

| Document | Purpose |
|----------|---------|
| **.env.example** | Environment variables template |
| **BACKEND_SETUP.md** | Backend configuration guide |
| **BACKEND_CHECKLIST.md** | Backend setup checklist |
| **src/ARCHITECTURE.md** | System architecture |

### Deployment & Production

| Document | Purpose |
|----------|---------|
| **PRODUCTION_CHECKLIST.md** | Pre-production validation |
| **DEPLOYMENT_READY.md** | Deployment guidelines |
| **src/TESTING.md** | Automated testing info |

---

## 🛠️ Testing Tools & Scripts

### Automated Connection Tests

```bash
# Test Supabase database connection
npm run test:supabase
→ Validates: Connection, tables, data operations
→ File: scripts/test-supabase.mjs

# Test Pipedrive API connection
npm run test:pipedrive
→ Validates: Auth, activities, contacts, filtering
→ File: scripts/test-pipedrive.mjs

# Test all connections at once
npm run test:connections
→ Runs both Supabase and Pipedrive tests
```

### Interactive Testing Assistant

```bash
# Run interactive testing menu
npm run test:manual
# OR
bash scripts/manual-test.sh

→ Features:
  - Environment validation
  - Dependency checking
  - Connection testing
  - Dev server launcher
  - Documentation viewer
```

### Automated E2E Tests

```bash
# Run Playwright E2E tests
npm run test:e2e

→ Test files:
  - src/e2e/01-dashboard.spec.ts
  - src/e2e/02-live-campaigns.spec.ts
  - src/e2e/03-dialer-call.spec.ts
  - src/e2e/04-intelligence.spec.ts
  - src/e2e/05-configuration.spec.ts
  - src/e2e/06-navigation.spec.ts
```

---

## 🧪 Test Coverage Matrix

| Feature | Quick Test | Full Test | E2E Test | Manual Guide |
|---------|------------|-----------|----------|--------------|
| **Import Leads** | ✅ Test 1 | ✅ TS-001 | ✅ 02-campaigns | ✅ Scenario 3 |
| **Dialing** | ✅ Test 2 | ✅ TS-002 | ✅ 03-dialer | ✅ Scenario 1 |
| **Pipedrive Sync** | ✅ Test 3 | ✅ TS-003 | ✅ 02-campaigns | ✅ Scenario 3 |
| **Supabase Data** | ✅ Test 4 | ✅ TS-004 | ✅ 01-dashboard | ✅ Scenario 1 |
| **Google Meet** | ✅ Test 5 | ✅ TS-005 | ⚠️ Manual only | ⚠️ Not covered |
| **Done Activities** | ✅ Test 6 | ✅ TS-006 | ⚠️ Manual only | ✅ Scenario 3 |
| **Energy System** | ⚠️ Partial | ⚠️ In TS-002 | ⚠️ Manual only | ✅ Scenario 4 |
| **Speech-to-Text** | ⚠️ Manual | ⚠️ In TS-002 | ⚠️ Manual only | ✅ Scenario 2 |
| **Cross-browser** | ❌ | ❌ | ❌ | ✅ Scenario 6 |
| **Mobile** | ❌ | ❌ | ❌ | ✅ Scenario 5 |

Legend:
- ✅ Fully covered
- ⚠️ Partially covered or manual only
- ❌ Not covered in this document

---

## 🚀 Getting Started

### Step 1: Choose Your Testing Approach

**For Quick Validation (30 min):**
```bash
# 1. Setup
cp .env.example .env && nano .env

# 2. Test connections
npm run test:connections

# 3. Start app
npm run dev

# 4. Follow QUICK_TEST_CHECKLIST.md
```

**For Comprehensive Testing (2 hours):**
```bash
# 1. Read overview
cat MANUAL_TESTING_README.md

# 2. Setup environment
cp .env.example .env && nano .env
npm install

# 3. Test connections
npm run test:connections

# 4. Start testing
npm run dev
# Follow MANUAL_TEST_EXECUTION_REPORT.md
```

**For Automated Testing:**
```bash
# 1. Install Playwright
npx playwright install

# 2. Run tests
npm run test:e2e

# 3. View report
npx playwright show-report
```

---

## 📋 Test Scenario Reference

### Quick Test Checklist (30 min)

1. **Import of Leads** (5 min) - Pipedrive sync
2. **Dialing** (10 min) - Call workflow & energy system
3. **Pipedrive Connection** (5 min) - API validation
4. **Supabase Connection** (5 min) - Data persistence
5. **Google Meet** (3 min) - OAuth & meetings
6. **Done Activities** (2 min) - Status sync

### Full Test Execution (2 hours)

1. **TS-001: Import of Leads** (10 min)
2. **TS-002: Dialing Functionality** (15 min)
3. **TS-003: Pipedrive Connection** (15 min)
4. **TS-004: Supabase Connection** (15 min)
5. **TS-005: Google Meet Connection** (20 min)
6. **TS-006: Done Activities Check** (10 min)

### Manual Testing Guide Scenarios (75 min)

1. **Complete User Journey** (15 min)
2. **Speech-to-Text** (10 min)
3. **Real Pipedrive Sync** (5 min)
4. **Energy Drain System** (20 min)
5. **Mobile Device Testing** (10 min)
6. **Cross-Browser Testing** (15 min)

---

## 🐛 Issue Tracking

### Where to Report Issues

- **During Testing:** Document in test report section
- **Bug Tracking:** Use `BUG_TRACKER.md`
- **GitHub Issues:** Create for each confirmed bug

### Issue Priority Levels

- **P0 (Critical):** App crashes, data loss, security → BLOCK LAUNCH
- **P1 (High):** Major feature broken → FIX BEFORE LAUNCH
- **P2 (Medium):** Minor bug, workaround exists → CAN LAUNCH
- **P3 (Low):** Cosmetic, nice-to-have → POST-LAUNCH

---

## 📊 Test Metrics & Reporting

### Key Metrics to Track

- Total tests executed
- Pass/Fail/Blocked count
- Critical bugs found (P0/P1)
- Test coverage percentage
- Time taken per scenario

### Test Report Templates

Available in each testing document:
- `QUICK_TEST_CHECKLIST.md` → Section: Test Summary
- `MANUAL_TEST_EXECUTION_REPORT.md` → Section: Test Metrics
- `src/MANUAL_TESTING_GUIDE.md` → Section: Testing Checklist Summary

---

## 🔧 Troubleshooting

### Common Setup Issues

**Problem:** Dependencies won't install  
**Solution:** Check network, try `npm cache clean --force`

**Problem:** Supabase connection fails  
**Solution:** Run `npm run test:supabase` for diagnostics

**Problem:** Pipedrive sync returns no data  
**Solution:** Run `npm run test:pipedrive` to validate API

**Problem:** App won't start  
**Solution:** Check `.env` file, verify Node.js version 18+

### Testing Issues

**Problem:** Can't complete Test 1 (Import Leads)  
**Solution:** Ensure activities scheduled TODAY in Pipedrive

**Problem:** Speech-to-text doesn't work  
**Solution:** Use Chrome/Edge, grant mic permissions

**Problem:** Energy system not decreasing  
**Solution:** Must complete 3+ calls, check energy counter

---

## 📞 Support Resources

### Documentation
- **Architecture:** `src/ARCHITECTURE.md`
- **Backend Setup:** `BACKEND_SETUP.md`
- **Deployment:** `DEPLOYMENT_READY.md`
- **API Reference:** `src/SUPABASE_PIPEDRIVE_SETUP.md`

### Scripts & Tools
- **Testing Assistant:** `scripts/manual-test.sh`
- **Connection Tests:** `scripts/test-*.mjs`
- **Health Check:** `scripts/health-check.js`

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Pipedrive API Docs](https://developers.pipedrive.com)
- [Playwright Testing](https://playwright.dev)

---

## ✅ Pre-Testing Checklist

Before you start testing, ensure:

- [ ] Node.js 18+ installed
- [ ] npm dependencies installed
- [ ] .env file configured with:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] PIPEDRIVE_API_KEY
  - [ ] OPENAI_API_KEY (for AI features)
- [ ] Supabase project active with tables
- [ ] Pipedrive account with test data
- [ ] Test activities scheduled for today
- [ ] Browser DevTools open (F12)

---

## 🎯 Success Criteria

Testing is complete when:

✅ All test scenarios executed  
✅ Results documented in test report  
✅ All P0 bugs fixed or documented  
✅ All P1 bugs triaged  
✅ Connection tests pass  
✅ E2E tests pass (if applicable)  
✅ Sign-off received from stakeholders  

---

## 📅 Testing Schedule Recommendation

### Day 1: Setup & Quick Validation (1 hour)
- Environment setup
- Connection testing
- Quick test checklist execution

### Day 2: Comprehensive Testing (3 hours)
- Full test execution report
- Issue documentation
- Initial bug fixes

### Day 3: Validation & Sign-off (2 hours)
- Re-test critical paths
- Cross-browser testing
- Final report & sign-off

---

## 📝 Quick Command Reference

```bash
# Setup
cp .env.example .env
npm install

# Development
npm run dev                  # Start dev server
npm run build               # Build for production
npm run typecheck           # Check TypeScript

# Testing
npm run test:e2e            # Run E2E tests
npm run test:supabase       # Test Supabase
npm run test:pipedrive      # Test Pipedrive
npm run test:connections    # Test all connections
npm run test:manual         # Testing assistant

# Utilities
npm run health              # Health check
```

---

## 📖 Version History

- **v1.0** (2026-02-02): Initial comprehensive testing documentation
  - Created Quick Test Checklist
  - Created Full Test Execution Report
  - Created Manual Testing README
  - Added automated connection tests
  - Added interactive testing assistant

---

**Need help?** Start with `MANUAL_TESTING_README.md` for a quick overview!

**Ready to test?** Follow `QUICK_TEST_CHECKLIST.md` for rapid validation!

**Need comprehensive testing?** Use `MANUAL_TEST_EXECUTION_REPORT.md`!

---

**Last Updated:** 2026-02-02  
**Maintained By:** Development Team  
**For Questions:** See support resources above
