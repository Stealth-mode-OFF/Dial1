// Extension Background Service Worker
// Responsibilities:
// - Receive caption events from Meet content script
// - Forward them to a Dial1 tab (localhost + production)
// - Expose health/status to the popup
//
// Non-negotiable: no secrets; do not talk to Supabase from the extension.

const LOG_PREFIX = '[Echo Meet Coach]';

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(LOG_PREFIX, ...args);
}

const DEFAULT_DIAL1_BASES = [
  'http://localhost:5173/',
  'http://127.0.0.1:5173/',
  'http://localhost:3000/',
  'http://127.0.0.1:3000/',
  'https://dial1.vercel.app/',
];

function normalizeBaseUrl(url) {
  const raw = (url || '').toString().trim();
  if (!raw) return '';
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return `${u.origin}/`;
  } catch {
    return '';
  }
}

function originPattern(origin) {
  return `${origin.replace(/\/$/, '')}/*`;
}

async function getConfig() {
  return await new Promise((resolve) => {
    chrome.storage.local.get(
      [
        'dial1BaseUrl',
        'enabled',
        'debugMeet',
        'lastDial1TabId',
        'status',
      ],
      (res) => {
        resolve({
          enabled: res.enabled !== false,
          debugMeet: Boolean(res.debugMeet),
          dial1BaseUrl: normalizeBaseUrl(res.dial1BaseUrl) || '',
          lastDial1TabId: typeof res.lastDial1TabId === 'number' ? res.lastDial1TabId : null,
          status: res.status || {},
        });
      },
    );
  });
}

async function setStatus(patch) {
  const cfg = await getConfig();
  const next = { ...(cfg.status || {}), ...patch, updatedAt: Date.now() };
  return await new Promise((resolve) => chrome.storage.local.set({ status: next }, () => resolve(next)));
}

async function findDial1Tab(dial1BaseUrl) {
  const bases = dial1BaseUrl ? [dial1BaseUrl] : DEFAULT_DIAL1_BASES;

  const tabs = await chrome.tabs.query({});
  const candidates = tabs
    .filter((t) => typeof t.id === 'number' && typeof t.url === 'string')
    .filter((t) => bases.some((b) => t.url.startsWith(b)));

  if (!candidates.length) return null;
  // Prefer active tab, otherwise the most recently accessed (Chrome doesn't expose lastActive reliably here).
  const active = candidates.find((t) => t.active);
  return active || candidates[candidates.length - 1];
}

async function ensureBridgeInTab(tabId, dial1BaseUrl) {
  // Content scripts only run on domains the extension has host permissions for.
  // For custom Vercel preview domains, the popup can request optional host permission.
  try {
    const tab = await chrome.tabs.get(tabId);
    const origin = tab?.url ? new URL(tab.url).origin : null;
    if (!origin) return { ok: false, reason: 'no_origin' };

    const hasPerm = await new Promise((resolve) => {
      chrome.permissions.contains({ origins: [originPattern(origin)] }, (result) => resolve(Boolean(result)));
    });

    if (!hasPerm) {
      // If the dial1 base is within the manifest host_permissions (e.g. dial1.vercel.app, localhost),
      // contains() may still return false in MV3 depending on Chrome; we still attempt sendMessage first.
      return { ok: false, reason: 'no_host_permission' };
    }

    await chrome.scripting.executeScript({ target: { tabId }, files: ['dial1_bridge.js'] });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

async function forwardToDial1(payload) {
  const cfg = await getConfig();
  if (!cfg.enabled) return { ok: false, reason: 'disabled' };

  const tab = await findDial1Tab(cfg.dial1BaseUrl);
  if (!tab?.id) {
    await setStatus({ dial1Found: false, lastError: 'No Dial1 tab found' });
    return { ok: false, reason: 'no_tab' };
  }

  await chrome.storage.local.set({ lastDial1TabId: tab.id });

  const message = { type: 'MEET_CAPTION', payload };

  const sendOnce = () =>
    new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve({ ok: true, res });
      });
    });

  let r = await sendOnce();

  if (!r.ok) {
    // Try to inject bridge (only works if host permission granted) then resend.
    await ensureBridgeInTab(tab.id, cfg.dial1BaseUrl);
    r = await sendOnce();
  }

  if (!r.ok) {
    await setStatus({ dial1Found: true, lastError: `Forward failed: ${r.error || 'unknown'}` });
    return { ok: false, reason: 'send_failed' };
  }

  await setStatus({
    dial1Found: true,
    lastForwardedAt: Date.now(),
    lastError: null,
  });

  return { ok: true };
}

chrome.runtime.onInstalled.addListener(() => {
  log('Installed');
  chrome.storage.local.get(['enabled', 'dial1BaseUrl', 'debugMeet'], (res) => {
    chrome.storage.local.set({
      enabled: res.enabled !== false,
      dial1BaseUrl: normalizeBaseUrl(res.dial1BaseUrl) || 'https://dial1.vercel.app/',
      debugMeet: Boolean(res.debugMeet),
    });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'MEET_CAPTION' && msg.payload) {
    setStatus({ lastMeetCaptionAt: Date.now(), meetConnected: true }).catch(() => {});
    forwardToDial1(msg.payload)
      .then((r) => sendResponse?.(r))
      .catch((e) => sendResponse?.({ ok: false, error: String(e?.message || e) }));
    return true;
  }

  if (msg.type === 'MEET_STATUS' && msg.payload) {
    setStatus({
      meetConnected: Boolean(msg.payload.hasContainer) && msg.payload.enabled !== false,
      lastMeetStatusAt: Date.now(),
      lastCaptionSeenAt: msg.payload.lastCaptionSeenAt || null,
      meetHasContainer: Boolean(msg.payload.hasContainer),
      meetEnabled: msg.payload.enabled !== false,
    }).catch(() => {});
    sendResponse?.({ ok: true });
    return true;
  }

  if (msg.type === 'DIAL1_BRIDGE_READY') {
    setStatus({ lastDial1BridgeReadyAt: Date.now(), dial1BridgeOrigin: msg.payload?.origin || null }).catch(() => {});
    sendResponse?.({ ok: true });
    return true;
  }

  if (msg.type === 'DIAL1_FORWARD_ACK') {
    setStatus({ lastDial1AckAt: Date.now() }).catch(() => {});
    sendResponse?.({ ok: true });
    return true;
  }

  if (msg.type === 'POPUP_GET_STATUS') {
    getConfig()
      .then((cfg) =>
        sendResponse?.({
          ok: true,
          config: {
            enabled: cfg.enabled,
            debugMeet: cfg.debugMeet,
            dial1BaseUrl: cfg.dial1BaseUrl || '',
          },
          status: cfg.status || {},
        }),
      )
      .catch((e) => sendResponse?.({ ok: false, error: String(e?.message || e) }));
    return true;
  }

  if (msg.type === 'POPUP_PING_DIAL1') {
    (async () => {
      const cfg = await getConfig();
      const tab = await findDial1Tab(cfg.dial1BaseUrl);
      if (!tab?.id) return sendResponse?.({ ok: false, error: 'No Dial1 tab found' });
      chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (res) => {
        if (chrome.runtime.lastError) {
          sendResponse?.({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse?.({ ok: true, res });
      });
    })().catch((e) => sendResponse?.({ ok: false, error: String(e?.message || e) }));
    return true;
  }

  // ignore
});

log('Background ready');

