// Extension Content Script - Captures Google Meet captions (CC)
// Runs on meet.google.com and forwards transcript chunks to Supabase Edge Function.

(function () {
  console.log('[Echo Meet Coach] Content script loaded');

  let CONFIG = {
    apiEndpoint: '', // https://<project>.supabase.co/functions/v1/make-server-139017f8
    myName: '',
    enabled: false,
  };

  const deriveCallIdFromMeetUrl = (url) => {
    const raw = (url || '').toString();
    const match = raw.match(/meet\.google\.com\/([a-zA-Z0-9-]{6,})/i);
    if (match && match[1]) return match[1].toUpperCase();
    return null;
  };

  const getCallId = () => deriveCallIdFromMeetUrl(window.location.href);

  chrome.storage.local.get(['enabled', 'apiEndpoint', 'myName'], (result) => {
    CONFIG.enabled = Boolean(result.enabled);
    CONFIG.apiEndpoint = (result.apiEndpoint || '').toString().trim();
    CONFIG.myName = (result.myName || '').toString().trim();
    console.log('[Echo Meet Coach] Config loaded:', CONFIG);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.enabled) CONFIG.enabled = Boolean(changes.enabled.newValue);
    if (changes.apiEndpoint) CONFIG.apiEndpoint = String(changes.apiEndpoint.newValue || '').trim();
    if (changes.myName) CONFIG.myName = String(changes.myName.newValue || '').trim();
    console.log('[Echo Meet Coach] Config updated:', CONFIG);
  });

  const lastSentBySpeaker = new Map();
  const pendingBySpeaker = new Map();

  function postToPage(type, payload) {
    try {
      window.postMessage({ type, payload }, '*');
    } catch {
      // ignore
    }
  }

  // Notify webapp that extension is available
  postToPage('ECHO_EXTENSION_HELLO', {
    version: '1.1.0',
    capabilities: { dial: false, meetCaptions: true },
  });

  function normalizeSpeakerName(name) {
    if (!name) return null;
    return name.toString().trim().replace(/\s+/g, ' ').slice(0, 80) || null;
  }

  function classifySpeaker(speakerName) {
    const me = (CONFIG.myName || '').toLowerCase().trim();
    const speaker = (speakerName || '').toLowerCase().trim();
    if (me && speaker && speaker === me) return 'user';
    return 'peer';
  }

  function postToBackground(payload) {
    if (!CONFIG.enabled) return;
    const callId = getCallId();
    if (!callId) return;
    chrome.runtime.sendMessage({ action: 'postTranscript', payload: { ...payload, callId, meeting_url: window.location.href } }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res && res.ok === false) {
        console.warn('[Echo Meet Coach] Background post failed:', res.error);
      }
    });
  }

  function flushSpeaker(key) {
    const pending = pendingBySpeaker.get(key);
    if (!pending) return;
    pendingBySpeaker.delete(key);

    const last = lastSentBySpeaker.get(key);
    if (last && last === pending.text) return;
    lastSentBySpeaker.set(key, pending.text);

    const speaker = classifySpeaker(pending.speakerName);

    postToBackground({
      text: pending.text,
      speaker,
      speakerName: pending.speakerName,
    });

    postToPage('ECHO_MEET_CAPTION_CHUNK', {
      text: pending.text,
      speaker,
      captured_at: Date.now(),
      meeting_url: window.location.href,
    });
  }

  function queueCaption(speakerName, text) {
    const cleanText = (text || '').toString().trim().replace(/\s+/g, ' ');
    if (cleanText.length < 2 || cleanText.length > 500) return;

    const normalizedSpeakerName = normalizeSpeakerName(speakerName);
    const key = normalizedSpeakerName || 'unknown';

    const existing = pendingBySpeaker.get(key);
    if (existing?.timerId) clearTimeout(existing.timerId);

    const timerId = setTimeout(() => flushSpeaker(key), 700);
    pendingBySpeaker.set(key, { speakerName: normalizedSpeakerName, text: cleanText, timerId });
  }

  function looksLikeCaptionBlock(lines) {
    if (!Array.isArray(lines) || lines.length < 1) return false;
    const all = lines.join(' ').trim();
    if (all.length < 2 || all.length > 500) return false;
    if (/^(\d{1,2}:\d{2})(\s*(AM|PM))?$/i.test(all)) return false;
    if (/^https?:\/\//i.test(all)) return false;
    if (/^(turn on captions|captions)$/i.test(all)) return false;
    return true;
  }

  function parseCaptionsFromElement(el) {
    const raw = (el?.innerText || el?.textContent || '').toString().trim();
    if (!raw) return [];

    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!looksLikeCaptionBlock(lines)) return [];

    // Common Meet pattern: "Speaker Name" newline "caption text..."
    if (lines.length >= 2 && lines[0].length <= 60) {
      const speakerName = lines[0];
      const text = lines.slice(1).join(' ');
      return [{ speakerName, text }];
    }

    // Fallback: treat as unknown speaker caption
    if (lines.length === 1) return [{ speakerName: null, text: lines[0] }];
    return [{ speakerName: null, text: lines.join(' ') }];
  }

  function scanNodeForCaptions(node) {
    if (!node) return;
    const elements = [];
    if (node.nodeType === Node.ELEMENT_NODE) {
      elements.push(node);
      if (node.querySelectorAll) {
        node.querySelectorAll('[aria-live="polite"], [aria-live="assertive"]').forEach((x) => elements.push(x));
      }
    }
    elements.forEach((el) => {
      const events = parseCaptionsFromElement(el);
      events.forEach(({ speakerName, text }) => queueCaption(speakerName, text));
    });
  }

  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes?.length) {
          mutation.addedNodes.forEach((n) => scanNodeForCaptions(n));
        } else if (mutation.type === 'characterData' && mutation.target?.parentElement) {
          scanNodeForCaptions(mutation.target.parentElement);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return observer;
  }

  async function healthCheck() {
    if (!CONFIG.apiEndpoint) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${CONFIG.apiEndpoint.replace(/\/$/, '')}/health`, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      console.log('[Echo Meet Coach] Health check:', response.ok ? 'OK' : 'FAILED');
    } catch (error) {
      console.log('[Echo Meet Coach] Health check failed:', error.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Echo Meet Coach] DOM ready, starting observer');
      setupMutationObserver();
      healthCheck();
    });
  } else {
    console.log('[Echo Meet Coach] DOM already loaded, starting observer');
    setupMutationObserver();
    healthCheck();
  }

  setInterval(healthCheck, 30000);

  console.log('[Echo Meet Coach] Content script ready');
})();
