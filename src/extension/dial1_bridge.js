// Dial1 Bridge Content Script
// Runs on Dial1 pages (localhost + production). Receives events from the extension
// background and forwards them into the web app via window.postMessage.

(() => {
  const SOURCE = 'echo-meet-coach';

  function postToPage(type, payload) {
    try {
      // Send in both formats for backward compatibility
      // Legacy format (used by MeetCaptionsPanel and MeetCoach)
      window.postMessage({ source: SOURCE, type, payload }, window.location.origin);

      // Standardized format (used by extensionBridge.ts)
      if (type === 'MEET_CAPTION') {
        window.postMessage({
          type: 'ECHO_MEET_CAPTION_CHUNK',
          payload: {
            text: payload.text,
            speaker: payload.speakerName,
            captured_at: payload.ts,
            meeting_url: window.location.href
          }
        }, window.location.origin);
      }
    } catch (e) {
      // ignore
    }
  }

  // Signal to the page (and to the background) that the bridge is alive.
  const bootTs = Date.now();
  postToPage('BRIDGE_READY', { ts: bootTs });
  try {
    chrome.runtime.sendMessage({ type: 'DIAL1_BRIDGE_READY', payload: { ts: bootTs, origin: window.location.origin } });
  } catch {
    // ignore
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'MEET_CAPTION' && msg.payload) {
      postToPage('MEET_CAPTION', msg.payload);
      try {
        chrome.runtime.sendMessage({ type: 'DIAL1_FORWARD_ACK', payload: { ts: Date.now() } });
      } catch {
        // ignore
      }
      sendResponse?.({ ok: true });
      return true;
    }

    if (msg.type === 'PING') {
      sendResponse?.({ ok: true, ts: Date.now() });
      return true;
    }
  });
})();

