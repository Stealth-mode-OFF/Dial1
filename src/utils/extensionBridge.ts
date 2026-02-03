type ExtensionHello = {
  type: 'ECHO_EXTENSION_HELLO';
  version?: string;
  capabilities?: { dial?: boolean; meetCaptions?: boolean };
};

type ExtensionAck = {
  type: 'ECHO_WEBAPP_ACK';
  received_at: number;
};

type DialRequest = {
  type: 'ECHO_DIAL_REQUEST';
  request_id: string;
  payload: {
    phone: string;
    contact?: { id: string; name?: string; company?: string | null };
  };
};

type DialAck = {
  type: 'ECHO_DIAL_ACK';
  request_id: string;
  ok: boolean;
  error?: string;
};

type MeetCaptionChunk = {
  type: 'ECHO_MEET_CAPTION_CHUNK';
  payload: { text: string; speaker?: string; captured_at: number; meeting_url?: string };
};

type ExtensionMessage = ExtensionHello | DialAck | MeetCaptionChunk;

export type ExtensionStatus = {
  connected: boolean;
  last_seen_at: number | null;
  capabilities: { dial: boolean; meetCaptions: boolean };
};

const STORAGE_KEY = 'echo.extension.status';

const defaultStatus: ExtensionStatus = {
  connected: false,
  last_seen_at: null,
  capabilities: { dial: false, meetCaptions: false },
};

export const getExtensionStatus = (): ExtensionStatus => {
  if (typeof window === 'undefined') return defaultStatus;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStatus;
    const parsed = JSON.parse(raw);
    return {
      connected: Boolean(parsed.connected),
      last_seen_at: typeof parsed.last_seen_at === 'number' ? parsed.last_seen_at : null,
      capabilities: {
        dial: Boolean(parsed?.capabilities?.dial),
        meetCaptions: Boolean(parsed?.capabilities?.meetCaptions),
      },
    };
  } catch {
    return defaultStatus;
  }
};

const setExtensionStatus = (next: ExtensionStatus) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

export const listenToExtension = (handlers: {
  onStatus?: (status: ExtensionStatus) => void;
  onMeetCaption?: (chunk: MeetCaptionChunk['payload']) => void;
  onDialAck?: (ack: DialAck) => void;
}) => {
  if (typeof window === 'undefined') return () => {};

  const onMessage = (event: MessageEvent) => {
    const data = event.data as ExtensionMessage | null;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'ECHO_EXTENSION_HELLO') {
      const status: ExtensionStatus = {
        connected: true,
        last_seen_at: Date.now(),
        capabilities: {
          dial: Boolean(data.capabilities?.dial),
          meetCaptions: Boolean(data.capabilities?.meetCaptions),
        },
      };
      setExtensionStatus(status);
      handlers.onStatus?.(status);
      const ack: ExtensionAck = { type: 'ECHO_WEBAPP_ACK', received_at: Date.now() };
      window.postMessage(ack, '*');
      return;
    }

    if (data.type === 'ECHO_MEET_CAPTION_CHUNK') {
      const status = { ...getExtensionStatus(), connected: true, last_seen_at: Date.now() };
      setExtensionStatus(status);
      handlers.onStatus?.(status);
      handlers.onMeetCaption?.(data.payload);
      return;
    }

    if (data.type === 'ECHO_DIAL_ACK') {
      const status = { ...getExtensionStatus(), connected: true, last_seen_at: Date.now() };
      setExtensionStatus(status);
      handlers.onStatus?.(status);
      handlers.onDialAck?.(data);
    }
  };

  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
};

const normalizePhone = (input: string) => input.replace(/[^\d+]/g, '');

export const requestExtensionDial = async (payload: DialRequest['payload'], timeoutMs = 900) => {
  if (typeof window === 'undefined') return { ok: false as const, error: 'no_window' };

  const status = getExtensionStatus();
  if (!status.connected || !status.capabilities.dial) {
    return { ok: false as const, error: 'extension_not_connected' };
  }

  const requestId = crypto.randomUUID();
  const phone = normalizePhone(payload.phone);
  if (!phone) return { ok: false as const, error: 'missing_phone' };

  const msg: DialRequest = { type: 'ECHO_DIAL_REQUEST', request_id: requestId, payload: { ...payload, phone } };

  return await new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: 'timeout' });
    }, timeoutMs);

    const onAck = (ack: DialAck) => {
      if (ack.request_id !== requestId) return;
      cleanup();
      if (ack.ok) resolve({ ok: true });
      else resolve({ ok: false, error: ack.error || 'dial_failed' });
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      unsub();
    };

    const unsub = listenToExtension({ onDialAck: onAck });
    window.postMessage(msg, '*');
  });
};

export const dialViaTelLink = (phone: string) => {
  if (typeof window === 'undefined') return;
  if (import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true') return;
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  window.location.href = `tel:${normalized}`;
};
