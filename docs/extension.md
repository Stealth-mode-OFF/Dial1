# Chrome Extension (Google Meet Captions -> Dial1 Meet Coach)

Goal: during a Google Meet call with captions ON, forward Czech caption lines into the Dial1 Meet Coach page in real time.

## Architecture (No Secrets)

- `meet.google.com` -> `meet_content.js` (content script)
  - scrapes captions from the DOM
  - dedupes repeating lines
  - sends events to background (`chrome.runtime.sendMessage`)
- Background `background.js`
  - finds a Dial1 tab (configured base URL preferred)
  - forwards caption events to that tab
- Dial1 tab -> `dial1_bridge.js` (content script)
  - receives caption events from background
  - forwards them into the web app via `window.postMessage` (same-origin)
- Dial1 web app -> `src/pages/MeetCoach.tsx`
  - listens for `window.postMessage` events and renders live feed + battlecards

The extension does NOT talk to Supabase or any backend.

## Load Unpacked (Chrome)

1. `npm i`
2. `npm run dev`
3. Open Chrome -> `chrome://extensions`
4. Enable `Developer mode` (top right)
5. Click `Load unpacked`
6. Select folder: `Dial1/src/extension`

## Configure

1. Open Dial1 Meet Coach in a tab:
   - Local: `http://localhost:5173/meet` or `http://localhost:5173/#meet`
   - Production: `https://dial1.vercel.app/meet` or `https://dial1.vercel.app/#meet`
2. Click the extension icon -> popup
3. Set `Dial1 URL` to the Dial1 tab origin:
   - Example: `http://localhost:5173/`
   - Example: `https://dial1.vercel.app/`
4. Click `Save`
5. (Optional) Click `Ping Dial1` to verify the bridge is alive

Note: if you enter a Vercel preview URL (like `https://dial1-xxxx.vercel.app/`), Chrome may prompt you to allow permissions for that origin. Accept it.

## Smoke Test Checklist

- Dial1 tab:
  - [ ] Open `Meet Coach` page
  - [ ] Status shows `Bridge: Connected` (or becomes connected after reload)
- Google Meet tab:
  - [ ] Join a meeting
  - [ ] Turn captions ON (CC)
  - [ ] Speak Czech for 5-10 seconds
- Extension popup:
  - [ ] `Dial1 tab: Yes`
  - [ ] `Forward last: < 5s ago`
- Dial1 Meet Coach UI:
  - [ ] Incoming lines appear in `Live feed`
  - [ ] `Captions: Connected` (within 10s)
  - [ ] A `Suggestion` card appears if triggers are spoken (e.g. "rozpočet", "GDPR", "pošlete to mailem")

## Troubleshooting

### Captions not appearing at all

1. Confirm captions are ON in Google Meet.
2. Open Meet DevTools console and enable `Debug logs` in the extension popup.
3. Reload the Meet tab.
4. If Meet DOM changed, the content script may not find the caption container; update heuristics in:
   - `src/extension/meet_content.js`

### Dial1 tab not found

1. Keep Dial1 Meet Coach open in a visible tab.
2. In extension popup, set Dial1 URL to the tab origin and click `Save`.
3. If using a custom domain / Vercel preview URL, accept the permissions prompt.

### Dial1 says "Bridge: Not connected"

1. Reload the Dial1 tab.
2. Re-open the extension popup and click `Ping Dial1`.
3. Ensure the Dial1 URL in popup matches the tab (same origin).
