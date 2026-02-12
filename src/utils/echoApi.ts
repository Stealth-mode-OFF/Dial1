import {
  buildFunctionUrl,
  isSupabaseConfigured,
  publicAnonKey,
} from "./supabase/info";
import { supabaseClient } from "./supabase/client";

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

const accessToken = async (): Promise<string | null> => {
  try {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) return null;
    const token = data?.session?.access_token;
    return token ? String(token) : null;
  } catch {
    return null;
  }
};

const authHeaders = async () => {
  const headers: Record<string, string> = {};
  if (publicAnonKey) {
    // Required by Supabase Edge Functions gateway.
    headers.apikey = publicAnonKey;
  }
  // Use user JWT when present (required for protected endpoints).
  const token = await accessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (publicAnonKey) headers.Authorization = `Bearer ${publicAnonKey}`; // allow /health unauthenticated
  return headers;
};

async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const url = buildFunctionUrl(path);
  if (!url || !isSupabaseConfigured) {
    throw new Error(
      "Supabase functions are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
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
    const message =
      data?.error || data?.message || `Request failed (${res.status})`;
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
  qualAnswers?: string[];
};

export type CallLogResult = {
  success: boolean;
  logId: string;
  pipedrive?: {
    synced: boolean;
    activity_id: number | null;
    person_id?: number | null;
    org_id?: number | null;
    error: string | null;
  };
};

export type GmailStatus = { configured: boolean; email?: string };
export type EmailType =
  | "cold"
  | "demo-followup"
  | "sequence-d1"
  | "sequence-d3"
  | (string & {});
export type EmailLogSource =
  | "manual"
  | "gmail-draft"
  | "auto-sequence"
  | (string & {});

export type EmailLogCreatePayload = {
  contactId: string;
  contactName?: string;
  company?: string;
  emailType: EmailType;
  subject?: string;
  body?: string;
  recipientEmail?: string;
  gmailDraftId?: string;
  source?: EmailLogSource;
  sentAt?: string;
};

export type EmailLogItem = {
  id: string;
  email_type: string;
  subject: string | null;
  sent_at: string | null;
  source: string | null;
  gmail_draft_id: string | null;
  recipient_email: string | null;
};

export type EmailScheduleStatus =
  | "pending"
  | "draft-created"
  | "cancelled"
  | "sent"
  | (string & {});
export type EmailScheduleRow = {
  id: string;
  contact_id: string;
  email_type: string;
  scheduled_for: string;
  status: EmailScheduleStatus;
  context: any;
  created_at: string;
};

export type GmailCreateDraftPayload = {
  to: string;
  subject: string;
  body: string;
  bcc?: string;
  log?: Pick<
    EmailLogCreatePayload,
    "contactId" | "contactName" | "company" | "emailType"
  >;
};
export type GmailCreateDraftResult = {
  ok: boolean;
  draftId: string;
  gmailUrl: string;
  error?: string;
};

export type AnalyticsSummary = {
  totalCalls: number;
  callsToday?: number;
  connectRate: number;
  revenue: number;
  dispositionBreakdown: Array<{ name: string; value: number }>;
  dailyVolume: Array<{ time: string; value: number }>;
  recentActivity: Array<{
    id: string | number;
    type: string;
    text: string;
    time: string;
    action?: string;
  }>;
};

export type KnowledgeModule = {
  id: string;
  title: string;
  content: string;
  tags?: string[];
};

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  contacts?: EchoContact[];
};

export type EvidenceClaim = {
  evidence_id: string;
  claim: string;
  source_url: string;
  evidence_snippet: string;
  captured_at: string;
  confidence: "high" | "medium" | "low";
  document_id: string;
  contact_id: string | null;
  status: "needs_review" | "approved" | "rejected";
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
  confidence: "high" | "medium" | "low";
  contact_id?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
};

export type PackGenerateResult = {
  correlation_id: string;
  generation_run_id: string;
  pack_id: string;
  status: "success" | "failed";
  quality_report: { passes: boolean; failed_checks: string[] };
};

