# Google Meet Live Sales Coaching - Implementation Guide

> Update: The `supabase/functions/meet-coaching` function described below was removed. Use the unified `make-server-139017f8` function and its `/meet/transcript` endpoints for the current build. Keep this guide for reference only.

**Status**: MVP Ready for Integration  
**Target Deployment**: Production  
**Architecture**: Echo Dialer + Chrome Extension + Supabase Edge Functions

---

## Overview

This implementation adapts MeetDial's "Meet Coach" system into Echo Dialer with:
- **Chrome Extension**: Captures Google Meet captions in real-time
- **Edge Functions**: Backend API for transcript ingestion and coaching
- **Frontend**: Live coaching overlay + transcript feed
- **Real-time**: Supabase Realtime for instant caption updates

---

## Part 1: Backend Infrastructure

### 1.1 Supabase Schema Setup

Apply the migration to create tables:

```bash
# Copy SQL to Supabase SQL Editor and run:
# supabase/migrations/meet_coaching_schema.sql
```

**Tables Created:**
- `meet_sessions` - Session metadata (links to user/campaign)
- `transcript_events` - Real-time caption stream
- `coaching_recommendations` - AI-generated suggestions
- `meet_session_analytics` - Aggregated metrics

### 1.2 Deploy Edge Function

```bash
# From project root
supabase functions deploy meet-coaching

# Set environment variables
supabase secrets set OPENAI_API_KEY="sk-..."

# Verify
supabase functions list
```

**Function Endpoints:**
```
POST   /meet/transcript              - Extension sends captions
GET    /meet/transcript/:sessionCode - Frontend fetches transcripts
POST   /meet/session/create          - Create new session
POST   /meet/session/end             - End session and save outcomes
GET    /health                       - Health check
```

### 1.3 Test Backend

```bash
# Health check
curl https://your-project.supabase.co/functions/v1/meet-coaching/health

# Create session (requires auth)
curl -X POST https://your-project.supabase.co/functions/v1/meet-coaching/meet/session/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactName":"John Doe"}'
```

---

## Part 2: Chrome Extension Setup

### 2.1 Extension Files

```
src/extension/
├── manifest.json           - Extension manifest
├── content.js             - Captures Google Meet captions
├── popup.html             - UI for session code entry
├── popup.js               - Handle user interactions
├── background.js          - Service worker
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 2.2 Load Extension Locally (Development)

1. **Build extension** (if needed):
   ```bash
   # Already ready to load - no build step required
   ```

2. **Load into Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select `/Users/josefhofman/Echodialermvp/src/extension/`

3. **Test**:
   - Visit `https://meet.google.com`
   - Click extension icon
   - Paste session code from Echo Dialer UI
   - Extension should show "Connected"

### 2.3 Extension Configuration

The extension reads from Chrome storage:

```javascript
// Set via popup UI
{
  "sessionCode": "ABCD1234EFGH",          // From Echo Dialer
  "apiEndpoint": "https://your-api/..."  // Optional override
}
```

**Automatic fallback** to default Echo Dialer API endpoint if not set.

### 2.4 Extension Troubleshooting

| Issue | Solution |
|-------|----------|
| "Listening to flow..." but no captions | Check Google Meet is showing captions (CC button enabled) |
| Extension not sending data | Verify session code is correct and connected |
| CORS errors | Check API endpoint is correct |
| Content script not running | Refresh Google Meet page after loading extension |

---

## Part 3: Frontend Integration

### 3.1 Add Meet Coaching to Echo UI

**In Dashboard or Call Screen:**

