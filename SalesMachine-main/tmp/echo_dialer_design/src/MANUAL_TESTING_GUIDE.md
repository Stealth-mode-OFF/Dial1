# Manual Testing Guide - Echo Telesales OS

> Tento dokument popisuje **manuální testovací scénáře**, které nelze plně automatizovat. Použijte tento checklist před production nasazením.

---

## 🎯 Test Scenarios Overview

| Scenario | Priority | Time Required | Browser Specific |
|----------|----------|---------------|------------------|
| Complete User Journey | P0 | 15 min | No |
| Speech-to-Text | P0 | 10 min | Chrome/Edge only |
| Real Pipedrive Sync | P0 | 5 min | No |
| Energy Drain Over Time | P1 | 20 min | No |
| Mobile Device Testing | P0 | 10 min | iOS/Android |
| Cross-Browser | P1 | 15 min | All |

**Total Estimated Time**: ~75 minutes

---

## 📋 Pre-Testing Setup

### Environment
- [ ] Application running on staging/production URL
- [ ] Valid Pipedrive API key configured
- [ ] Valid OpenAI API key configured
- [ ] Test Pipedrive account with at least 10 contacts
- [ ] Contacts have activities scheduled for today

### Devices to Test
- [ ] Desktop (Windows or Mac)
- [ ] iPhone (real device, not simulator)
- [ ] Android phone (real device, not simulator)
- [ ] iPad or Android tablet

### Browsers to Test
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## ✅ Test Scenario 1: Complete User Journey (P0)

**Goal**: Verify entire flow from start to finish without errors

**Time**: ~15 minutes

### Steps:

1. **Open Application**
   - [ ] Navigate to application URL
   - [ ] Dashboard loads successfully
   - [ ] No console errors (F12 → Console tab)

2. **Complete Check-In**
   - [ ] Click "Začít den" or Check-In button
   - [ ] Modal appears
   - [ ] Select energy level: "High"
   - [ ] Select mood: "Good"
   - [ ] Click "Potvrdit"
   - [ ] Modal closes
   - [ ] Energy indicator visible in header

3. **Navigate to Campaigns**
   - [ ] Click "Kampaně" in navigation
   - [ ] Campaigns screen loads

4. **Sync Pipedrive**
   - [ ] Click "Sync Pipedrive CRM" button
   - [ ] Loading indicator appears
   - [ ] Contacts list populates (wait up to 10s)
   - [ ] Verify contact count > 0
   - [ ] Contacts show name and company

5. **Check AI Analysis**
   - [ ] Wait 15-30 seconds
   - [ ] First contact should show AI signal/summary
   - [ ] Win Probability displays (not all 75%)
   - [ ] Intent scores vary by contact

6. **Start Call**
   - [ ] Click on first contact's "Call" button
   - [ ] Call screen loads
   - [ ] "Analyzing..." state shows briefly
   - [ ] Transitions to "Ready" state
   - [ ] Contact info displays correctly

7. **Review AI Intelligence**
   - [ ] AI Summary visible
   - [ ] Hiring Signal displayed
   - [ ] Win Probability score shown
   - [ ] Personality Type shown
   - [ ] Battle Cards/advice visible

8. **Complete Call**
   - [ ] Add manual note in terminal/textarea
   - [ ] Fill in BANT fields (if visible)
   - [ ] Click "Next Contact" or "Finish"
   - [ ] Moves to next contact OR returns to list

9. **Check Analytics**
   - [ ] Navigate to Analytics
   - [ ] Graphs display without errors
   - [ ] Call log shows completed call
   - [ ] Stats update correctly

10. **Verify State Persistence**
    - [ ] Refresh browser (F5)
    - [ ] Navigate back to Campaigns
    - [ ] Contacts still loaded (not re-fetched)
    - [ ] AI data still present (cached)

### ✅ Expected Results:
- No JavaScript errors in console
- All screens load smoothly
- AI data persists after refresh
- Call is logged in analytics

### ❌ Common Issues to Watch For:
- Empty Win Probability scores
- Charts showing "negative dimension" error
- AI re-analyzing same contact on re-open
- Lost state after page refresh

---

