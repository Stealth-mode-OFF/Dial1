// Extension Background Service Worker - Handles extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Echo Meet Coach] Extension installed');
  
  // Initialize storage
  chrome.storage.local.get(['callId', 'sessionCode', 'apiEndpoint'], (result) => {
    if (!result.callId && !result.sessionCode) {
      chrome.storage.local.set({
        callId: null,
        apiEndpoint: result.apiEndpoint || '',
      });
    }
  });
});

async function getConfig() {
  return await new Promise((resolve) => {
    chrome.storage.local.get(['callId', 'sessionCode', 'apiEndpoint', 'authToken'], (result) => {
      resolve({
        callId: result.callId || result.sessionCode || null,
        apiEndpoint: (result.apiEndpoint || '').toString().trim(),
        authToken: (result.authToken || '').toString().trim(),
      });
    });
  });
}

async function postTranscriptEvent(payload) {
  const cfg = await getConfig();
  if (!cfg.callId) throw new Error('No callId configured');
  if (!cfg.apiEndpoint) throw new Error('No apiEndpoint configured');

  const url = `${cfg.apiEndpoint.replace(/\/$/, '')}/meet/transcript`;
  const headers = {
    'Content-Type': 'application/json',
    'x-echo-user': cfg.callId,
  };
  if (cfg.authToken) {
    headers['Authorization'] = cfg.authToken.startsWith('Bearer ') ? cfg.authToken : `Bearer ${cfg.authToken}`;
  }

  const body = {
    callId: cfg.callId,
    text: payload.text,
    speaker: payload.speaker || 'peer',
    speakerName: payload.speakerName || null,
    source: 'meet_captions',
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.ok) return { ok: true };
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
  }
  throw lastError || new Error('Failed to post transcript');
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Echo Meet Coach] Message received:', request);

  if (request.action === 'getSessionCode' || request.action === 'getCallId') {
    chrome.storage.local.get(['callId', 'sessionCode'], (result) => {
      sendResponse({ callId: result.callId || result.sessionCode || null });
    });
  } else if (request.action === 'updateSessionCode' || request.action === 'updateCallId') {
    chrome.storage.local.set({ callId: request.sessionCode || request.callId || null, sessionCode: request.sessionCode || request.callId || null });
    sendResponse({ success: true });
  } else if (request.action === 'postTranscript') {
    postTranscriptEvent(request.payload || {})
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true; // keep message channel open for async response
  }
});

// Log background worker startup
console.log('[Echo Meet Coach] Background service worker loaded');
