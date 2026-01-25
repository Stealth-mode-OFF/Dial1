# Echo Telesales OS - Testing Documentation

## 🧪 E2E Test Suite

This document describes the automated E2E testing setup for Echo Telesales OS using Playwright.

---

## Installation & Setup

### Prerequisites
- Node.js 18+ installed
- Application running on `http://localhost:5173`
- Supabase backend configured with valid API keys

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

---

## Running Tests

### Run all tests (headless)
```bash
npx playwright test
```

### Run tests with UI (headed mode)
```bash
npx playwright test --headed
```

### Run specific test file
```bash
npx playwright test e2e/01-dashboard.spec.ts
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run mobile tests
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Debug mode
```bash
npx playwright test --debug
```

### View test report
```bash
npx playwright show-report
```

---

## Test Coverage

### ✅ Test Files Overview

| File | Priority | Coverage |
|------|----------|----------|
| `01-dashboard.spec.ts` | P0 | Dashboard loading, check-in flow, stats display |
| `02-campaigns.spec.ts` | P0 | Pipedrive sync, contact list, campaign management |
| `03-call-screen.spec.ts` | P0 | AI analysis, speech-to-text, call flow, BANT |
| `04-analytics.spec.ts` | P1 | Analytics screen, charts, performance metrics |
| `05-settings.spec.ts` | P1 | Settings screen, sales style, configurations |
| `06-navigation.spec.ts` | P0 | Navigation, responsiveness, error handling |

---

## Browser & Device Matrix

### Desktop Browsers (Tested)
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest via WebKit)
- ✅ Edge (Chromium-based)

### Mobile Devices (Tested)
- ✅ Mobile Chrome (Pixel 5 viewport)
- ✅ Mobile Safari (iPhone 13 viewport)
- ✅ iPad Pro

### Responsive Breakpoints
- Desktop: 1920px, 1440px
- Tablet: 1024px, 768px
- Mobile: 430px, 375px, 360px

---

## Test Scenarios Covered

### 1. Dashboard & Check-In (P0)
- [x] Dashboard loads successfully
- [x] Stats cards display correctly
- [x] Check-in modal opens
- [x] Energy level selection works
- [x] Mood selection works
- [x] Check-in confirmation persists state
- [x] Navigation to campaigns works
- [x] Mobile responsiveness verified

### 2. Campaigns & Pipedrive Sync (P0)
- [x] Campaigns screen loads
- [x] Pipedrive sync button visible
- [x] Sync flow completes (or shows error)
- [x] Contact list displays after sync
- [x] Contact details are visible
- [x] Cached AI data is utilized
- [x] Navigation to call screen works
- [x] Loading states display properly

### 3. AI Call Screen (P0)
- [x] Call screen loads with contact info
- [x] AI analysis phase shows
- [x] AI intelligence signals display
- [x] Speech-to-text controls visible
- [x] Transcript terminal available
- [x] Manual note entry works
- [x] BANT framework visible
- [x] Next contact navigation works
- [x] Low energy mode handled
- [x] No critical console errors

### 4. Analytics (P1)
- [x] Analytics screen loads
- [x] Performance metrics display
- [x] Charts render without errors
- [x] Call history/logs visible
- [x] Date filtering (if available)

### 5. Settings (P1)
- [x] Settings screen loads
- [x] Sales style options visible
- [x] Sales style can be changed
- [x] Pipedrive API config visible
- [x] Product knowledge base visible
- [x] Settings save functionality

### 6. Navigation & Error Handling (P0)
- [x] Main navigation displays
- [x] All screens accessible
- [x] User info in header
- [x] Daily call counter visible
- [x] State maintains during navigation
- [x] Browser back/forward work
- [x] No horizontal scroll on any breakpoint
- [x] Mobile menu works correctly
- [x] Page refresh handled gracefully
- [x] Network errors handled
- [x] No sensitive data in console

---

## Known Limitations

### Manual Testing Required
Some scenarios cannot be fully automated and require manual verification:

1. **Speech-to-Text Live Testing**
   - Microphone permissions
   - Real-time transcription accuracy
   - Browser-specific Web Speech API behavior

2. **Energy Drain Over Time**
   - Requires completing 3+ calls to test energy level changes
   - Pomodoro session tracking over extended use

3. **Real Pipedrive Data**
   - Sync with actual Pipedrive account
   - Handling of various contact data formats
   - Error states with invalid API keys

4. **AI Model Responses**
   - GPT-4o response quality
   - Rate limiting behavior
   - Cached vs. fresh data quality comparison

5. **Cross-Browser Audio**
   - Microphone access in different browsers
   - Audio input quality variations

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Debugging Failed Tests

### View trace for failed tests
```bash
npx playwright show-trace trace.zip
```

### Run single test in debug mode
```bash
npx playwright test --debug e2e/03-call-screen.spec.ts
```

### Screenshot on failure
Screenshots are automatically captured and saved to `test-results/` folder.

### Console logs
Check `test-results/` for console output from failed tests.

---

## Performance Benchmarks

### Expected Load Times
- Dashboard: < 2s
- Campaigns sync: < 5s (depends on Pipedrive)
- AI analysis: 5-15s (first time), < 1s (cached)
- Analytics: < 3s

### Performance Testing
```bash
# Run with performance profiling
npx playwright test --trace on
```

---

## Accessibility Testing

### WCAG 2.1 Compliance
While not automated, consider testing:
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- Focus indicators

### Run accessibility audit (manual)
1. Open Chrome DevTools
2. Run Lighthouse audit
3. Check Accessibility score
4. Target: > 90%

---

## Security Checklist

During testing, verify:
- [ ] No API keys in console logs
- [ ] No passwords in network requests
- [ ] No sensitive data in localStorage (inspect DevTools)
- [ ] HTTPS used for all API calls (production)
- [ ] No XSS vulnerabilities in user inputs
- [ ] CSRF tokens if using forms

---

## Reporting Bugs

When a test fails, document:
1. **Test file & line**: Which test failed
2. **Steps to reproduce**: Exact steps
3. **Expected result**: What should happen
4. **Actual result**: What actually happened
5. **Environment**: Browser, OS, viewport size
6. **Screenshots**: From `test-results/`
7. **Console errors**: Any JavaScript errors
8. **Priority**: P0 (critical), P1 (high), P2 (medium), P3 (low)

Use the `BUG_TRACKER.md` file to log all issues.

---

## Next Steps

After all tests pass:
1. Review `BUG_TRACKER.md` for open issues
2. Complete manual testing scenarios
3. Run performance audit
4. Check `PRODUCTION_CHECKLIST.md`
5. Deploy to staging
6. Final smoke test on staging
7. Go live! 🚀