export type WhisperObjectionResult = {
  correlation_id: string;
  contact_id: string;
  objection_id: string;
  category: string;
  core_fear: string;
  confidence: "high" | "medium" | "low";
  product_evidence_available: boolean;
  hypotheses: Array<{
    hypothesis_id: string;
    hypothesis: string;
    based_on_evidence_ids: string[];
    how_to_verify: string;
    priority: "high" | "medium" | "low";
  }>;
  whisper: {
    validate: {
      id: string;
      text: string;
      evidence_ids: string[];
      hypothesis_ids: string[];
    };
    reframe: {
      id: string;
      text: string;
      evidence_ids: string[];
      hypothesis_ids: string[];
    };
    implication_question: {
      id: string;
      text: string;
      evidence_ids: string[];
      hypothesis_ids: string[];
    };
    next_step: {
      id: string;
      text: string;
      evidence_ids: string[];
      hypothesis_ids: string[];
    };
  };
  policy: {
    never_do: string[];
    always_do: string[];
    preferred_outcome: string;
    primary_value_frame: string[];
  };
};

type SalesStyle = "hunter" | "consultative";

type AIGenerateBase = {
  contactName: string;
  company: string;
  goal?: string;
  salesStyle?: SalesStyle;
  contextData?: Record<string, unknown>;
};

export type EmailColdPayload = AIGenerateBase & {
  type: "email" | "email-cold";
  goal: string;
  contextData?: {
    outcome?: string;
    duration_sec?: number;
    notes?: string;
    aiAnalysis?: unknown;
  } & Record<string, unknown>;
};

export type EmailDemoPayload = AIGenerateBase & {
  type: "email-demo";
  goal: string;
  contextData?: {
    totalTimeSec?: number;
    phaseTimes?: Record<string, number>;
    aiAnalysis?: unknown;
    keyCaptions?: string;
    notes?: string;
    outcome?: string;
    duration_sec?: number;
  } & Record<string, unknown>;
};

export type SpinScriptPayload = AIGenerateBase & {
  type: "spin-script";
  goal: string;
  contextData?: {
    contact_id?: string;
    role?: string;
    industry?: string;
    notes?: string;
  } & Record<string, unknown>;
};

export type CallIntelligencePayload = AIGenerateBase & {
  type: "call-intelligence";
  contextData?: Record<string, unknown>;
};

export type BattleCardPayload = AIGenerateBase & {
  type: "battle_card";
  contextData: { objection: string } & Record<string, unknown>;
};

export type AnalysisPayload = AIGenerateBase & {
  type: "analysis";
  contextData: {
    notes: string;
    outcome?: string;
    instruction?: string;
  } & Record<string, unknown>;
};

export type CoachWorkspaceScriptPayload = AIGenerateBase & { type: "script" };
export type CoachWorkspaceResearchPayload = AIGenerateBase & {
  type: "research";
};

export type AIGeneratePayload =
  | EmailColdPayload
  | EmailDemoPayload
  | SpinScriptPayload
  | CallIntelligencePayload
  | BattleCardPayload
  | AnalysisPayload
  | CoachWorkspaceScriptPayload
  | CoachWorkspaceResearchPayload;

export type AIGenerateResultByType = {
  email: { content: string };
  "email-cold": { content: string };
  "email-demo": { content: string };
  script: { content: string } & Record<string, unknown>;
  research: Record<string, unknown>;
  "spin-script": {
    error?: string;
    script?: {
      totalDuration?: string;
      blocks?: Array<{
        phase?: string;
        title?: string;
        duration?: string;
        content?: string;
        questions?: string[];
        tips?: string[];
        transitions?: string[];
      }>;
      closingTechniques?: Array<{ name: string; script: string }>;
      objectionHandlers?: Array<{ objection: string; response: string }>;
    };
  } & Record<string, unknown>;
  "call-intelligence": {
    error?: string;
    companyInsight?: string;
    painPoints?: string[];
    openingLine?: string;
    qualifyingQuestions?: string[];
    objectionHandlers?: Array<{
      objection?: string;
      response?: string;
      trigger?: string;
      rebuttal?: string;
    }>;
    competitorMentions?: string[];
    recentNews?: string;
    decisionMakerTips?: string;
    bookingScript?: string;
    challengerInsight?: string;
    certaintyBuilders?: { product: string; you: string; company: string };
    callTimeline?: Array<{
      stage: string;
      time: string;
      goal: string;
      say: string;
      tonality: string;
    }>;
    loopingScripts?: Array<{ trigger: string; loop: string }>;
  } & Record<string, unknown>;
  battle_card: {
    error?: string;
    validate?: string;
    empathize?: string;
    reframe?: string;
    response?: string;
    implication_question?: string;
    follow_up?: string;
    next_step?: string;
    close?: string;
  } & Record<string, unknown>;
  analysis: {
    error?: string;
    summary?: string;
    analysis?: string;
    content?: string;
  } & Record<string, unknown>;
};

