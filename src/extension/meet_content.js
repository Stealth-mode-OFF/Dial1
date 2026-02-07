// Meet Content Script
// Scrapes Google Meet captions (CC) and streams them to the background script.
// No secrets. No direct backend calls.

(() => {
  const LOG_PREFIX = '[Echo Meet Coach]';

  const STATE = {
    enabled: true,
    debug: false,
    lastEmitAt: 0,
    lastContainerPickAt: 0,
    lastCaptionSeenAt: 0,
    recentHashes: [], // ring buffer
    recentHashSet: new Set(),
    pendingBySpeaker: new Map(),
    container: null,
  };

  const RECENT_MAX = 30;

  function now() {
    return Date.now();
  }

  function log(...args) {
    if (!STATE.debug) return;
    // eslint-disable-next-line no-console
    console.log(LOG_PREFIX, ...args);
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  function addRecentHash(hash) {
    if (STATE.recentHashSet.has(hash)) return false;
    STATE.recentHashes.push(hash);
    STATE.recentHashSet.add(hash);
    while (STATE.recentHashes.length > RECENT_MAX) {
      const old = STATE.recentHashes.shift();
      STATE.recentHashSet.delete(old);
    }
    return true;
  }

  function normalizeText(s) {
    return (s || '')
      .toString()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
  }

  function looksCaptionLike(text) {
    const t = normalizeText(text);
    if (!t) return false;
    if (t.length < 2 || t.length > 300) return false;
    // Avoid grabbing UI announcements
    const lower = t.toLowerCase();
    const banned = [
      'you are presenting',
      'captions',
      'turn on captions',
      'turned on',
      'turned off',
      'live captions',
      'microphone',
      'camera',
      'recording',
      'host',
      'meeting details',
      'raised hand',
    ];
    if (banned.some((b) => lower.includes(b))) return false;
    // Needs some letters (Czech included)
    if (!/[a-zA-Z\u00C0-\u017F]/.test(t)) return false;
    return true;
  }

  function parseCaptionBlock(raw) {
    const text = (raw || '').toString().trim();
    if (!text) return [];
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return [];

    // Common Meet captions pattern: speaker on first line, caption on remaining lines.
    if (lines.length >= 2 && lines[0].length <= 60) {
      const speakerName = lines[0];
      const captionText = normalizeText(lines.slice(1).join(' '));
      if (!looksCaptionLike(captionText)) return [];
      return [{ speakerName, text: captionText }];
    }

    const captionText = normalizeText(lines.join(' '));
    if (!looksCaptionLike(captionText)) return [];
    return [{ speakerName: null, text: captionText }];
  }

  function emitCaption(speakerName, text) {
    if (!STATE.enabled) return;
    const payload = {
      ts: now(),
      speaker: null,
      speakerName: speakerName ? normalizeText(speakerName).slice(0, 80) : null,
      text: normalizeText(text),
    };

    const hash = String(fnv1a(`${payload.speakerName || ''}|${payload.text}`));
    if (!addRecentHash(hash)) return;

    STATE.lastEmitAt = payload.ts;
    STATE.lastCaptionSeenAt = payload.ts;

    try {
      chrome.runtime.sendMessage({ type: 'MEET_CAPTION', payload });
    } catch {
      // ignore
    }
  }

  function flushSpeaker(key) {
    const pending = STATE.pendingBySpeaker.get(key);
    if (!pending) return;
    STATE.pendingBySpeaker.delete(key);
    emitCaption(pending.speakerName, pending.text);
  }

  function queueCaption(speakerName, text) {
    const clean = normalizeText(text);
    if (!looksCaptionLike(clean)) return;

    const key = (speakerName || 'unknown').toString().toLowerCase();
    const existing = STATE.pendingBySpeaker.get(key);
    if (existing?.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => flushSpeaker(key), 650);
    STATE.pendingBySpeaker.set(key, {
      speakerName: speakerName ? normalizeText(speakerName) : null,
      text: clean,
      timer,
    });
  }

  function scanElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

    const raw = (el.innerText || el.textContent || '').toString().trim();
    if (!raw) return;
    // Fast path: ignore huge text blocks
    if (raw.length > 1000) return;

    const events = parseCaptionBlock(raw);
    for (const ev of events) queueCaption(ev.speakerName, ev.text);
  }

  function discoverCaptionContainer() {
    const since = now() - STATE.lastContainerPickAt;
    if (since < 2500) return;
    STATE.lastContainerPickAt = now();

    const candidates = [];
    document
      .querySelectorAll(
        [
          '[aria-live="polite"]',
          '[aria-live="assertive"]',
          '[role="log"]',
          '[aria-live]',
          // Fallback heuristics: Meet sometimes nests captions in log-like containers.
          '[role="region"][aria-label*="captions" i]',
        ].join(','),
      )
      .forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const raw = (el.innerText || el.textContent || '').toString();
        if (!raw || raw.length < 2) return;
        // Simple scoring: prefer nodes whose text looks like captions.
        const text = normalizeText(raw);
        let score = 0;
        if (looksCaptionLike(text)) score += 5;
        if (raw.includes('\n')) score += 2;
        if (text.length >= 10 && text.length <= 160) score += 2;
        // Slightly prefer nodes that update (aria-live tends to).
        const ariaLive = el.getAttribute('aria-live');
        if (ariaLive === 'polite' || ariaLive === 'assertive') score += 1;
        if (score >= 5) candidates.push({ el, score });
      });

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0]?.el || null;
    if (best && best !== STATE.container) {
      STATE.container = best;
      log('Picked caption container:', best, 'score=', candidates[0].score);
    }
  }

  function sendStatus(reason) {
    try {
      chrome.runtime.sendMessage({
        type: 'MEET_STATUS',
        payload: {
          ts: now(),
          enabled: STATE.enabled,
          hasContainer: Boolean(STATE.container),
          lastCaptionSeenAt: STATE.lastCaptionSeenAt || null,
          reason: reason || null,
        },
      });
    } catch {
      // ignore
    }
  }

  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      // Keep container selection fresh
      discoverCaptionContainer();

      // Prefer scanning within selected container
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes && m.addedNodes.forEach((n) => {
            if (STATE.container && n instanceof HTMLElement) {
              if (!STATE.container.contains(n) && n !== STATE.container) return;
            }
            if (n.nodeType === Node.ELEMENT_NODE) {
              scanElement(n);
              // Also scan aria-live descendants which may hold the actual caption text.
              n.querySelectorAll?.('[aria-live]').forEach((x) => scanElement(x));
            } else if (n.nodeType === Node.TEXT_NODE && n.parentElement) {
              scanElement(n.parentElement);
            }
          });
        } else if (m.type === 'characterData' && m.target?.parentElement) {
          const el = m.target.parentElement;
          if (STATE.container) {
            if (!STATE.container.contains(el) && el !== STATE.container) continue;
          }
          scanElement(el);
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return observer;
  }

  function loadConfig() {
    try {
      chrome.storage.local.get(['enabled', 'debugMeet'], (res) => {
        STATE.enabled = res.enabled !== false;
        STATE.debug = Boolean(res.debugMeet);
        log('Config loaded', { enabled: STATE.enabled, debug: STATE.debug });
        sendStatus('config_loaded');
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.enabled) STATE.enabled = changes.enabled.newValue !== false;
        if (changes.debugMeet) STATE.debug = Boolean(changes.debugMeet.newValue);
        sendStatus('config_changed');
      });
    } catch {
      // ignore
    }
  }

  function boot() {
    loadConfig();
    discoverCaptionContainer();
    setupObserver();

    // Periodic status + container re-pick.
    setInterval(() => {
      discoverCaptionContainer();
      const stale = STATE.lastCaptionSeenAt ? now() - STATE.lastCaptionSeenAt : Infinity;
      sendStatus(stale < 15000 ? 'ok' : 'stale_or_no_captions');
    }, 5000);

    log('Meet content script ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
