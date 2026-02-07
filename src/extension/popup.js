// Extension Popup Script
// Configure Dial1 URL + debug, and show forwarding health.

function $(id) {
  return document.getElementById(id);
}

function formatAge(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

function normalizeBaseUrl(input) {
  const raw = (input || '').toString().trim();
  if (!raw) return '';
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return `${u.origin}/`;
  } catch {
    return '';
  }
}

async function getActiveTabOrigin() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return '';
  try {
    return new URL(tab.url).origin;
  } catch {
    return '';
  }
}

async function requestOriginPermission(origin) {
  // Do not prompt for origins we already declare in manifest host_permissions.
  if (
    origin === "https://dial1.vercel.app" ||
    origin === "http://localhost:5173" ||
    origin === "http://127.0.0.1:5173" ||
    origin === "http://localhost:3000" ||
    origin === "http://127.0.0.1:3000"
  ) {
    return true;
  }
  return await new Promise((resolve) => {
    chrome.permissions.request({ origins: [`${origin}/*`] }, (granted) => resolve(Boolean(granted)));
  });
}

async function loadSettings() {
  return await new Promise((resolve) => {
    chrome.storage.local.get(['dial1BaseUrl', 'enabled', 'debugMeet'], (res) => {
      resolve({
        dial1BaseUrl: res.dial1BaseUrl || 'https://dial1.vercel.app/',
        enabled: res.enabled !== false,
        debugMeet: Boolean(res.debugMeet),
      });
    });
  });
}

async function saveSettings(next) {
  return await new Promise((resolve) => chrome.storage.local.set(next, () => resolve(true)));
}

async function getStatus() {
  return await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'POPUP_GET_STATUS' }, (res) => resolve(res || { ok: false }));
  });
}

async function pingDial1() {
  return await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'POPUP_PING_DIAL1' }, (res) => resolve(res || { ok: false }));
  });
}

function setError(text) {
  const el = $('error');
  el.textContent = text || '';
  el.style.display = text ? 'block' : 'none';
}

function setInfo(text) {
  const el = $('info');
  el.textContent = text || '';
  el.style.display = text ? 'block' : 'none';
}

function setStatusDot(connected) {
  const dot = $('statusDot');
  const label = $('statusLabel');
  if (connected) {
    dot.classList.add('active');
    label.textContent = 'Active';
  } else {
    dot.classList.remove('active');
    label.textContent = 'Idle';
  }
}

async function render() {
  const res = await getStatus();
  if (!res?.ok) return;

  const status = res.status || {};
  const cfg = res.config || {};

  const now = Date.now();
  $('meetLast').textContent = status.lastMeetCaptionAt ? formatAge(now - status.lastMeetCaptionAt) : '—';
  $('fwdLast').textContent = status.lastForwardedAt ? formatAge(now - status.lastForwardedAt) : '—';
  $('dial1Found').textContent = status.dial1Found ? 'Yes' : 'No';
  $('lastErr').textContent = status.lastError ? status.lastError : '—';

  const active = cfg.enabled && (status.lastForwardedAt || status.lastMeetCaptionAt);
  setStatusDot(Boolean(active));
}

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();

  $('dial1Url').value = settings.dial1BaseUrl;
  $('enabled').checked = settings.enabled;
  $('debug').checked = settings.debugMeet;

  $('useCurrentTab').addEventListener('click', async () => {
    setError('');
    const origin = await getActiveTabOrigin();
    if (!origin) return setError('Could not read current tab URL.');
    $('dial1Url').value = `${origin}/`;
    setInfo('Dial1 URL set from current tab.');
  });

  $('openDial1').addEventListener('click', async () => {
    const base = normalizeBaseUrl($('dial1Url').value) || 'https://dial1.vercel.app/';
    await chrome.tabs.create({ url: base });
  });

  $('save').addEventListener('click', async () => {
    setError('');
    setInfo('');
    const base = normalizeBaseUrl($('dial1Url').value);
    if (!base) return setError('Enter a valid Dial1 URL (e.g. https://dial1.vercel.app).');

    // Request optional permission if needed (e.g. vercel preview).
    const origin = new URL(base).origin;
    const granted = await requestOriginPermission(origin);
    if (!granted) {
      // Not fatal for dial1.vercel.app / localhost (already in host_permissions),
      // but for other domains it may prevent the bridge from loading.
      setInfo('Permission not granted. If this is a custom domain, forwarding may not work.');
    }

    await saveSettings({
      dial1BaseUrl: base,
      enabled: $('enabled').checked,
      debugMeet: $('debug').checked,
    });
    setInfo('Saved.');
    await render();
  });

  $('ping').addEventListener('click', async () => {
    setError('');
    const res = await pingDial1();
    if (!res?.ok) return setError(res?.error || 'Ping failed.');
    setInfo('Dial1 bridge responded.');
  });

  await render();
  setInterval(render, 1000);
});
