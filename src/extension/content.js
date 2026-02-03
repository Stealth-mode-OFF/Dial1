// Extension Content Script - Captures Google Meet captions
// Runs on every page load of meet.google.com
// Sends transcripts to Echo Dialer backend

(function() {
  console.log('[Echo Meet Coach] Content script loaded');

  // Configuration - will be injected from popup
  let CONFIG = {
    callId: null,
    apiEndpoint: null, // e.g., https://<project>.supabase.co/functions/v1/make-server-139017f8
    myName: '',
    enabled: false,
  };

  // Get config from extension storage
  chrome.storage.local.get(['callId', 'sessionCode', 'apiEndpoint', 'myName'], (result) => {
    // sessionCode kept for backward compatibility
    CONFIG.callId = result.callId || result.sessionCode || null;
    CONFIG.apiEndpoint = (result.apiEndpoint || '').toString().trim();
    CONFIG.myName = (result.myName || '').toString().trim();
    CONFIG.enabled = !!CONFIG.callId;
    console.log('[Echo Meet Coach] Config loaded:', CONFIG);
  });

  // Listen for config updates from popup
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.callId) {
        CONFIG.callId = changes.callId.newValue;
      }
      if (changes.sessionCode && !CONFIG.callId) {
        CONFIG.callId = changes.sessionCode.newValue;
      }
      if (changes.apiEndpoint) {
        CONFIG.apiEndpoint = changes.apiEndpoint.newValue;
      }
      if (changes.myName) {
        CONFIG.myName = changes.myName.newValue;
      }
      CONFIG.enabled = !!CONFIG.callId;
      console.log('[Echo Meet Coach] Config updated:', CONFIG);
    }
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
    version: '1.0.0',
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
    if (!CONFIG.enabled || !CONFIG.callId) return;
    chrome.runtime.sendMessage({ action: 'postTranscript', payload }, (res) => {
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

    postToBackground({
      text: pending.text,
      speaker: classifySpeaker(pending.speakerName),
      speakerName: pending.speakerName,
    });

    postToPage('ECHO_MEET_CAPTION_CHUNK', {
      text: pending.text,
      speaker: classifySpeaker(pending.speakerName),
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

  // Health check to Echo backend
  async function healthCheck() {
    if (!CONFIG.apiEndpoint) return;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${CONFIG.apiEndpoint.replace(/\/$/, '')}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      console.log('[Echo Meet Coach] Health check:', response.ok ? 'OK' : 'FAILED');
    } catch (error) {
      console.log('[Echo Meet Coach] Health check failed:', error.message);
    }
  }

  // Start monitoring when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Echo Meet Coach] DOM ready, starting observer');
      setupMutationObserver();
      healthCheck();
      postToPage('ECHO_EXTENSION_HELLO', {
        version: '1.0.0',
        capabilities: { dial: false, meetCaptions: true },
      });
    });
  } else {
    console.log('[Echo Meet Coach] DOM already loaded, starting observer');
    setupMutationObserver();
    healthCheck();
    postToPage('ECHO_EXTENSION_HELLO', {
      version: '1.0.0',
      capabilities: { dial: false, meetCaptions: true },
    });
  }

  // Periodic health check
  setInterval(healthCheck, 30000);

  console.log('[Echo Meet Coach] Content script ready');
})();