## 🎤 Test Scenario 2: Speech-to-Text (P0)

**Goal**: Verify microphone input and real-time transcription

**Time**: ~10 minutes

**Browser**: Chrome or Edge only (Web Speech API)

### Steps:

1. **Setup**
   - [ ] Open application in Chrome/Edge
   - [ ] Navigate to call screen (follow Scenario 1 steps 1-6)

2. **Microphone Permission**
   - [ ] Look for microphone icon/button
   - [ ] Click to start recording
   - [ ] Browser prompts for microphone access
   - [ ] Click "Allow"

3. **Speech Recognition**
   - [ ] Speak clearly in Czech: "Dobrý den, volám ohledně Echo Pulse"
   - [ ] Wait 2-3 seconds
   - [ ] Transcript should appear in terminal/textarea
   - [ ] Text should be in Czech

4. **Continuous Recording**
   - [ ] Continue speaking for 30 seconds
   - [ ] Transcript updates in real-time
   - [ ] No lag or freezing

5. **Stop Recording**
   - [ ] Click stop button
   - [ ] Recording stops
   - [ ] Full transcript remains visible

6. **Manual Editing**
   - [ ] Click in transcript area
   - [ ] Edit text manually
   - [ ] Verify text is editable

### ✅ Expected Results:
- Microphone access granted
- Real-time transcription works
- Czech language recognized
- Transcript persists after stopping

### ❌ Common Issues:
- Microphone permission denied → Check browser settings
- No transcription appears → Check Web Speech API support
- Wrong language recognized → Verify Czech locale setting
- Transcript disappears → Check state management

### 🔧 Troubleshooting:
If speech-to-text doesn't work:
1. Check browser: Must be Chrome/Edge (not Firefox/Safari)
2. Check HTTPS: Must be https:// or localhost
3. Check permissions: chrome://settings/content/microphone
4. Try different microphone in system settings

---

## 🔄 Test Scenario 3: Real Pipedrive Sync (P0)

**Goal**: Verify actual Pipedrive API integration

**Time**: ~5 minutes

### Preparation:
1. Create test data in Pipedrive:
   - Add 3-5 contacts
   - Schedule activities for TODAY
   - Vary companies and contact details

### Steps:

1. **Initial Sync**
   - [ ] Clear browser cache/localStorage
   - [ ] Reload application
   - [ ] Navigate to Campaigns
   - [ ] Click "Sync Pipedrive"
   - [ ] Verify correct number of contacts loaded
   - [ ] Only contacts with today's activities appear

2. **Verify Contact Data**
   - [ ] Check contact names match Pipedrive
   - [ ] Check companies match Pipedrive
   - [ ] Check phone numbers present (if available)
   - [ ] Check email addresses present (if available)

3. **Verify Activity Filtering**
   - [ ] Only TODAY's activities loaded (not all contacts)
   - [ ] Overdue activities also included
   - [ ] Future activities NOT included

4. **Re-Sync Test**
   - [ ] Click sync again
   - [ ] Contacts reload
   - [ ] AI data NOT lost (cached data persists)
   - [ ] No duplicate contacts

5. **Error Handling**
   - [ ] In Pipedrive, temporarily disable API token
   - [ ] Try to sync in application
   - [ ] Error message displays
   - [ ] Application doesn't crash
   - [ ] Re-enable API token
   - [ ] Sync works again

### ✅ Expected Results:
- Only today's activities loaded
- Contact data accurate
- AI cache persists through re-sync
- Error states handled gracefully

### ❌ Common Issues:
- All contacts loaded (not just today) → Check filtering logic
- Missing contact details → Check Pipedrive data quality
- Sync fails silently → Check error logging
- Duplicates after re-sync → Check contact ID mapping

---

## ⚡ Test Scenario 4: Energy Drain System (P1)

**Goal**: Verify energy decreases after multiple calls

**Time**: ~20 minutes

### Steps:

1. **Start with High Energy**
   - [ ] Complete check-in with "High" energy
   - [ ] Note current energy indicator

2. **Complete 3 Calls**
   - [ ] Start first call, complete, click "Next"
   - [ ] Start second call, complete, click "Next"
   - [ ] Start third call, complete, click "Next"
   - [ ] Energy should drop to "Medium"

