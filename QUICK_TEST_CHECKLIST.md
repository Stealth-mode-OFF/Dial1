# Quick Start Manual Testing Checklist

## 🚀 Quick Setup (5 minutes)

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

**Required credentials:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `PIPEDRIVE_API_KEY` - Your Pipedrive API token
- `OPENAI_API_KEY` - Your OpenAI API key (for AI features)

### 2. Install & Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Open Application
Navigate to: `http://localhost:5173`

---

## ✅ Critical Test Checklist (30 minutes)

### Test 1: Import of Leads (5 min) ⭐ CRITICAL

**Prerequisites:**
- Pipedrive account with 5+ test contacts
- Activities scheduled for today

**Steps:**
1. [ ] Open application → Navigate to "Live Campaigns"
2. [ ] Click "Sync Pipedrive CRM" button
3. [ ] Wait for sync (max 10 sec)
4. [ ] **VERIFY:** Contact list populates with names & companies
5. [ ] **VERIFY:** Contact count matches today's activities in Pipedrive
6. [ ] **VERIFY:** No console errors (F12 → Console tab)

**✅ Pass if:** Contacts load successfully, data accurate, no errors  
**❌ Fail if:** Sync fails, wrong contacts, missing data, errors

**Screenshot required:** Contact list after sync

---

### Test 2: Dialing Functionality (10 min) ⭐ CRITICAL

**Prerequisites:**
- Test 1 completed successfully
- At least 3 contacts in queue

**Steps:**
1. [ ] Click on first contact in list
2. [ ] **VERIFY:** Call screen loads with contact details
3. [ ] **VERIFY:** AI analysis displays (Win Probability, Signals)
4. [ ] Click "Start Call" button
5. [ ] **VERIFY:** Call timer starts
6. [ ] Add manual notes in text area
7. [ ] Click "Next Contact" or "Complete"
8. [ ] **VERIFY:** Navigate to next contact
9. [ ] Repeat for 3 calls total
10. [ ] **VERIFY:** Energy level decreases to "Medium"

**✅ Pass if:** All calls complete, energy decreases, notes save  
**❌ Fail if:** Call screen broken, notes don't save, navigation fails

**Screenshot required:** Call screen with AI analysis visible

---

### Test 3: Pipedrive Connection (5 min) ⭐ CRITICAL

**Prerequisites:**
- Valid Pipedrive API key configured

**Steps:**
1. [ ] Open browser DevTools → Network tab
2. [ ] Trigger Pipedrive sync
3. [ ] **VERIFY:** API calls show 200 status codes
4. [ ] **VERIFY:** No API key visible in URL parameters
5. [ ] Compare 2 contacts with Pipedrive dashboard
6. [ ] **VERIFY:** Names match exactly
7. [ ] **VERIFY:** Companies match exactly
8. [ ] **VERIFY:** Phone numbers match

**✅ Pass if:** API calls successful, data accurate, secure  
**❌ Fail if:** API errors, data mismatch, exposed credentials

**Screenshot required:** Network tab showing successful API calls

---

### Test 4: Supabase Connection (5 min) ⭐ CRITICAL

**Prerequisites:**
- Supabase configured with tables created

**Steps:**
1. [ ] Complete a call (Test 2)
2. [ ] Navigate to Analytics screen
3. [ ] **VERIFY:** Call appears in call history
4. [ ] **VERIFY:** Stats update (calls today +1)
5. [ ] Open Supabase dashboard
6. [ ] Check "calls" table
7. [ ] **VERIFY:** New call record exists
8. [ ] Refresh browser (F5)
9. [ ] **VERIFY:** Data persists after reload

**✅ Pass if:** Data saves to Supabase, persists after refresh  
**❌ Fail if:** Data not saving, lost after refresh, errors

**Screenshot required:** Analytics showing call history

---

### Test 5: Google Meet Connection (3 min) ⚠️ OPTIONAL

**Prerequisites:**
- Google OAuth configured

**Steps:**
1. [ ] Navigate to Configuration/Settings
2. [ ] Find Google Meet integration section
3. [ ] Click "Connect Google" (if available)
4. [ ] **VERIFY:** OAuth flow initiates
5. [ ] Sign in and grant permissions
6. [ ] **VERIFY:** Returns to app with "Connected" status
7. [ ] Schedule a test meeting (if feature available)
8. [ ] **VERIFY:** Meet link generated

