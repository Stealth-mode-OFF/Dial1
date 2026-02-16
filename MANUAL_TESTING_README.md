# Manual Testing Guide - Quick Start

Welcome! This guide will help you perform comprehensive manual testing of the Echo Dialer application.

## 🎯 What This Testing Covers

This manual testing session will verify:
1. ✅ **Import of Leads** - Syncing contacts from Pipedrive
2. ✅ **Dialing** - Core calling functionality and workflow
3. ✅ **Pipedrive Connection** - CRM integration and bidirectional sync
4. ✅ **Supabase Connection** - Database connectivity and data persistence
5. ✅ **Google Meet Connection** - Meeting scheduling and coaching features
6. ✅ **Pipedrive Done Activities** - Activity status tracking and sync

## 🚀 Quick Start (3 Steps)

### Step 1: Environment Setup (5 minutes)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit with your credentials
# Add your Supabase URL, keys, and Pipedrive API token
nano .env  # or use any text editor

# 3. Install dependencies (if not already installed)
npm install
```

### Step 2: Run Connection Tests (2 minutes)

Before starting manual testing, verify your connections:

```bash
# Test Supabase connection
npm run test:supabase

# Test Pipedrive connection
npm run test:pipedrive

# Or test both at once
npm run test:connections
```

If these tests pass, you're ready for manual testing! ✅

### Step 3: Start Testing (30 minutes)

```bash
# Start the application
npm run dev

# In another terminal, run the testing assistant
npm run test:manual
# OR
bash scripts/manual-test.sh
```

Then open `http://localhost:5173` in your browser and follow the checklist!

## 📋 Testing Documentation

We've prepared three levels of testing documentation:

### 1. **Quick Test Checklist** ⚡ (30 min)
**File:** `QUICK_TEST_CHECKLIST.md`

For rapid testing of critical features. Use this when:
- You need quick validation
- Time is limited
- Testing before a demo
- Smoke testing after changes

### 2. **Detailed Test Execution Report** 📊 (2 hours)
**File:** `MANUAL_TEST_EXECUTION_REPORT.md`

Comprehensive testing with detailed steps. Use this when:
- Preparing for production
- Full QA validation needed
- Documenting for stakeholders
- Creating a test baseline

### 3. **Existing Manual Testing Guide** 📖
**File:** `src/MANUAL_TESTING_GUIDE.md`

Original testing guide with scenarios. Use this for:
- Understanding test methodology
- Cross-browser testing
- Performance testing
- Accessibility testing

## 🛠️ Available Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run typecheck        # Check TypeScript errors

# Testing
npm run test:e2e         # Run automated E2E tests
npm run test:supabase    # Test Supabase connection
npm run test:pipedrive   # Test Pipedrive connection
npm run test:connections # Test all connections
npm run test:manual      # Run manual testing assistant
npm run health           # Health check (if available)

# Helper scripts
bash scripts/manual-test.sh  # Interactive testing menu
```

## 📊 Test Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Setup Environment (.env configuration)                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Test Connections (npm run test:connections)             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Start Application (npm run dev)                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Follow Quick Test Checklist                             │
│     - Import Leads                                          │
│     - Test Dialing                                          │
│     - Verify Pipedrive Sync                                 │
│     - Check Supabase Persistence                            │
│     - Test Google Meet (if configured)                      │
│     - Verify Done Activities                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Document Issues (in test report)                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Fix Critical Issues                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Re-test & Validate Fixes                                │
└─────────────────────────────────────────────────────────────┘
```

## 🎓 Testing Tips

### Before You Start
- ✅ Ensure you have test data in Pipedrive (5+ contacts with today's activities)
- ✅ Use Chrome or Edge for speech-to-text testing
- ✅ Keep browser DevTools open (F12) to monitor console errors
- ✅ Take screenshots of issues for documentation

### During Testing
- 🔍 Check browser console for JavaScript errors
- 🔍 Monitor Network tab for failed API calls
- 🔍 Verify data accuracy between systems
- 🔍 Test both happy paths and edge cases
- 🔍 Document every issue immediately

### Common Issues & Solutions

#### Issue: npm install fails
**Solution:** 
```bash
# Try clearing npm cache
npm cache clean --force
npm install

# Or use different registry
npm install --registry https://registry.npmjs.org/
```

#### Issue: Supabase connection fails
**Solution:**
- Verify .env credentials are correct
- Check Supabase project is active in dashboard
- Ensure tables are created (run migrations)
- Check Row Level Security policies

#### Issue: Pipedrive sync returns no contacts
**Solution:**
- Verify API key is valid
- Check that activities are scheduled for TODAY
- Ensure contacts have phone numbers/emails
- Try syncing from Pipedrive dashboard first

#### Issue: Speech-to-text doesn't work
**Solution:**
- Must use Chrome or Edge (not Firefox/Safari)
- Ensure using HTTPS or localhost
- Grant microphone permissions
- Check system microphone settings

## 📁 Test Artifacts

All test results should be saved in `/test-results/`:

```
test-results/
├── screenshots/          # Screenshots of issues
├── console-logs/         # Browser console outputs
├── network-traces/       # HAR files of API calls
└── test-report.md        # Final test report
```

## 🎯 Success Criteria

Your testing session is successful when:

✅ All 6 test scenarios pass (or issues documented)  
✅ No P0 (critical) bugs found  
✅ All API connections verified  
✅ Data syncs correctly between systems  
✅ No console errors during normal usage  
✅ Test report completed with findings  

## 📞 Need Help?

- **Setup Issues**: Check `BACKEND_SETUP.md`
- **Architecture Questions**: See `src/ARCHITECTURE.md`
- **Deployment Info**: Review `DEPLOYMENT_READY.md`
- **Bug Tracking**: Use `BUG_TRACKER.md`

## 📝 Test Report Template

After testing, fill in your results:

```markdown
# Test Session Report

**Date:** [Date]
**Tester:** [Your Name]
**Duration:** [Time taken]
**Browser:** [Chrome/Firefox/Safari/Edge]

## Test Results
- Import of Leads: ✅ PASS / ❌ FAIL
- Dialing: ✅ PASS / ❌ FAIL
- Pipedrive Connection: ✅ PASS / ❌ FAIL
- Supabase Connection: ✅ PASS / ❌ FAIL
- Google Meet: ✅ PASS / ❌ FAIL / ⏭️ SKIP
- Done Activities: ✅ PASS / ❌ FAIL

## Issues Found
[List all issues with severity P0/P1/P2/P3]

## Recommendations
[Your recommendations for fixes or improvements]

## Ready for Production?
[ ] YES  [ ] NO  [ ] WITH CAVEATS

[Explain decision]
```

---

## 🚀 Ready to Start?

1. ✅ Environment configured?
2. ✅ Connections tested?
3. ✅ Application running?
4. ✅ Browser open to http://localhost:5173?
5. ✅ DevTools open (F12)?

**Then let's go!** 🎉

Open `QUICK_TEST_CHECKLIST.md` and start with Test 1: Import of Leads.

Good luck! 🍀

---

**Last Updated:** 2026-02-02  
**Version:** 1.0  
**Estimated Time:** 30-120 minutes depending on test depth