3. **Complete 3 More Calls**
   - [ ] Start fourth call, complete, click "Next"
   - [ ] Start fifth call, complete, click "Next"
   - [ ] Start sixth call, complete, click "Next"
   - [ ] Energy should drop to "Low"

4. **Verify Low Energy Mode**
   - [ ] Open next contact
   - [ ] Should show email draft interface (not call UI)
   - [ ] Email template auto-generates
   - [ ] Can edit email

5. **Take Break (Re-Check-In)**
   - [ ] Navigate back to Dashboard
   - [ ] Do check-in again with "High" energy
   - [ ] Energy resets to High
   - [ ] Counter resets

### ✅ Expected Results:
- Energy drops after every 3 calls
- Low energy triggers email mode
- Re-check-in resets energy
- Visual indicators update

### ❌ Common Issues:
- Energy doesn't decrease → Check handleNextContact logic
- Wrong thresholds (not 3 calls) → Check counter logic
- Email mode doesn't trigger → Check isLowEnergy prop
- Re-check-in doesn't reset → Check state management

---

## 📱 Test Scenario 5: Mobile Device Testing (P0)

**Goal**: Verify full functionality on mobile devices

**Time**: ~10 minutes per device

**Devices**: Real iPhone + Real Android phone

### Steps:

1. **Mobile Navigation**
   - [ ] Open site on mobile browser
   - [ ] Hamburger menu visible (if mobile view)
   - [ ] Menu opens smoothly
   - [ ] All screens accessible

2. **Touch Interactions**
   - [ ] Tap buttons → Responds immediately
   - [ ] Scroll lists → Smooth scrolling
   - [ ] Form inputs → Keyboard appears correctly
   - [ ] Modal dialogs → Can close with X or backdrop

3. **Responsive Layout**
   - [ ] No horizontal scroll
   - [ ] Text readable (not too small)
   - [ ] Buttons large enough to tap
   - [ ] Forms usable
   - [ ] Graphs display correctly

4. **Portrait vs. Landscape**
   - [ ] Rotate device to landscape
   - [ ] Layout adapts correctly
   - [ ] No broken UI elements
   - [ ] Rotate back to portrait
   - [ ] Works correctly again

5. **Mobile-Specific Features**
   - [ ] Phone number links open dialer (if tel: links)
   - [ ] Email links open mail app (if mailto: links)
   - [ ] Pinch to zoom disabled (if intended)

6. **Complete Mobile Journey**
   - [ ] Do check-in on mobile
   - [ ] Sync Pipedrive on mobile
   - [ ] Start call on mobile
   - [ ] View analytics on mobile
   - [ ] All functions work

### ✅ Expected Results:
- No horizontal scroll at any size
- All features accessible
- Touch targets large enough
- Smooth performance

### ❌ Common Issues:
- Horizontal scroll on small screens → Check min-widths
- Buttons too small to tap → Increase padding
- Text too small to read → Check font sizes
- Modals don't close → Check z-index and backdrop
- Slow performance → Check image sizes

---

## 🌐 Test Scenario 6: Cross-Browser Testing (P1)

**Goal**: Verify compatibility across browsers

**Time**: ~15 minutes total (~4 min per browser)

### Browsers:
1. Chrome
2. Firefox
3. Safari (Mac/iOS)
4. Edge

### For Each Browser:

1. **Basic Functionality**
   - [ ] Application loads
   - [ ] Dashboard displays correctly
   - [ ] Navigation works
   - [ ] Graphs render (if on Analytics)

2. **CSS & Layout**
   - [ ] Colors display correctly
   - [ ] Fonts load correctly
   - [ ] Spacing consistent
   - [ ] No layout shifts

3. **JavaScript Features**
   - [ ] Buttons clickable
   - [ ] Modals open/close
   - [ ] Forms submit
   - [ ] API calls work

4. **Known Browser Differences**
   - **Chrome/Edge**: ✅ Full Web Speech API
   - **Firefox**: ⚠️ No Web Speech API (show fallback)
   - **Safari**: ⚠️ No Web Speech API (show fallback)