```typescript
import { MeetCoachingPanel } from '@/components/MeetCoachingPanel';
import { MeetCoachingOverlay } from '@/components/MeetCoachingOverlay';
import { createMeetSession, endMeetSession } from '@/utils/googleMeet/meetCoachingClient';

export function AICallScreen() {
  const [meetSession, setMeetSession] = useState(null);
  const [showMeetPanel, setShowMeetPanel] = useState(false);

  const startGoogleMeetCoaching = async () => {
    // Create session
    const session = await createMeetSession({
      contactId: currentContact.id,
      contactName: currentContact.name,
      campaignId: campaignId,
    });

    if (session) {
      setMeetSession(session);
      setShowMeetPanel(true);
      
      // Copy session code to clipboard
      navigator.clipboard.writeText(session.sessionCode);
      console.log('Session code copied:', session.sessionCode);
    }
  };

  const endGoogleMeetCoaching = async () => {
    if (meetSession) {
      await endMeetSession(meetSession.sessionCode, {
        disposition: 'connected',
        notes: 'Google Meet coaching session'
      });
      setMeetSession(null);
      setShowMeetPanel(false);
    }
  };

  return (
    <div>
      {/* Existing call interface */}
      
      {/* Meet coaching button */}
      {!meetSession ? (
        <button onClick={startGoogleMeetCoaching} className="...">
          + Start Google Meet with Live Coaching
        </button>
      ) : (
        <button onClick={endGoogleMeetCoaching} className="...">
          End Meet Session
        </button>
      )}

      {/* Live coaching overlay */}
      <MeetCoachingOverlay 
        sessionCode={meetSession?.sessionCode} 
        isActive={!!meetSession}
      />

      {/* Transcript feed modal */}
      <MeetCoachingPanel
        sessionCode={meetSession?.sessionCode}
        contactName={currentContact.name}
        isActive={showMeetPanel}
        onEnd={endGoogleMeetCoaching}
      />
    </div>
  );
}
```

### 3.2 Add to Dashboard Quick Actions

```typescript
// In DashboardScreen.tsx - Add to quick actions
<button onClick={startGoogleMeetCoaching} className="quickAction">
  <Video className="w-5 h-5" />
  <span>Meet Call + Coach</span>
</button>
```

---

## Part 4: User Workflow

### 4.1 Starting a Google Meet Call with Coaching

1. **User clicks** "Start Google Meet with Live Coaching" in Echo Dialer
2. **Backend creates** a session with unique code (e.g., `ABCD1234EFGH`)
3. **Session code copied** to user's clipboard automatically
4. **User joins** Google Meet call
5. **User opens** extension popup and pastes session code
6. **Extension shows** "Connected" status
7. **Extension starts** capturing Google Meet captions
8. **Captions sent** to Echo backend in real-time
9. **Coaching suggestions** displayed in overlay
10. **Transcript visible** in Echo Dialer transcript panel

### 4.2 Transcript Feed

- **Live updating** via Supabase Realtime
- **Speaker detection** (Agent vs. Prospect)
- **Confidence scores** shown for lower-quality captions
- **Searchable** transcript after call ends
- **Exportable** for CRM/records

### 4.3 Coaching Suggestions

- **Appears** when enough context accumulated
- **SPIN-based** suggestions (Situation, Problem, Implication, Need-Payoff)
- **3 priority levels**: High (objections), Medium (flow), Low (alternatives)
- **Example questions** shown on request
- **Tracking** whether agent used suggestion

---

## Part 5: Deployment Checklist

### Development
- [ ] Extension loads without errors in Chrome
- [ ] Session code displays in popup
- [ ] Backend responds to health check
- [ ] Transcripts flow to Supabase
- [ ] Coaching recommendations generate

### Staging
- [ ] Test with real Google Meet call (internal team)
- [ ] Verify extension auto-updates session code from Echo UI
- [ ] Check realtime subscriptions work (captions appear in real-time)
- [ ] Test coaching overlay display and interaction
- [ ] Verify RLS policies block unauthorized access

### Production
- [ ] Update API endpoint in extension (move from localhost)
- [ ] Set OPENAI_API_KEY in production secrets
- [ ] Enable CORS for production domain
- [ ] Publish extension to Chrome Web Store (optional, can use unpacked)
- [ ] Monitor Edge Function logs for errors
- [ ] Set up database backups for transcripts

---

## Part 6: Configuration for Production (echopulse.cz)

### 6.1 Environment Variables

```bash
# In Supabase > Project Settings > API > Configuration
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# In Supabase > Edge Functions > Secrets
OPENAI_API_KEY=sk-proj-...
ECHO_ALLOWED_ORIGINS=echopulse.cz,www.echopulse.cz
```

### 6.2 CORS Configuration

Edge function already handles CORS, but verify:
```typescript
// meet-coaching/index.ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or specific domain
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-session-code",
};
```