export type AIGenerateResult<T extends AIGeneratePayload> =
  AIGenerateResultByType[T["type"]];

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
  notes: Array<{
    id: number | string;
    add_time: string | null;
    update_time: string | null;
    content: string;
  }>;
  deals: Array<{
    id: number | string;
    title: string | null;
    status: string | null;
    value: number | null;
    currency: string | null;
  }>;
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
  health: () =>
    apiFetch<{ status: string; version?: string; time?: string }>("health"),
  healthDb: () => apiFetch<{ ok: boolean; error?: string }>("health/db"),

  gmail: {
    getStatus: () => apiFetch<GmailStatus>("gmail/status"),
    createDraft: (payload: GmailCreateDraftPayload) =>
      apiFetch<GmailCreateDraftResult>("gmail/create-draft", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    disconnect: () =>
      apiFetch<{ ok: boolean; error?: string }>("gmail/disconnect", {
        method: "POST",
      }),
    test: () => apiFetch<{ ok: boolean; error?: string }>("gmail/test"),
    buildAuthUrl: (redirectTo: string) => {
      const url = buildFunctionUrl(
        `gmail/auth?redirectTo=${encodeURIComponent(redirectTo)}`,
      );
      if (!url) throw new Error("Supabase functions are not configured.");
      return url;
    },
  },

  email: {
    log: (payload: EmailLogCreatePayload) =>
      apiFetch<{ ok: boolean; id?: string; error?: string }>("email/log", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    history: (contactId: string) =>
      apiFetch<{ ok: boolean; emails: EmailLogItem[]; error?: string }>(
        `email/history?contact_id=${encodeURIComponent(contactId)}`,
      ),
  },

  emailSchedule: {
    create: (payload: {
      contactId: string;
      schedules: Array<{
        emailType: EmailType;
        scheduledFor: string;
        context?: any;
      }>;
    }) =>
      apiFetch<{ ok: boolean; schedules: EmailScheduleRow[]; error?: string }>(
        "email/schedule",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    cancel: (payload: { contactId?: string; scheduleId?: string }) =>
      apiFetch<{ ok: boolean; error?: string }>("email/schedule/cancel", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    active: (params: { contactId?: string } = {}) => {
      const search = new URLSearchParams();
      if (params.contactId) search.set("contact_id", params.contactId);
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return apiFetch<{
        ok: boolean;
        schedules: EmailScheduleRow[];
        error?: string;
      }>(`email/schedule/active${suffix}`);
    },
  },

  getPipedriveStatus: () =>
    apiFetch<{ configured: boolean }>("integrations/pipedrive"),
  savePipedriveKey: (apiKey: string) =>
    apiFetch<{ success?: boolean; ok?: boolean }>("integrations/pipedrive", {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    }),
  deletePipedriveKey: () =>
    apiFetch<{ success: boolean }>("integrations/pipedrive", {
      method: "DELETE",
    }),
  testPipedrive: () =>
    apiFetch<{
      ok: boolean;
      user?: { id?: number; name?: string; email?: string | null };
    }>("integrations/pipedrive/test"),
  fetchContacts: () => apiFetch<EchoContact[]>("pipedrive/contacts?limit=30"),
  importPipedrive: () =>
    apiFetch<{ ok?: boolean; count?: number }>("pipedrive/import", {
      method: "POST",
    }),
  addPipedriveNote: (payload: {
    personId?: number;
    orgId?: number;
    content: string;
  }) =>
    apiFetch<{ success: boolean; noteId?: number }>("pipedrive/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOpenAiStatus: () =>
    apiFetch<{ configured: boolean }>("integrations/openai"),
  saveOpenAiKey: (apiKey: string) =>
    apiFetch<{ success: boolean }>("integrations/openai", {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    }),
  deleteOpenAiKey: () =>
    apiFetch<{ success: boolean }>("integrations/openai", { method: "DELETE" }),
  testOpenAi: () =>
    apiFetch<{ ok: boolean; model_count?: number }>("integrations/openai/test"),

  logCall: (payload: CallLogPayload) =>
    apiFetch<CallLogResult>("call-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  analytics: () => apiFetch<AnalyticsSummary>("analytics"),

  campaigns: {
    list: () => apiFetch<Campaign[]>("campaigns"),
    create: (payload: {
      name: string;
      description?: string;
      contacts?: EchoContact[];
    }) =>
      apiFetch<{ success: boolean; id: string }>("campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      apiFetch<{ success: boolean }>(`campaigns/${id}`, { method: "DELETE" }),
  },

  knowledge: {
    list: () => apiFetch<KnowledgeModule[]>("knowledge"),
    create: (payload: { title: string; content: string; tags?: string[] }) =>
      apiFetch<{ success: boolean; module: KnowledgeModule }>("knowledge", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      apiFetch<{ success: boolean }>(`knowledge/${id}`, { method: "DELETE" }),
  },

  evidence: {
    ingestUserNote: (payload: {
      contact_id: string;
      note_text: string;
      note_kind?: string;
    }) =>
      apiFetch<{ correlation_id: string; document_id: string }>(
        "evidence/ingest/user-note",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    ingestUrl: (payload: {
      contact_id: string;
      url: string;
      source_type?: "company_website";
    }) =>
      apiFetch<{ correlation_id: string; document_id: string }>(
        "evidence/ingest/url",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    ingestCompanySiteAllowlist: (payload: {
      contact_id: string;
      base_url: string;
    }) =>
      apiFetch<{
        correlation_id: string;
        documents: Array<{ document_id: string }>;
        skipped: Array<{ url: string; reason: string }>;
      }>("evidence/ingest/company-site-allowlist", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    ingestAresRecord: (payload: {
      contact_id: string;
      source_url: string;
      content_text: string;
    }) =>
      apiFetch<{ correlation_id: string; document_id: string }>(
        "evidence/ingest/ares-record",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    ingestInternalProductNote: (payload: {
      source_url: string;
      content_text: string;
    }) =>
      apiFetch<{ correlation_id: string; document_id: string }>(
        "evidence/ingest/internal-product-note",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    extract: (payload: {
      document_id: string;
      model?: string;
      prompt_version?: string;
    }) =>
      apiFetch<{
        correlation_id: string;
        extraction_run_id: string;
        claims: Array<{ evidence_id: string }>;
      }>("evidence/extract", { method: "POST", body: JSON.stringify(payload) }),
    listClaims: (params: { contact_id?: string; status?: string } = {}) => {
      const search = new URLSearchParams();
      if (params.contact_id) search.set("contact_id", params.contact_id);
      if (params.status) search.set("status", params.status);
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return apiFetch<{ claims: EvidenceClaim[] }>(`evidence/claims${suffix}`);
    },
    reviewClaim: (
      evidenceId: string,
      payload: {
        status: "approved" | "rejected" | "needs_review";
        approved_claim?: string;
        reviewer_notes?: string;
      },
    ) =>
      apiFetch<{ ok: boolean }>(`evidence/claims/${evidenceId}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    listFacts: (params: { contact_id?: string } = {}) => {
      const search = new URLSearchParams();
      if (params.contact_id) search.set("contact_id", params.contact_id);
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return apiFetch<{ facts: ApprovedFact[] }>(`facts${suffix}`);
    },
  },

  packs: {
    generate: (payload: {
      contact_id: string;
      include: string[];
      language?: string;
    }) =>
      apiFetch<PackGenerateResult>("packs/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (packId: string) => apiFetch<any>(`packs/${packId}`),
  },

  lead: {
    prepare: (payload: {
      contact_id: string;
      language?: string;
      include?: string[];
      base_url?: string;
    }) =>
      apiFetch<LeadPrepareResult>("lead/prepare", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  precall: {
    context: (payload: {
      contact_id: string;
      language?: string;
      include?: string[];
      ttl_hours?: number;
      timeline?: { activities?: number; notes?: number; deals?: number };
    }) =>
      apiFetch<PrecallContextResult>("precall/context", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  contacts: {
    patch: (
      id: string,
      payload: {
        company_website?: string | null;
        linkedin_url?: string | null;
        manual_notes?: string | null;
      },
    ) =>
      apiFetch<{ success: boolean; contact: any }>(`contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },

  whisper: {
    objection: (payload: { contact_id: string; prospect_text: string }) =>
      apiFetch<WhisperObjectionResult>("whisper/objection", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  ai: {
    spinNext: (payload: any) =>
      apiFetch<any>("ai/spin/next", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    analyzeCall: (payload: any) =>
      apiFetch<any>("ai/analyze-call", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    generate: <T extends AIGeneratePayload>(payload: T) =>
      apiFetch<AIGenerateResult<T>>("ai/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    sectorBattleCard: (payload: {
      companyName: string;
      industry?: string;
      personTitle?: string;
    }) =>
      apiFetch<any>("ai/sector-battle-card", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    brief: (payload: import("../types/contracts").BriefRequest) =>
      apiFetch<import("../types/contracts").Brief>("ai/brief", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    callScript: (payload: import("../types/contracts").CallScriptRequest) =>
      apiFetch<import("../types/contracts").CallScript>("ai/call-script", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    liveCoach: (payload: import("../types/contracts").LiveCoachRequest) =>
      apiFetch<import("../types/contracts").LiveCoachResponse>(
        "ai/live-coach",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
  },

  transcript: {
    analyze: (payload: {
      rawTranscript: string;
      contactName?: string;
      contactCompany?: string;
      contactRole?: string;
      durationSeconds?: number;
      meSpeakerOverride?: string;
    }) =>
      apiFetch<TranscriptAnalysisResult>("transcript/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    list: (limit = 20, offset = 0) =>
      apiFetch<{ analyses: TranscriptAnalysisSummary[]; total: number }>(
        `transcript/analyses?limit=${limit}&offset=${offset}`,
      ),
    get: (id: string) => apiFetch<any>(`transcript/analyses/${id}`),
    stats: (days = 30) =>
      apiFetch<TranscriptDashboardStats>(`transcript/stats?days=${days}`),
  },
};

// Transcript analysis types
export interface TranscriptAnalysisResult {
  id: string | null;
  metrics: {
    talkRatioMe: number;
    talkRatioProspect: number;
    totalWordsMe: number;
    totalWordsProspect: number;
    fillerWords: Record<string, number>;
    fillerWordRate: number;
    turnCount: number;
    speakers: string[];
    meSpeaker: string;
  };
  analysis: {
    score: number;
    summary: string;
    categoryScores: Record<string, { score: number; note: string }>;
    strengths: string[];
    weaknesses: string[];
    coachingTip: string;
    fillerWordsAnalysis: string;
    talkRatioAnalysis: string;
    spinCoverage: Record<
      string,
      { count: number; examples: string[]; quality: string }
    >;
    questionsAsked: {
      text: string;
      type: string;
      phase: string;
      quality: string;
    }[];
    objectionsHandled: {
      objection: string;
      response: string;
      quality: string;
    }[];
    spinNotesPipedrive: string;
  };
  saved: boolean;
}

export interface TranscriptAnalysisSummary {
  id: string;
  contact_name: string | null;
  contact_company: string | null;
  contact_role: string | null;
  call_date: string;
  duration_seconds: number | null;
  ai_score: number | null;
  ai_summary: string | null;
  talk_ratio_me: number | null;
  talk_ratio_prospect: number | null;
  filler_word_rate: number | null;
  spin_stage_coverage: any;
  created_at: string;
}

export interface TranscriptDashboardStats {
  totalCalls: number;
  avgScore: number;
  avgTalkRatio: number;
  avgFillerRate: number;
  trend: {
    date: string;
    score: number;
    talkRatio: number;
    fillerRate: number;
  }[];
  questionStats: Record<
    string,
    { total: number; strong: number; weak: number }
  >;
  objectionStats: { total: number; good: number; weak: number; missed: number };
}

export { apiFetch };
