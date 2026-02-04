chrome.runtime.onInstalled.addListener(() => {
  console.log('[Echo Meet Coach] Extension installed');
  chrome.storage.local.get(['enabled', 'apiEndpoint'], (result) => {
    const enabled = typeof result.enabled === 'boolean' ? result.enabled : false;
    const apiEndpoint = (result.apiEndpoint || '').toString().trim();
    chrome.storage.local.set({ enabled, apiEndpoint });
  });
});

function deriveCallIdFromUrl(url) {
  const raw = (url || '').toString();
  const match = raw.match(/meet\.google\.com\/([a-zA-Z0-9-]{6,})/i);
  if (match && match[1]) return match[1].toUpperCase();
  return null;
}

async function getConfig() {
  return await new Promise((resolve) => {
    chrome.storage.local.get(['enabled', 'apiEndpoint', 'authToken'], (result) => {
      resolve({
        enabled: Boolean(result.enabled),
        apiEndpoint: (result.apiEndpoint || '').toString().trim(),
        authToken: (result.authToken || '').toString().trim(),
      });
    });
  });
}

async function postTranscriptEvent(payload, sender) {
  const cfg = await getConfig();
  if (!cfg.enabled) return { ok: true, skipped: 'disabled' };
  if (!cfg.apiEndpoint) throw new Error('No apiEndpoint configured');

  const callId =
    (payload && payload.callId ? String(payload.callId).trim().toUpperCase() : null) ||
    deriveCallIdFromUrl(payload && payload.meeting_url ? payload.meeting_url : null) ||
    deriveCallIdFromUrl(sender?.tab?.url || null);

  if (!callId) throw new Error('No callId (open a meet.google.com tab)');

  const url = `${cfg.apiEndpoint.replace(/\/$/, '')}/meet/transcript`;
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.authToken) {
    headers['Authorization'] = cfg.authToken.startsWith('Bearer ') ? cfg.authToken : `Bearer ${cfg.authToken}`;
  }

  const body = {
    callId,
    text: payload.text,
    speaker: payload.speaker || 'peer',
    speakerName: payload.speakerName || null,
    meeting_url: payload.meeting_url || null,
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || typeof request !== 'object') return;

  if (request.action === 'postTranscript') {
    postTranscriptEvent(request.payload || {}, sender)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }
});

console.log('[Echo Meet Coach] Background service worker loaded');