### 6.3 Extension Configuration for Production

Update in `popup.js`:
```javascript
const DEFAULT_API_ENDPOINT = 'https://api.echopulse.cz/functions/v1/make-server-139017f8/meet/transcript';
```

---

## Part 7: Monitoring & Troubleshooting

### 7.1 Monitor Edge Function Logs

```bash
supabase functions logs meet-coaching --follow
```

**Look for:**
- Successful transcript insertions
- OpenAI API calls
- Error patterns

### 7.2 Database Monitoring

```sql
-- Check for stuck sessions
SELECT * FROM meet_sessions 
WHERE ended_at IS NULL 
  AND started_at < NOW() - INTERVAL '4 hours'
ORDER BY started_at DESC;

-- Verify transcript flow
SELECT COUNT(*), speaker FROM transcript_events 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY speaker;

-- Check coaching suggestion quality
SELECT priority, COUNT(*) FROM coaching_recommendations 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY priority;
```

### 7.3 Common Issues

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Captions not captured | Extension not running | Reload Google Meet page |
| No coaching suggestions | OpenAI API key invalid | Check `supabase secrets` |
| Transcripts delayed | Debouncing too long | Reduce delay in `content.js` |
| Session not found | Wrong session code | Verify code matches in Echo UI |
| CORS blocked | Extension calling wrong endpoint | Check `popup.js` API endpoint |

---

## Part 8: Future Enhancements

### Short-term (v1.1)
- [ ] Speaker detection (ML model to identify agent vs. prospect)
- [ ] Sentiment analysis on transcripts
- [ ] Key phrase extraction
- [ ] Post-call summary generation

### Medium-term (v1.2)
- [ ] Chrome Web Store publication
- [ ] Firefox extension port
- [ ] Integration with Pipedrive (auto-log coaching notes)
- [ ] Analytics dashboard (coaching effectiveness metrics)

### Long-term (v2.0)
- [ ] Real-time speech analysis (pause detection, filler words)
- [ ] Live objection detection and counter-suggestions
- [ ] Performance scoring during call
- [ ] Competitor mention tracking

---

## Part 9: API Reference

### Create Session
```bash
POST /meet/session/create
Header: Authorization: Bearer {jwt_token}
Body: {
  "contactId": "uuid",
  "contactName": "string",
  "campaignId": "uuid",
  "title": "string"
}
Response: {
  "sessionId": "uuid",
  "sessionCode": "ABCD1234EFGH"
}
```

### Send Transcript
```bash
POST /meet/transcript
Header: x-session-code: ABCD1234EFGH
Body: {
  "sessionCode": "string",
  "text": "string",
  "speaker": "agent|prospect",
  "confidence": 0.95
}
```

### Fetch Transcripts
```bash
GET /meet/transcript/ABCD1234EFGH?since={timestamp}
Header: x-session-code: ABCD1234EFGH
Response: {
  "transcripts": [
    {
      "id": "uuid",
      "text": "string",
      "speaker": "agent|prospect",
      "created_at": "ISO8601",
      "confidence": 0.95
    }
  ]
}
```

### End Session
```bash
POST /meet/session/end
Header: Authorization: Bearer {jwt_token}
Body: {
  "sessionCode": "ABCD1234EFGH",
  "outcomes": {
    "disposition": "connected",
    "notes": "string"
  }
}
```

---

## Quick Start (5 minutes)

1. **Apply Supabase schema**:
   ```bash
   # Copy-paste meet_coaching_schema.sql to Supabase SQL editor
   ```

2. **Deploy edge function**:
   ```bash
   supabase functions deploy meet-coaching
   supabase secrets set OPENAI_API_KEY="sk-..."
   ```

3. **Load extension**:
   - `chrome://extensions` → Load unpacked → `/src/extension/`

4. **Test flow**:
   - Add MeetCoachingPanel to your call screen
   - Click "Start Meet Coaching"
   - Paste session code in extension
   - Go to Google Meet and start talking

5. **Monitor**:
   ```bash
   supabase functions logs meet-coaching --follow
   ```

---

**Created**: January 14, 2026  
**Status**: MVP Ready  
**Next**: Deploy and test with real Google Meet calls
