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

export type CallLogResult = {
  success: boolean;
  logId: string;
  pipedrive?: { synced: boolean; activity_id: number | null; error: string | null };
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

export type EvidenceClaim = {
  evidence_id: string;
  claim: string;
  source_url: string;
  evidence_snippet: string;
  captured_at: string;
  confidence: 'high' | 'medium' | 'low';
  document_id: string;
  contact_id: string | null;
  status: 'needs_review' | 'approved' | 'rejected';
  approved_claim?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type ApprovedFact = {
  evidence_id: string;
  claim: string;
  source_url: string;
  evidence_snippet: string;
  captured_at: string;
  confidence: 'high' | 'medium' | 'low';
  contact_id?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
};

export type PackGenerateResult = {
  correlation_id: string;
  generation_run_id: string;
  pack_id: string;
  status: 'success' | 'failed';
  quality_report: { passes: boolean; failed_checks: string[] };
};

export type WhisperObjectionResult = {
  correlation_id: string;
  contact_id: string;
  objection_id: string;
  category: string;
  core_fear: string;
  confidence: 'high' | 'medium' | 'low';
  product_evidence_available: boolean;
  hypotheses: Array<{
    hypothesis_id: string;
    hypothesis: string;
    based_on_evidence_ids: string[];
    how_to_verify: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  whisper: {
    validate: { id: string; text: string; evidence_ids: string[]; hypothesis_ids: string[] };
    reframe: { id: string; text: string; evidence_ids: string[]; hypothesis_ids: string[] };
    implication_question: { id: string; text: string; evidence_ids: string[]; hypothesis_ids: string[] };
    next_step: { id: string; text: string; evidence_ids: string[]; hypothesis_ids: string[] };
  };
  policy: {
    never_do: string[];
    always_do: string[];
    preferred_outcome: string;
    primary_value_frame: string[];
  };
};

export type LeadPrepareResult = {
  correlation_id: string;
  generation_run_id: string;
  pack_id: string;
  quality_report: { passes: boolean; failed_checks: string[] };
  pack: any;
  contact: any;
  ingest?: any;
  extracts?: any[];
  auto_review?: any;
};

export type PrecallBrief = {
  brief: string;
  why_now: string;
  opener: string;
  risks: string[];
  questions: string[];
  generated_at: string | null;
};

export type PipedriveTimeline = {
  activities: Array<{
    id: number | string;
    type: string | null;
    subject: string | null;
    done: boolean;
    due_date: string | null;
    add_time: string | null;
    update_time: string | null;
  }>;
  notes: Array<{ id: number | string; add_time: string | null; update_time: string | null; content: string }>;
  deals: Array<{ id: number | string; title: string | null; status: string | null; value: number | null; currency: string | null }>;
};

export type PrecallContextResult = {
  contact: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    company_website: string | null;
    title: string | null;
    linkedin_url: string | null;
    manual_notes: string | null;
  };
  pack: any;
  pack_id: string | null;
  generated: boolean;
  precall: PrecallBrief | null;
  pipedrive: {
    configured: boolean;
    person_id: number | null;
    timeline: PipedriveTimeline | null;
  };
};

export const echoApi = {
  health: () => apiFetch<{ status: string; version?: string; time?: string }>('health'),
  healthDb: () => apiFetch<{ ok: boolean; error?: string }>('health/db'),

  getPipedriveStatus: () => apiFetch<{ configured: boolean }>('integrations/pipedrive'),
  savePipedriveKey: (apiKey: string) =>
    apiFetch<{ success?: boolean; ok?: boolean }>('integrations/pipedrive', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),
  deletePipedriveKey: () => apiFetch<{ success: boolean }>('integrations/pipedrive', { method: 'DELETE' }),
  testPipedrive: () => apiFetch<{ ok: boolean; user?: { id?: number; name?: string; email?: string | null } }>('integrations/pipedrive/test'),
  fetchContacts: () => apiFetch<EchoContact[]>('pipedrive/contacts'),
  importPipedrive: () => apiFetch<{ ok?: boolean; count?: number }>('pipedrive/import', { method: 'POST' }),

  getOpenAiStatus: () => apiFetch<{ configured: boolean }>('integrations/openai'),
  saveOpenAiKey: (apiKey: string) =>
    apiFetch<{ success: boolean }>('integrations/openai', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),
  deleteOpenAiKey: () => apiFetch<{ success: boolean }>('integrations/openai', { method: 'DELETE' }),
  testOpenAi: () => apiFetch<{ ok: boolean; model_count?: number }>('integrations/openai/test'),

  logCall: (payload: CallLogPayload) =>
    apiFetch<CallLogResult>('call-logs', {
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

  evidence: {
    ingestUserNote: (payload: { contact_id: string; note_text: string; note_kind?: string }) =>
      apiFetch<{ correlation_id: string; document_id: string }>('evidence/ingest/user-note', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    ingestUrl: (payload: { contact_id: string; url: string; source_type?: 'company_website' }) =>
      apiFetch<{ correlation_id: string; document_id: string }>('evidence/ingest/url', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    ingestCompanySiteAllowlist: (payload: { contact_id: string; base_url: string }) =>
      apiFetch<{ correlation_id: string; documents: Array<{ document_id: string }>; skipped: Array<{ url: string; reason: string }> }>(
        'evidence/ingest/company-site-allowlist',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    ingestAresRecord: (payload: { contact_id: string; source_url: string; content_text: string }) =>
      apiFetch<{ correlation_id: string; document_id: string }>('evidence/ingest/ares-record', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    ingestInternalProductNote: (payload: { source_url: string; content_text: string }) =>
      apiFetch<{ correlation_id: string; document_id: string }>('evidence/ingest/internal-product-note', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    extract: (payload: { document_id: string; model?: string; prompt_version?: string }) =>
      apiFetch<{ correlation_id: string; extraction_run_id: string; claims: Array<{ evidence_id: string }> }>(
        'evidence/extract',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    listClaims: (params: { contact_id?: string; status?: string } = {}) => {
      const search = new URLSearchParams();
      if (params.contact_id) search.set('contact_id', params.contact_id);
      if (params.status) search.set('status', params.status);
      const suffix = search.toString() ? `?${search.toString()}` : '';
      return apiFetch<{ claims: EvidenceClaim[] }>(`evidence/claims${suffix}`);
    },
    reviewClaim: (evidenceId: string, payload: { status: 'approved' | 'rejected' | 'needs_review'; approved_claim?: string; reviewer_notes?: string }) =>
      apiFetch<{ ok: boolean }>(`evidence/claims/${evidenceId}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listFacts: (params: { contact_id?: string } = {}) => {
      const search = new URLSearchParams();
      if (params.contact_id) search.set('contact_id', params.contact_id);
      const suffix = search.toString() ? `?${search.toString()}` : '';
      return apiFetch<{ facts: ApprovedFact[] }>(`facts${suffix}`);
    },
  },

  packs: {
    generate: (payload: { contact_id: string; include: string[]; language?: string }) =>
      apiFetch<PackGenerateResult>('packs/generate', { method: 'POST', body: JSON.stringify(payload) }),
    get: (packId: string) => apiFetch<any>(`packs/${packId}`),
  },

  lead: {
    prepare: (payload: { contact_id: string; language?: string; include?: string[]; base_url?: string }) =>
      apiFetch<LeadPrepareResult>('lead/prepare', { method: 'POST', body: JSON.stringify(payload) }),
  },

  precall: {
    context: (payload: {
      contact_id: string;
      language?: string;
      include?: string[];
      ttl_hours?: number;
      timeline?: { activities?: number; notes?: number; deals?: number };
    }) => apiFetch<PrecallContextResult>('precall/context', { method: 'POST', body: JSON.stringify(payload) }),
  },

  contacts: {
    patch: (id: string, payload: { company_website?: string | null; linkedin_url?: string | null; manual_notes?: string | null }) =>
      apiFetch<{ success: boolean; contact: any }>(`contacts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  },

  whisper: {
    objection: (payload: { contact_id: string; prospect_text: string }) =>
      apiFetch<WhisperObjectionResult>('whisper/objection', { method: 'POST', body: JSON.stringify(payload) }),
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