**✅ Pass if:** OAuth works, meeting created  
**❌ Fail if:** OAuth fails, no meeting created  
**⏭️ Skip if:** Feature not yet implemented

**Screenshot required:** Connected status or OAuth screen

---

### Test 6: Pipedrive Done Activities (2 min) ⭐ CRITICAL

**Prerequisites:**
- Test 3 completed successfully

**Steps:**
1. [ ] Complete a call in application
2. [ ] Mark activity as "Done"
3. [ ] Open Pipedrive dashboard
4. [ ] Find the corresponding activity
5. [ ] **VERIFY:** Activity marked as "Done" in Pipedrive
6. [ ] In Pipedrive, manually mark another activity "Done"
7. [ ] In app, trigger sync
8. [ ] **VERIFY:** Completed activity removed from queue

**✅ Pass if:** Status syncs both directions correctly  
**❌ Fail if:** Status doesn't sync, activity stays in queue

**Screenshot required:** Pipedrive showing "Done" activity

---

## 🐛 Issue Reporting Template

If you find any issues, document them here:

```
Issue #1
--------
Severity: [ ] P0-Critical  [ ] P1-High  [ ] P2-Medium  [ ] P3-Low
Title: [Short description]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected: [What should happen]
Actual: [What actually happened]
Screenshot: [Path to screenshot]
Console Errors: [Any JavaScript errors from console]
Status: [ ] Open  [ ] Fixed  [ ] Won't Fix
```

---

## 📊 Test Summary

**Date Tested:** _______________  
**Tester:** _______________  
**Browser:** _______________  
**Time Taken:** _______________

### Results
- [ ] Test 1: Import of Leads - **PASS** / **FAIL** / **BLOCKED**
- [ ] Test 2: Dialing - **PASS** / **FAIL** / **BLOCKED**
- [ ] Test 3: Pipedrive Connection - **PASS** / **FAIL** / **BLOCKED**
- [ ] Test 4: Supabase Connection - **PASS** / **FAIL** / **BLOCKED**
- [ ] Test 5: Google Meet - **PASS** / **FAIL** / **SKIP**
- [ ] Test 6: Done Activities - **PASS** / **FAIL** / **BLOCKED**

### Overall Assessment
- **Critical Issues Found:** _______
- **Total Issues Found:** _______
- **Ready for Production:** [ ] YES  [ ] NO  [ ] WITH CAVEATS

### Notes
```
[Add any additional notes, observations, or recommendations]
```

---

## 🎯 Next Steps

### If All Tests Pass ✅
1. Run full E2E test suite: `npm run test:e2e`
2. Performance testing (Lighthouse audit)
3. Security audit
4. Deploy to staging
5. Final production validation

### If Tests Fail ❌
1. Document all issues in MANUAL_TEST_EXECUTION_REPORT.md
2. Prioritize fixes (P0 first, then P1)
3. Create GitHub issues for each bug
4. Fix critical issues
5. Re-test after fixes

### If Tests Blocked 🚫
1. Identify blocking issues (missing credentials, API down, etc.)
2. Resolve blockers
3. Re-run tests from the beginning

---

## 📞 Support

**Need Help?**
- Review detailed guide: `MANUAL_TEST_EXECUTION_REPORT.md`
- Check setup docs: `BACKEND_SETUP.md`
- Review architecture: `src/ARCHITECTURE.md`
- Run helper script: `./scripts/manual-test.sh`

**Common Issues:**

**Issue:** npm install fails with ENOTFOUND  
**Solution:** Check internet connection, try npm registry mirror

**Issue:** Supabase connection fails  
**Solution:** Verify .env credentials, check Supabase project status

**Issue:** Pipedrive sync returns no contacts  
**Solution:** Verify API key, check if activities scheduled for today

**Issue:** Speech-to-text doesn't work  
**Solution:** Use Chrome/Edge browser, ensure HTTPS or localhost

---

## 📝 Testing Tips

1. **Always check browser console** - Most issues show up there first
2. **Test in incognito mode** - Eliminates cache/extension issues
3. **Use Chrome DevTools Network tab** - Monitor all API calls
4. **Take screenshots of issues** - Visual proof helps debugging
5. **Document exact steps** - Makes issues reproducible
6. **Test happy path first** - Then test edge cases
7. **Don't skip blocked tests** - They often reveal critical issues

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-02  
**Estimated Time:** 30 minutes for full checklist
