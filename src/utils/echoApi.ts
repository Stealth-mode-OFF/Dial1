import { buildFunctionUrl, isSupabaseConfigured, publicAnonKey } from './supabase/info';

type FetchOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

const authHeaders = () => {
  const headers: Record<string, string> = {};
  if (publicAnonKey) {
    headers.Authorization = `Bearer ${publicAnonKey}`;
  }
  return headers;
};

async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = buildFunctionUrl(path);
  if (!url || !isSupabaseConfigured) {
    throw new Error('Supabase functions are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON responses (e.g., audio) are allowed
    data = text as any;
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export type EchoContact = {
  id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  org_id?: number | null;
  aiScore?: number | null;
};

export type CallLogPayload = {
  campaignId?: string;
  contactId: string;
  contactName?: string;
  companyName?: string;
  disposition: string;
  notes?: string;
  duration?: number;
};

export type AnalyticsSummary = {
  totalCalls: number;
  callsToday?: number;
  connectRate: number;
  revenue: number;
  dispositionBreakdown: Array<{ name: string; value: number }>;
  dailyVolume: Array<{ time: string; value: number }>;
  recentActivity: Array<{ id: string | number; type: string; text: string; time: string; action?: string }>;
};

export type KnowledgeModule = { id: string; title: string; content: string; tags?: string[] };

export type Campaign = { id: string; name: string; description?: string; contacts?: EchoContact[] };

export const echoApi = {
  getPipedriveStatus: () => apiFetch<{ configured: boolean }>('integrations/pipedrive'),
  savePipedriveKey: (apiKey: string) =>
    apiFetch<{ success?: boolean; ok?: boolean }>('integrations/pipedrive', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),
  deletePipedriveKey: () => apiFetch<{ success: boolean }>('integrations/pipedrive', { method: 'DELETE' }),
  fetchContacts: () => apiFetch<EchoContact[]>('pipedrive/contacts'),
  importPipedrive: () => apiFetch<{ ok?: boolean; count?: number }>('pipedrive/import', { method: 'POST' }),

  logCall: (payload: CallLogPayload) =>
    apiFetch<{ success: boolean; logId: string }>('call-logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  analytics: () => apiFetch<AnalyticsSummary>('analytics'),

  campaigns: {
    list: () => apiFetch<Campaign[]>('campaigns'),
    create: (payload: { name: string; description?: string; contacts?: EchoContact[] }) =>
      apiFetch<{ success: boolean; id: string }>('campaigns', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    remove: (id: string) => apiFetch<{ success: boolean }>(`campaigns/${id}`, { method: 'DELETE' }),
  },

  knowledge: {
    list: () => apiFetch<KnowledgeModule[]>('knowledge'),
    create: (payload: { title: string; content: string; tags?: string[] }) =>
      apiFetch<{ success: boolean; module: KnowledgeModule }>('knowledge', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    remove: (id: string) => apiFetch<{ success: boolean }>(`knowledge/${id}`, { method: 'DELETE' }),
  },

  ai: {
    spinNext: (payload: any) =>
      apiFetch<any>('ai/spin/next', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    analyzeCall: (payload: any) =>
      apiFetch<any>('ai/analyze-call', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    generate: (payload: any) =>
      apiFetch<any>('ai/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    sectorBattleCard: (payload: { companyName: string; industry?: string; personTitle?: string }) =>
      apiFetch<any>('ai/sector-battle-card', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};

export { apiFetch };