### ✅ Expected Results:
- Core features work in all browsers
- Graceful degradation where APIs not supported
- No browser-specific bugs

### ❌ Common Issues:
- Styling different in Firefox → Check vendor prefixes
- Speech-to-text in Safari → Should show "not supported" message
- Graphs broken in older browsers → Check Recharts compatibility

---

## 📊 Performance Testing

### Load Time Benchmarks

Use Chrome DevTools (Network tab, disable cache):

1. **Dashboard First Load**
   - [ ] Full load < 3 seconds
   - [ ] First Contentful Paint < 1.5s
   - [ ] Time to Interactive < 3s

2. **Pipedrive Sync**
   - [ ] 10 contacts: < 3s
   - [ ] 50 contacts: < 10s
   - [ ] 100 contacts: < 20s

3. **AI Analysis**
   - [ ] First analysis: < 15s
   - [ ] Cached load: < 1s

4. **Charts Rendering**
   - [ ] Analytics screen: < 2s
   - [ ] No jank or freezing

### Network Throttling Test

1. **Slow 3G**
   - [ ] Open DevTools → Network tab
   - [ ] Select "Slow 3G" throttling
   - [ ] Reload application
   - [ ] Should still load (slower but functional)
   - [ ] Loading indicators visible
   - [ ] No timeouts

2. **Offline**
   - [ ] Open DevTools → Network tab
   - [ ] Select "Offline"
   - [ ] Reload application
   - [ ] Error message displays OR
   - [ ] Cached version works

---

## 🔒 Security Manual Checks

### Console Inspection

1. **Open DevTools Console**
   - [ ] No API keys visible in console logs
   - [ ] No password strings visible
   - [ ] No long hex tokens logged

2. **Network Tab**
   - [ ] Check API requests
   - [ ] No API keys in URL query params
   - [ ] All requests use HTTPS (if production)

3. **Application Tab (Storage)**
   - [ ] Check localStorage
   - [ ] No sensitive data stored
   - [ ] If storing tokens, they're encrypted

4. **Source Tab**
   - [ ] Check frontend source code
   - [ ] No hardcoded API keys
   - [ ] No sensitive strings

### Expected Secrets Location:
✅ **Server-side only**:
- `OPENAI_API_KEY`
- `PIPEDRIVE_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

✅ **Client-side OK**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (designed to be public)

---

## 📝 Testing Checklist Summary

### Before Production Launch

#### Automated Tests
- [ ] All Playwright tests pass
- [ ] No console errors during test run
- [ ] Test report reviewed

#### Manual Tests
- [ ] Complete User Journey (Scenario 1) ✅
- [ ] Speech-to-Text (Scenario 2) ✅
- [ ] Real Pipedrive Sync (Scenario 3) ✅
- [ ] Energy Drain System (Scenario 4) ✅
- [ ] Mobile Device Testing (Scenario 5) ✅
- [ ] Cross-Browser Testing (Scenario 6) ✅
- [ ] Performance benchmarks met ✅
- [ ] Security checks passed ✅

#### Documentation
- [ ] All issues logged in BUG_TRACKER.md
- [ ] P0/P1 bugs resolved
- [ ] Known issues documented
- [ ] Test results recorded

#### Sign-Off
- [ ] **QA Approval**: _________________ Date: _______
- [ ] **Developer Approval**: __________ Date: _______
- [ ] **Product Owner Approval**: ______ Date: _______

---

## 🚨 Severity Definitions

When logging bugs:

- **P0 (Critical)**: App crashes, data loss, security issue → BLOCK LAUNCH
- **P1 (High)**: Major feature broken, poor UX → FIX BEFORE LAUNCH
- **P2 (Medium)**: Minor bug, workaround exists → CAN LAUNCH
- **P3 (Low)**: Cosmetic, nice-to-have → POST-LAUNCH FIX

---

## 📞 Reporting Issues

When you find a bug during manual testing:

1. Open `BUG_TRACKER.md`
2. Add new entry with template
3. Include:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshot
   - Console errors
   - Priority (P0-P3)

---

**Good luck with testing! 🧪**

*Last Updated*: December 2024
