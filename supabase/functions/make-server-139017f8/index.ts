import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import OpenAI from "npm:openai";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.ts";

const app = new Hono();

// Bump when deploying edge function changes; exposed via GET /health.
const FUNCTION_VERSION = "2026-02-08-settings-v1";

// Enable logger
app.use('*', logger(console.log));

const allowedOriginPatterns = (Deno.env.get("ECHO_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isOriginAllowed = (origin: string | undefined | null) => {
  if (!origin) return false;
  // SECURITY: default deny. Configure ECHO_ALLOWED_ORIGINS for browser access.
  if (allowedOriginPatterns.length === 0) return false;
  const normalized = origin.toString().trim();
  if (!normalized) return false;

  for (const pattern of allowedOriginPatterns) {
    if (pattern === "*") return true;
    if (!pattern.includes("*")) {
      if (pattern === normalized) return true;
      continue;
    }

    const re = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`);
    if (re.test(normalized)) return true;
  }

  return false;
};

// Enable CORS
app.use(
  "/*",
  cors({
    origin: (origin) => {
      // SECURITY: never return "*" here; allow only explicit origins.
      return isOriginAllowed(origin) ? origin : "";
    },
    allowHeaders: ["Content-Type", "Authorization", "apikey", "X-Echo-User", "X-Correlation-Id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Supabase already routes requests to /functions/v1/<functionName> into this handler.
// Routes must be root-relative (no extra /<functionName> prefix) otherwise callers hit 404.
const BASE_PATH = "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const userKey = (userId: string, key: string) => `user:${userId}:${key}`;
const userPrefix = (userId: string, prefix: string) => `user:${userId}:${prefix}`;

const getAuthUserId = async (authHeader: string | null) => {
  if (!authHeader || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch (e) {
    console.error("Auth lookup failed:", e);
    return null;
  }
};

const resolveUserId = async (c: any) => {
  const authHeader = c.req.header("Authorization") || null;
  const authUserId = await getAuthUserId(authHeader);
  if (authUserId) return authUserId;
  return null;
};

const getUserId = (c: any) => c.get("userId") as string;

const getAdminClient = () => {
  // SECURITY: server-only DB access should use service role to avoid relying on
  // client-facing keys + RLS for backend functionality.
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

const getCorrelationId = (c: any) => {
  const header = c.req.header("x-correlation-id");
  const trimmed = header?.toString().trim();
  if (trimmed) return trimmed;
  return crypto.randomUUID();
};

const sha256Hex = async (input: string) => {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const auditEvent = async (
  admin: any,
  ownerUserId: string,
  correlationId: string,
  step: "ingest" | "extract" | "review" | "generate" | "export",
  eventType: string,
  payload: Record<string, unknown> = {},
) => {
  try {
    await admin.from("audit_events").insert({
      owner_user_id: ownerUserId,
      correlation_id: correlationId,
      step,
      event_type: eventType,
      payload,
    });
  } catch (e) {
    console.error("audit_events insert failed (non-blocking):", e);
  }
};

const requireAdmin = (c: any) => {
  const admin = getAdminClient();
  if (!admin) {
    return {
      admin: null,
      error: c.json({ error: "Supabase DB client not configured. Set SUPABASE_URL + (SUPABASE_SERVICE_ROLE_KEY recommended)." }, 500),
    };
  }
  return { admin, error: null };
};

const parseJsonStrict = async (res: Response) => {
  const text = await res.text();
  try {
    return { ok: true as const, value: text ? JSON.parse(text) : null, raw: text };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e), raw: text };
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- BASIC ABUSE CONTROLS ---
// Note: Edge functions are horizontally scaled; this is a best-effort in-memory limiter per instance.
type RateLimitState = { count: number; resetAt: number };
const RATE_LIMIT = new Map<string, RateLimitState>();

const getClientIp = (c: any) => {
  const direct =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-client-ip") ||
    null;
  if (direct) return direct.toString().split(",")[0].trim();

  const fwd = c.req.header("x-forwarded-for");
  if (!fwd) return null;
  return fwd.toString().split(",")[0].trim();
};

const rateLimit = (key: string, max: number, windowMs: number) => {
  const now = Date.now();
  const existing = RATE_LIMIT.get(key);
  if (!existing || existing.resetAt <= now) {
    RATE_LIMIT.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: Math.max(0, max - 1) };
  }

  if (existing.count >= max) return { ok: false as const, retryAfterMs: existing.resetAt - now };
  existing.count += 1;
  return { ok: true as const, remaining: Math.max(0, max - existing.count) };
};

const maybePruneRateLimit = () => {
  if (RATE_LIMIT.size < 2_000) return;
  const now = Date.now();
  for (const [k, v] of RATE_LIMIT.entries()) {
    if (v.resetAt <= now) RATE_LIMIT.delete(k);
  }
};

const toPdDurationHHMM = (seconds: unknown) => {
  const secNum = typeof seconds === "number" ? seconds : Number(seconds);
  if (!Number.isFinite(secNum) || secNum <= 0) return "00:00";
  const totalMins = Math.floor(secNum / 60);
  const hh = String(Math.floor(totalMins / 60)).padStart(2, "0");
  const mm = String(totalMins % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const formatActivityNoteHtml = (noteText: string) => {
  const raw = (noteText || "").toString();
  if (!raw.trim()) return "";
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    .replace(/(Result:|Outcome:|AI Summary:|Summary:|Score:|Strengths:|Next step:|Next Step:)/g, "<b>$1</b>");
};

const generateCallNoteForPipedrive = async (params: {
  language: string;
  disposition: string;
  durationSec?: unknown;
  notes?: unknown;
  contact?: { name?: string | null; title?: string | null; company?: string | null };
  openaiApiKey?: string | null;
}) => {
  const apiKey = (params.openaiApiKey || Deno.env.get("OPENAI_API_KEY") || "").toString().trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const language = params.language || "cs";
  const notes = typeof params.notes === "string" ? params.notes.trim() : "";
  const durationHHMM = toPdDurationHHMM(params.durationSec);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          `You write short CRM activity notes for B2B sales calls. Output ONLY a JSON object. Language: ${language}.` +
          ` Be factual and concise. If notes are thin, output validation questions instead of assumptions.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          schema: {
            outcome: "string (short label)",
            key_points: "string[] (3 bullets max)",
            next_step: "string (1 short sentence)",
          },
          contact: params.contact || {},
          disposition: params.disposition,
          duration: durationHHMM,
          raw_notes: notes,
        }),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    const outcome = (parsed?.outcome || params.disposition || "call").toString().trim();
    const keyPoints: string[] = Array.isArray(parsed?.key_points)
      ? parsed.key_points.map((x: any) => String(x)).filter(Boolean).slice(0, 3)
      : [];
    const nextStep = (parsed?.next_step || "").toString().trim();

    const lines: string[] = [];
    lines.push(`Outcome: ${outcome}`);
    lines.push(`Duration: ${durationHHMM}`);
    if (keyPoints.length) {
      lines.push("");
      lines.push("Summary:");
      keyPoints.forEach((p) => lines.push(`- ${p}`));
    } else if (notes) {
      lines.push("");
      lines.push("Summary:");
      lines.push(notes.slice(0, 900));
    }
    if (nextStep) {
      lines.push("");
      lines.push(`Next step: ${nextStep}`);
    }

    return lines.join("\n").trim();
  } catch {
    return null;
  }
};

const normalizeUrl = (url: string) => {
  const u = new URL(url);
  u.hash = "";
  return u.toString();
};

const normalizeBaseUrl = (baseUrl: string) => {
  const u = new URL(baseUrl);
  u.hash = "";
  u.search = "";
  if (!u.pathname.endsWith("/")) u.pathname = "/";
  return u.toString();
};

const deriveCompanyWebsiteFromEmail = (email: string | null) => {
  const raw = (email || "").toString().trim().toLowerCase();
  if (!raw.includes("@")) return null;
  const domain = raw.split("@").pop() || "";
  const blocked = new Set([
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "yahoo.com",
    "icloud.com",
    "seznam.cz",
    "email.cz",
    "centrum.cz",
    "atlas.cz",
    "volny.cz",
  ]);
  if (!domain || blocked.has(domain)) return null;
  if (!domain.includes(".")) return null;
  try {
    return normalizeBaseUrl(`https://${domain}`);
  } catch {
    return null;
  }
};

const htmlToText = (html: string) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const stripped = withoutScripts.replace(/<[^>]+>/g, " ");
  return stripped.replace(/\s+/g, " ").trim();
};

type RobotsRule = { type: "allow" | "disallow"; value: string };

const parseRobotsForUserAgent = (robotsTxt: string, agent: string) => {
  const lines = robotsTxt.split("\n").map((l) => l.trim());
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;

  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const [kRaw, vRaw] = line.split(":");
    if (!kRaw || vRaw === undefined) continue;
    const key = kRaw.trim().toLowerCase();
    const value = vRaw.trim();

    if (key === "user-agent") {
      if (!current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (key === "allow" || key === "disallow") {
      if (!current) {
        current = { agents: ["*"], rules: [] };
        groups.push(current);
      }
      current.rules.push({ type: key as RobotsRule["type"], value });
      continue;
    }
  }

  const agentLc = agent.toLowerCase();
  const matchingGroups = groups.filter((g) => g.agents.some((a) => a === "*" || agentLc.includes(a)));
  const rules = matchingGroups.flatMap((g) => g.rules);
  return rules;
};

const isPathAllowedByRobots = (path: string, rules: RobotsRule[]) => {
  // Simplified: longest match wins; Allow overrides Disallow if same length.
  let best: { type: "allow" | "disallow"; len: number } | null = null;
  for (const r of rules) {
    const v = r.value || "";
    if (!v) continue;
    if (!path.startsWith(v)) continue;
    const len = v.length;
    if (!best || len > best.len || (len === best.len && r.type === "allow" && best.type === "disallow")) {
      best = { type: r.type, len };
    }
  }
  if (!best) return true;
  return best.type === "allow";
};

const getPipedriveKey = async (userId: string) => {
  try {
    const data = await kv.get(userKey(userId, "integration:pipedrive"));
    const apiKey = data?.apiKey?.toString().trim();
    return apiKey || null;
  } catch (e) {
    console.error("Failed to load Pipedrive key", e);
    return null;
  }
};

const getOpenAiKey = async (userId: string) => {
  try {
    const data = await kv.get(userKey(userId, "integration:openai"));
    const apiKey = data?.apiKey?.toString().trim();
    return apiKey || null;
  } catch (e) {
    console.error("Failed to load OpenAI key", e);
    return null;
  }
};

const getOpenAiApiKeyForUser = async (userId: string) => {
  const key = (await getOpenAiKey(userId)) || Deno.env.get("OPENAI_API_KEY") || "";
  const trimmed = key.toString().trim();
  return trimmed ? trimmed : null;
};

const testOpenAiApiKey = async (apiKey: string) => {
  const res = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || json?.error || json?.message || `OpenAI request failed (${res.status})`;
    throw new Error(msg);
  }
  const data = Array.isArray(json?.data) ? json.data : [];
  return { model_count: data.length };
};

// --- PRODUCT KNOWLEDGE BASE (CZECH MARKET OPTIMIZED) ---
const PRODUCT_KNOWLEDGE = `
PRODUCT: Echo Pulse by Behavery
TYPE: Employee Retention & Engagement Platform (SaaS)
MARKET CONTEXT (CZECH REPUBLIC):
- Lowest unemployment in EU -> High competition for talent.
- Huge pain points:
  1. "Fluktuace" (Turnover) in Manufacturing/Logistics (cost of replacing 1 worker = 30-50k CZK + lost productivity).
  2. "Burnout/Quiet Quitting" in IT/Finance.
  3. "Toxic Middle Management" (mistři ve výrobě, team leadeři).
WHAT IT DOES: Monthly automated pulse checks via SMS/Email.
VS COMPETITION (Arnold, Frank, Behavery, Survio):
- We are NOT a survey tool (Survio). We are a SIGNAL tool.
- We don't do "happiness" (soft metrics). We measure "friction" & "risk".
- Zero setup time.
`;

const INDUSTRY_KNOWLEDGE = `
TARGET AUDIENCE & PAIN POINTS:
1. MANUFACTURING (Výroba) / LOGISTICS:
   - Persona: HR Director, Plant Manager (Ředitel závodu).
   - Pain: "Lidi nám odchází ke konkurenci kvůli 500 Kč." "Mistři neumí jednat s lidmi."
   - Goal: Stability, Shift fulfillment.
2. IT / TECH HOUSES:
   - Persona: CTO, COO, HRBP.
   - Pain: Senior devs leaving due to micromanagement or lack of vision. Remote work alienation.
   - Goal: Retention of key assets (expensive to replace).
3. CORPORATE / BUSINESS SERVICES:
   - Persona: HR Director, CEO.
   - Pain: "Quiet Quitting", disconnected teams, efficiency drops.
`;

const CONTACT_SELECT_FIELDS =
  "id, name, title, company, phone, email, linkedin_url, manual_notes, company_website, source, external_id";

type ResolvedContact = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  manual_notes: string | null;
  company_website: string | null;
  source: string | null;
  external_id: string | null;
};

const resolveContactForUser = async (
  admin: any,
  userId: string,
  rawContactId: string,
): Promise<{ contactId: string; contact: ResolvedContact } | null> => {
  let contactId = rawContactId;
  let contact: ResolvedContact | null = null;

  const { data: contactById } = await admin
    .from("contacts")
    .select(CONTACT_SELECT_FIELDS)
    .eq("id", rawContactId)
    .single();
  if (contactById) {
    contact = contactById;
    contactId = contactById.id;
  }

  if (!contact) {
    const { data: contactByExternal } = await admin
      .from("contacts")
      .select(CONTACT_SELECT_FIELDS)
      .eq("external_id", rawContactId)
      .limit(1);
    const contactExternal = Array.isArray(contactByExternal) ? contactByExternal[0] : null;
    if (contactExternal) {
      contact = contactExternal;
      contactId = contactExternal.id;
    }
  }

  if (!contact) {
    const personId = Number(rawContactId);
    const pipedriveKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
    if (Number.isFinite(personId) && pipedriveKey) {
      try {
        const res = await fetch(`https://api.pipedrive.com/v1/persons/${personId}?api_token=${pipedriveKey}`, {
          headers: { Accept: "application/json" },
        });
        const personJson = await res.json().catch(() => null);
        const person = personJson?.data;
        if (res.ok && person) {
          const upsertPayload = {
            name: person.name || "Unnamed contact",
            title: person.title || null,
            company: person.org_name || null,
            phone: person.phone?.[0]?.value || null,
            email: person.email?.[0]?.value || null,
            status: person.active_flag ? "active" : null,
            source: "pipedrive_person",
            external_id: String(personId),
            last_touch: person.update_time || null,
          };
          const { data: upserted, error: upsertError } = await admin
            .from("contacts")
            .upsert(upsertPayload, { onConflict: "source,external_id" })
            .select(CONTACT_SELECT_FIELDS)
            .single();
          if (!upsertError && upserted) {
            contact = upserted;
            contactId = upserted.id;
          }
        }
      } catch (e) {
        console.error("Failed to upsert Pipedrive person:", e);
      }
    }
  }

  if (!contact) return null;
  return { contactId, contact };
};

const getPipedriveApiKeyForUser = async (userId: string) => {
  const key = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY") || "";
  const trimmed = key.toString().trim();
  return trimmed ? trimmed : null;
};

const stripHtml = (input: unknown) => {
  const raw = typeof input === "string" ? input : "";
  if (!raw) return "";
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const pipedriveJson = async <T = any>(apiKey: string, path: string) => {
  const url = `https://api.pipedrive.com/v1/${path}${path.includes("?") ? "&" : "?"}api_token=${apiKey}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error || json?.message || `Pipedrive request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
};

const resolvePipedrivePersonAndDeal = async (params: {
  admin: any;
  userId: string;
  rawContactId: string;
  resolved: { contactId: string; contact: ResolvedContact };
}) => {
  const { admin, userId, rawContactId, resolved } = params;
  const apiKey = await getPipedriveApiKeyForUser(userId);
  if (!apiKey) {
    return { configured: false as const, apiKey: null, personId: null, orgId: null, dealId: null, leadId: null };
  }

  const directPersonId = Number(rawContactId);
  if (Number.isFinite(directPersonId) && !Number.isNaN(directPersonId)) {
    return { configured: true as const, apiKey, personId: directPersonId, orgId: null, dealId: null, leadId: null };
  }

  const source = (resolved.contact.source || "").toString().trim().toLowerCase();
  const externalId = (resolved.contact.external_id || "").toString().trim();

  if (source === "pipedrive_person" && externalId) {
    const personId = Number(externalId);
    if (Number.isFinite(personId) && !Number.isNaN(personId)) {
      return { configured: true as const, apiKey, personId, orgId: null, dealId: null, leadId: null };
    }
  }

  const leadMatch = rawContactId.match(/^(lead:|lead-|lead_)?(\d+)$/i);
  const candidateLeadId = leadMatch?.[2] || (source === "pipedrive" && externalId ? externalId : null);

  const fetchLead = async (leadId: string) => {
    const leadJson: any = await pipedriveJson(apiKey, `leads/${encodeURIComponent(leadId)}`);
    const lead = leadJson?.data || {};
    const personIdRaw =
      lead.person_id?.value ??
      lead.person_id ??
      lead.person?.id ??
      lead.person?.value ??
      null;
    const orgIdRaw =
      lead.organization_id?.value ??
      lead.organization_id ??
      lead.org_id?.value ??
      lead.org_id ??
      null;
    const personId = Number(personIdRaw);
    const orgId = orgIdRaw ? Number(orgIdRaw) : null;
    return {
      leadId,
      personId: Number.isFinite(personId) && !Number.isNaN(personId) ? personId : null,
      orgId: orgId !== null && Number.isFinite(orgId) && !Number.isNaN(orgId) ? orgId : null,
    };
  };

  if (candidateLeadId) {
    try {
      const lead = await fetchLead(candidateLeadId);
      return {
        configured: true as const,
        apiKey,
        personId: lead.personId,
        orgId: lead.orgId,
        dealId: null,
        leadId: lead.leadId,
      };
    } catch (e) {
      console.error("Pipedrive lead resolve failed (non-blocking):", e);
    }
  }

  // Optional fallback: look up person by email.
  const email = (resolved.contact.email || "").toString().trim();
  if (email) {
    try {
      const searchJson: any = await pipedriveJson(
        apiKey,
        `persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&limit=1`,
      );
      const item = searchJson?.data?.items?.[0]?.item;
      const personId = Number(item?.id);
      if (Number.isFinite(personId) && !Number.isNaN(personId)) {
        return { configured: true as const, apiKey, personId, orgId: null, dealId: null, leadId: null };
      }
    } catch (e) {
      console.error("Pipedrive person email search failed (non-blocking):", e);
    }
  }

  // We have a key, but couldn't resolve a person.
  return { configured: true as const, apiKey, personId: null, orgId: null, dealId: null, leadId: candidateLeadId };
};

const fetchPipedriveTimeline = async (params: {
  apiKey: string;
  personId: number;
  limits: { activities: number; notes: number; deals: number };
}) => {
  const { apiKey, personId, limits } = params;
  const [activitiesJson, notesJson, dealsJson] = await Promise.all([
    pipedriveJson<any>(apiKey, `activities?person_id=${encodeURIComponent(String(personId))}&limit=${limits.activities}`),
    pipedriveJson<any>(apiKey, `notes?person_id=${encodeURIComponent(String(personId))}&limit=${limits.notes}&sort=add_time%20DESC`),
    pipedriveJson<any>(apiKey, `persons/${encodeURIComponent(String(personId))}/deals?status=open&limit=${limits.deals}`),
  ]);

  const activities = (activitiesJson?.data || []).map((a: any) => ({
    id: a?.id,
    type: a?.type || null,
    subject: a?.subject || null,
    done: Boolean(a?.done),
    due_date: a?.due_date || null,
    add_time: a?.add_time || null,
    update_time: a?.update_time || null,
    deal_id: a?.deal_id || null,
    org_id: a?.org_id || null,
    note: stripHtml(a?.note || ""),
  }));

  const notes = (notesJson?.data || []).map((n: any) => ({
    id: n?.id,
    add_time: n?.add_time || null,
    update_time: n?.update_time || null,
    deal_id: n?.deal_id || null,
    org_id: n?.org_id || null,
    content: stripHtml(n?.content || ""),
  }));

  const deals = (dealsJson?.data || []).map((d: any) => ({
    id: d?.id,
    title: d?.title || null,
    value: d?.value ?? null,
    currency: d?.currency || null,
    status: d?.status || null,
    stage_id: d?.stage_id ?? null,
    add_time: d?.add_time || null,
    update_time: d?.update_time || null,
    org_id: d?.org_id?.value ?? d?.org_id ?? null,
  }));

  return { activities, notes, deals };
};

const parseMaybeDate = (value: unknown) => {
  const str = typeof value === "string" ? value : "";
  if (!str) return null;
  const ms = Date.parse(str);
  return Number.isFinite(ms) ? new Date(ms) : null;
};

const isOlderThanHours = (date: Date | null, hours: number) => {
  if (!date) return true;
  if (!Number.isFinite(hours) || hours <= 0) return true;
  return Date.now() - date.getTime() > hours * 60 * 60 * 1000;
};

const getLatestPackForContact = async (admin: any, userId: string, contactId: string) => {
  const { data, error } = await admin
    .from("sales_packs")
    .select(
      "id, correlation_id, contact_id, approved_facts, hypotheses, lead_dossier, cold_call_prep_card, meeting_booking_pack, spin_demo_pack, quality_report, created_at",
    )
    .eq("owner_user_id", userId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

const generatePrecallBrief = async (params: {
  contact: ResolvedContact;
  timeline: { activities: any[]; notes: any[]; deals: any[] } | null;
  approvedFacts: any[];
  language: string;
  openaiApiKey?: string | null;
}) => {
  const apiKey = (params.openaiApiKey || Deno.env.get("OPENAI_API_KEY") || "").toString().trim();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const language = params.language || "cs";
  const contact = params.contact;
  const facts = (params.approvedFacts || []).slice(0, 6).map((f: any) => ({
    claim: f?.claim || "",
    source_url: f?.source_url || "",
  }));
  const timeline = params.timeline || { activities: [], notes: [], deals: [] };
  const topActivities = (timeline.activities || []).slice(0, 6).map((a: any) => ({
    type: a.type,
    subject: a.subject,
    done: a.done,
    due_date: a.due_date,
    add_time: a.add_time,
  }));
  const topNotes = (timeline.notes || []).slice(0, 5).map((n: any) => ({
    add_time: n.add_time,
    content: (n.content || "").toString().slice(0, 500),
  }));
  const topDeals = (timeline.deals || []).slice(0, 3).map((d: any) => ({
    title: d.title,
    status: d.status,
    value: d.value,
    currency: d.currency,
  }));

  const system = `You are an expert B2B SDR pre-call assistant. Output ONLY a JSON object. Language: ${language}.`;
  const user = {
    task:
      "Create pre-call context for a cold call. Keep it concise, actionable, and evidence-gated. If evidence is weak, produce validation questions instead of claims.",
    schema: {
      brief: "string (2-4 short sentences)",
      why_now: "string (1 short sentence)",
      opener: "string (1-2 sentences, Czech)",
      risks: "string[] (2-4 items)",
      questions: "string[] (3 items)",
    },
    contact: {
      name: contact.name,
      title: contact.title,
      company: contact.company,
      email: contact.email,
      company_website: contact.company_website,
      linkedin_url: contact.linkedin_url,
      manual_notes: contact.manual_notes,
    },
    pipedrive: {
      deals: topDeals,
      recent_activities: topActivities,
      recent_notes: topNotes,
    },
    approved_facts: facts,
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    const now = new Date().toISOString();
    return {
      brief: (parsed?.brief || "").toString(),
      why_now: (parsed?.why_now || "").toString(),
      opener: (parsed?.opener || "").toString(),
      risks: Array.isArray(parsed?.risks) ? parsed.risks.map((x: any) => String(x)).filter(Boolean).slice(0, 6) : [],
      questions: Array.isArray(parsed?.questions)
        ? parsed.questions.map((x: any) => String(x)).filter(Boolean).slice(0, 6)
        : [],
      generated_at: now,
      model: "gpt-4o-mini",
    };
  } catch {
    return null;
  }
};

const ingestCompanySiteAllowlistInternal = async (params: {
  admin: any;
  userId: string;
  correlationId: string;
  contactId: string;
  baseUrl: string;
}) => {
  const { admin, userId, correlationId, contactId, baseUrl } = params;

  const base = new URL(normalizeBaseUrl(baseUrl));
  const allowPaths = ["/", "/about", "/team", "/kontakt", "/contact", "/kariera", "/careers", "/blog", "/press", "/news", "/company"];
  const ua = "EchoEvidenceBot/1.0";

  const robotsUrl = `${base.origin}/robots.txt`;
  const robotsRes = await fetch(robotsUrl, { headers: { "User-Agent": ua }, redirect: "follow" });
  const robotsTxt = robotsRes.ok ? await robotsRes.text() : "";
  const rules = robotsTxt ? parseRobotsForUserAgent(robotsTxt, ua) : [];

  const documents: Array<{ document_id: string; source_url: string; http_status: number | null }> = [];
  const skipped: Array<{ url: string; reason: string }> = [];

  for (const p of allowPaths.slice(0, 8)) {
    const url = new URL(p, base.origin);
    if (!isPathAllowedByRobots(url.pathname, rules)) {
      skipped.push({ url: url.toString(), reason: "robots_disallow" });
      continue;
    }

    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1" },
        redirect: "follow",
      });

      const httpStatus = res.status;
      const canonicalUrl = res.url || url.toString();
      const contentType = res.headers.get("content-type");
      const raw = await res.text();
      const contentText = contentType?.includes("text/html") ? htmlToText(raw) : raw.trim();
      const langMatch = contentType?.includes("text/html")
        ? raw.match(/<html[^>]*\blang\s*=\s*["']([^"']+)["']/i)
        : null;
      const language = langMatch?.[1]?.toLowerCase() || null;
      const contentSha256 = await sha256Hex(contentText);

      const { data, error: insertError } = await admin
        .from("evidence_documents")
        .insert({
          owner_user_id: userId,
          correlation_id: correlationId,
          source_type: "company_website",
          source_url: url.toString(),
          canonical_url: canonicalUrl,
          source_title: null,
          http_status: httpStatus,
          content_type: contentType,
          language,
          captured_at: new Date().toISOString(),
          fetched_at: new Date().toISOString(),
          content_text: contentText,
          content_sha256: contentSha256,
          robots_policy: { robots_url: robotsUrl, ok: robotsRes.ok, rules, allowed: true },
          request_meta: { user_agent: ua, seed: "allowlist" },
          contact_id: contactId,
        })
        .select("id, source_url, http_status")
        .single();

      if (insertError) {
        skipped.push({ url: url.toString(), reason: insertError.message });
      } else {
        documents.push({ document_id: data.id, source_url: url.toString(), http_status: data.http_status });
      }
    } catch (e) {
      skipped.push({ url: url.toString(), reason: e instanceof Error ? e.message : String(e) });
    }

    await sleep(1100);
  }

  await auditEvent(admin, userId, correlationId, "ingest", "company_site_allowlist_ingested", {
    contact_id: contactId,
    base_url: base.toString(),
    document_count: documents.length,
    skipped_count: skipped.length,
  });

  return { documents, skipped, base_url: base.toString() };
};

const autoApproveLowRiskClaims = async (params: {
  admin: any;
  userId: string;
  correlationId: string;
  contactId: string;
}) => {
  const { admin, userId, correlationId, contactId } = params;

  const { data, error } = await admin
    .from("v_evidence_claims_with_review")
    .select("evidence_id, claim, confidence, review_status, source_url")
    .eq("owner_user_id", userId)
    .eq("contact_id", contactId)
    .eq("review_status", "needs_review")
    .eq("confidence", "high")
    .order("captured_at", { ascending: false });

  if (error) {
    console.error("autoApproveLowRiskClaims list failed:", error);
    return { approved: 0, skipped: 0, error: error.message };
  }

  const isLowRisk = (claim: string) => {
    const text = claim.toLowerCase();
    if (/\d/.test(text)) return false;
    if (/(kč|czk|eur|usd|€|\$)/i.test(text)) return false;
    if (/(zam[eě]stn|employees|headcount|fte|milion|miliard|obrat|revenue|tržb|profit)/i.test(text)) return false;
    if (/(nej|top|best|revolu|garant|unik[áa]t|number one)/i.test(text)) return false;

    // Approve only "what they do / offer" type statements.
    const positiveSignals = [
      "nabíz",
      "poskyt",
      "služb",
      "produkt",
      "platform",
      "řešen",
      "vyvíj",
      "výrob",
      "dodáv",
      "zaměř",
      "specializ",
    ];
    return positiveSignals.some((s) => text.includes(s));
  };

  const toApprove = (data || [])
    .map((row: any) => ({ evidence_id: row.evidence_id as string, claim: row.claim as string }))
    .filter((row) => row.evidence_id && row.claim && isLowRisk(row.claim))
    .slice(0, 12);

  if (toApprove.length === 0) {
    return { approved: 0, skipped: (data || []).length, error: null };
  }

  const nowIso = new Date().toISOString();
  const reviewRows = toApprove.map((row) => ({
    owner_user_id: userId,
    claim_id: row.evidence_id,
    status: "approved",
    approved_claim: null,
    reviewer_notes: "auto_approved_low_risk",
    reviewed_at: nowIso,
    reviewed_by: `${userId}:auto`,
  }));

  const { error: insertError } = await admin.from("evidence_claim_reviews").insert(reviewRows);
  if (insertError) {
    console.error("autoApproveLowRiskClaims insert failed:", insertError);
    return { approved: 0, skipped: (data || []).length, error: insertError.message };
  }

  await auditEvent(admin, userId, correlationId, "review", "auto_review_completed", {
    contact_id: contactId,
    approved_count: toApprove.length,
    total_candidates: (data || []).length,
  });

  return { approved: toApprove.length, skipped: Math.max(0, (data || []).length - toApprove.length), error: null };
};

const extractEvidenceClaimsInternal = async (params: {
  admin: any;
  userId: string;
  correlationId: string;
  documentId: string;
  model?: string;
  promptVersion?: string;
}) => {
  const { admin, userId, correlationId, documentId } = params;
  const model = params.model?.toString() || "gpt-4o-mini";
  const promptVersion = params.promptVersion?.toString() || "extractor_v1";

  const { data: doc, error: docError } = await admin
    .from("evidence_documents")
    .select("id, owner_user_id, source_url, captured_at, content_text, language, correlation_id")
    .eq("id", documentId)
    .eq("owner_user_id", userId)
    .single();

  if (docError || !doc) {
    const message = docError?.message || "Document not found";
    throw new Error(message);
  }

  const apiKey = await getOpenAiApiKeyForUser(userId);
  if (!apiKey) throw new Error("OpenAI not configured");

  const extractionRunId = crypto.randomUUID();
  await admin.from("evidence_extraction_runs").insert({
    id: extractionRunId,
    owner_user_id: userId,
    correlation_id: correlationId,
    document_id: documentId,
    model,
    prompt_version: promptVersion,
    extractor_version: "v1",
    status: "failed",
    error: "not_started",
  });

  await auditEvent(admin, userId, correlationId, "extract", "extraction_started", {
    document_id: documentId,
    extraction_run_id: extractionRunId,
    model,
    prompt_version: promptVersion,
  });

  const openai = new OpenAI({ apiKey });
  const system = [
    "You are a strict evidence extractor.",
    "Return ONLY JSON (no markdown) as an array of objects with keys:",
    "claim, evidence_snippet, confidence.",
    "Rules:",
    "- Extract ONLY claims explicitly present in the provided text.",
    "- evidence_snippet MUST be a verbatim excerpt from the provided text.",
    "- No inference. No synthesis. No invented numbers or entities.",
    "- confidence must be one of: high, medium, low.",
    "- If nothing extractable, return []",
  ].join("\n");

  const user = [
    `SOURCE_URL: ${doc.source_url}`,
    `CAPTURED_AT: ${doc.captured_at}`,
    doc.language ? `LANGUAGE_HINT: ${doc.language}` : "",
    "",
    "PAGE_TEXT:",
    doc.content_text,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const extracted = JSON.parse(raw);
    if (!Array.isArray(extracted)) throw new Error("Extractor output is not an array");

    const claimsToInsert: any[] = [];
    for (const item of extracted) {
      const claim = item?.claim?.toString().trim();
      const evidenceSnippet = item?.evidence_snippet?.toString();
      const confidence = item?.confidence?.toString();
      if (!claim || !evidenceSnippet || !confidence) throw new Error("Missing claim fields in extractor output");
      if (!["high", "medium", "low"].includes(confidence)) throw new Error("Invalid confidence value");
      if (!doc.content_text.includes(evidenceSnippet)) {
        throw new Error("evidence_snippet not found verbatim in document content");
      }

      const claimHash = await sha256Hex(
        `${claim}\n---\n${doc.source_url}\n---\n${evidenceSnippet}`.toLowerCase().trim(),
      );

      claimsToInsert.push({
        owner_user_id: userId,
        correlation_id: correlationId,
        document_id: documentId,
        extraction_run_id: extractionRunId,
        claim,
        source_url: doc.source_url,
        evidence_snippet: evidenceSnippet,
        captured_at: doc.captured_at,
        confidence,
        language: doc.language || null,
        subject_name: null,
        claim_tags: [],
        claim_hash: claimHash,
      });
    }

    if (claimsToInsert.length > 0) {
      const { error: insertClaimsError } = await admin
        .from("evidence_claims")
        .upsert(claimsToInsert, { onConflict: "owner_user_id,claim_hash", ignoreDuplicates: true });
      if (insertClaimsError) throw new Error(insertClaimsError.message);
    }

    await admin
      .from("evidence_extraction_runs")
      .update({ status: "success", error: null })
      .eq("id", extractionRunId)
      .eq("owner_user_id", userId);

    await auditEvent(admin, userId, correlationId, "extract", "extraction_succeeded", {
      document_id: documentId,
      extraction_run_id: extractionRunId,
      claim_count: claimsToInsert.length,
    });

    const { data: insertedClaims } = await admin
      .from("evidence_claims")
      .select("id, claim, confidence")
      .eq("extraction_run_id", extractionRunId)
      .eq("owner_user_id", userId);

    return {
      correlation_id: correlationId,
      extraction_run_id: extractionRunId,
      claims: (insertedClaims || []).map((row: any) => ({
        evidence_id: row.id,
        claim: row.claim,
        confidence: row.confidence,
      })),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("evidence_extraction_runs")
      .update({ status: "failed", error: message })
      .eq("id", extractionRunId)
      .eq("owner_user_id", userId);

    await auditEvent(admin, userId, correlationId, "extract", "extraction_failed", {
      document_id: documentId,
      extraction_run_id: extractionRunId,
      error: message,
    });

    throw new Error(message);
  }
};

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  if (c.req.path.startsWith("/health")) return next();

  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  c.set("userId", userId);
  await next();
});

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  if (c.req.path.startsWith("/health")) return next();

  // Best-effort per-user+IP limiter. Use smaller budgets for expensive routes.
  const userId = getUserId(c);
  const ip = getClientIp(c) || "unknown";
  const path = (c.req.path || "").toString();
  const method = (c.req.method || "GET").toUpperCase();

  let max = 120;
  const windowMs = 60_000;
  if (
    path.startsWith("/ai/") ||
    path.startsWith("/packs/") ||
    path.startsWith("/lead/") ||
    path.startsWith("/mentor-chat") ||
    path.startsWith("/whisper/") ||
    path.startsWith("/evidence/")
  ) {
    max = 20;
  } else if (path.startsWith("/pipedrive/") || path.startsWith("/integrations/")) {
    max = 40;
  } else if (method !== "GET") {
    max = 60;
  }

  const bucket = `${method}:${path.split("/").slice(1, 3).join("/") || path}`;
  const key = `${userId}:${ip}:${bucket}`;
  const r = rateLimit(key, max, windowMs);
  if (!r.ok) {
    const retryAfterSec = Math.max(1, Math.ceil(r.retryAfterMs / 1000));
    c.header("Retry-After", String(retryAfterSec));
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  maybePruneRateLimit();

  // Hard cap for JSON payload sizes (best-effort via Content-Length).
  const contentType = (c.req.header("content-type") || "").toLowerCase();
  if (method !== "GET" && contentType.includes("application/json")) {
    const lenHeader = c.req.header("content-length");
    const len = lenHeader ? Number(lenHeader) : 0;
    if (Number.isFinite(len) && len > 64_000) {
      return c.json({ error: "Payload too large" }, 413);
    }
  }

  await next();
});

// --- EVIDENCE (ANTI-HALLUCINATION) ---
app.post(`${BASE_PATH}/evidence/ingest/user-note`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const contactId = body?.contact_id?.toString();
  const noteText = body?.note_text?.toString();
  const noteKind = body?.note_kind?.toString() || "manual_notes";
  if (!contactId) return c.json({ error: "Missing contact_id" }, 400);
  if (!noteText) return c.json({ error: "Missing note_text" }, 400);

  const sourceUrl = `internal://contacts/${contactId}/note/${crypto.randomUUID()}`;
  const contentSha256 = await sha256Hex(noteText);

  const { data, error: insertError } = await admin
    .from("evidence_documents")
    .insert({
      owner_user_id: userId,
      correlation_id: correlationId,
      source_type: "user_note",
      source_url: sourceUrl,
      canonical_url: null,
      source_title: noteKind,
      http_status: null,
      content_type: "text/plain",
      language: null,
      captured_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      content_text: noteText,
      content_sha256: contentSha256,
      robots_policy: null,
      request_meta: { note_kind: noteKind },
      contact_id: contactId,
    })
    .select("id, captured_at, source_url, content_sha256, correlation_id")
    .single();

  if (insertError) return c.json({ error: insertError.message }, 500);
  await auditEvent(admin, userId, correlationId, "ingest", "user_note_ingested", {
    document_id: data.id,
    contact_id: contactId,
    note_kind: noteKind,
  });

  return c.json({
    correlation_id: correlationId,
    document_id: data.id,
    captured_at: data.captured_at,
    source_url: data.source_url,
    content_sha256: data.content_sha256,
  });
});

app.post(`${BASE_PATH}/evidence/ingest/internal-product-note`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const sourceUrl = body?.source_url?.toString();
  const contentText = body?.content_text?.toString();
  if (!sourceUrl) return c.json({ error: "Missing source_url" }, 400);
  if (!contentText) return c.json({ error: "Missing content_text" }, 400);

  const contentSha256 = await sha256Hex(contentText);

  const { data, error: insertError } = await admin
    .from("evidence_documents")
    .insert({
      owner_user_id: userId,
      correlation_id: correlationId,
      source_type: "internal_product_note",
      source_url: sourceUrl,
      canonical_url: sourceUrl,
      source_title: "Internal product note",
      http_status: null,
      content_type: "text/plain",
      language: null,
      captured_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      content_text: contentText,
      content_sha256: contentSha256,
      robots_policy: null,
      request_meta: null,
      contact_id: null,
    })
    .select("id, captured_at, source_url, content_sha256, correlation_id")
    .single();

  if (insertError) return c.json({ error: insertError.message }, 500);
  await auditEvent(admin, userId, correlationId, "ingest", "internal_product_note_ingested", {
    document_id: data.id,
    source_url: sourceUrl,
  });

  return c.json({
    correlation_id: correlationId,
    document_id: data.id,
    captured_at: data.captured_at,
    source_url: data.source_url,
    content_sha256: data.content_sha256,
  });
});

app.post(`${BASE_PATH}/evidence/ingest/url`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const contactId = body?.contact_id?.toString();
  const url = body?.url?.toString();
  const sourceType = body?.source_type?.toString() || "company_website";
  if (!contactId) return c.json({ error: "Missing contact_id" }, 400);
  if (!url) return c.json({ error: "Missing url" }, 400);
  if (sourceType !== "company_website") return c.json({ error: "Only source_type=company_website supported here" }, 400);

  const normalizedUrl = normalizeUrl(url);
  const ua = "EchoEvidenceBot/1.0";
  const startedAt = new Date().toISOString();

  let httpStatus: number | null = null;
  let contentType: string | null = null;
  let language: string | null = null;
  let canonicalUrl: string | null = null;
  let contentText = "";
  let robotsPolicy: any = null;

  try {
    const u = new URL(normalizedUrl);
    const robotsUrl = `${u.origin}/robots.txt`;
    const robotsRes = await fetch(robotsUrl, { headers: { "User-Agent": ua }, redirect: "follow" });
    const robotsTxt = robotsRes.ok ? await robotsRes.text() : "";
    const rules = robotsTxt ? parseRobotsForUserAgent(robotsTxt, ua) : [];
    const allowed = isPathAllowedByRobots(u.pathname, rules);
    robotsPolicy = { robots_url: robotsUrl, ok: robotsRes.ok, rules, allowed };
    if (!allowed) {
      return c.json({ error: "Blocked by robots.txt", robots_policy: robotsPolicy }, 403);
    }

    const res = await fetch(normalizedUrl, {
      headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1" },
      redirect: "follow",
    });

    httpStatus = res.status;
    canonicalUrl = res.url || normalizedUrl;
    contentType = res.headers.get("content-type");
    const raw = await res.text();
    const text = contentType?.includes("text/html") ? htmlToText(raw) : raw.trim();
    contentText = text;

    if (contentType?.includes("text/html")) {
      const langMatch = raw.match(/<html[^>]*\blang\s*=\s*["']([^"']+)["']/i);
      language = langMatch?.[1]?.toLowerCase() || null;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }

  const contentSha256 = await sha256Hex(contentText);

  const { data, error: insertError } = await admin
    .from("evidence_documents")
    .insert({
      owner_user_id: userId,
      correlation_id: correlationId,
      source_type: "company_website",
      source_url: normalizedUrl,
      canonical_url: canonicalUrl,
      source_title: null,
      http_status: httpStatus,
      content_type: contentType,
      language,
      captured_at: startedAt,
      fetched_at: startedAt,
      content_text: contentText,
      content_sha256: contentSha256,
      robots_policy: robotsPolicy,
      request_meta: { user_agent: ua },
      contact_id: contactId,
    })
    .select("id, captured_at, canonical_url, http_status, language, content_sha256")
    .single();

  if (insertError) return c.json({ error: insertError.message }, 500);

  await auditEvent(admin, userId, correlationId, "ingest", "url_ingested", {
    document_id: data.id,
    contact_id: contactId,
    source_url: normalizedUrl,
    canonical_url: canonicalUrl,
    http_status: httpStatus,
  });

  return c.json({
    correlation_id: correlationId,
    document_id: data.id,
    canonical_url: data.canonical_url,
    captured_at: data.captured_at,
    http_status: data.http_status,
    language: data.language,
    content_sha256: data.content_sha256,
  });
});

app.post(`${BASE_PATH}/evidence/ingest/company-site-allowlist`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const contactId = body?.contact_id?.toString();
  const baseUrl = body?.base_url?.toString();
  if (!contactId) return c.json({ error: "Missing contact_id" }, 400);
  if (!baseUrl) return c.json({ error: "Missing base_url" }, 400);

  const { documents, skipped } = await ingestCompanySiteAllowlistInternal({
    admin,
    userId,
    correlationId,
    contactId,
    baseUrl,
  });

  return c.json({ correlation_id: correlationId, documents, skipped });
});

app.post(`${BASE_PATH}/evidence/ingest/ares-record`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const contactId = body?.contact_id?.toString();
  const sourceUrl = body?.source_url?.toString();
  const contentText = body?.content_text?.toString();
  if (!contactId) return c.json({ error: "Missing contact_id" }, 400);
  if (!sourceUrl) return c.json({ error: "Missing source_url" }, 400);
  if (!contentText) return c.json({ error: "Missing content_text" }, 400);

  const contentSha256 = await sha256Hex(contentText);

  const { data, error: insertError } = await admin
    .from("evidence_documents")
    .insert({
      owner_user_id: userId,
      correlation_id: correlationId,
      source_type: "ares_record",
      source_url: sourceUrl,
      canonical_url: sourceUrl,
      source_title: "ARES record",
      http_status: null,
      content_type: "application/json",
      language: "cs",
      captured_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      content_text: contentText,
      content_sha256: contentSha256,
      robots_policy: null,
      request_meta: { provided_by: "client" },
      contact_id: contactId,
    })
    .select("id, captured_at, source_url")
    .single();

  if (insertError) return c.json({ error: insertError.message }, 500);
  await auditEvent(admin, userId, correlationId, "ingest", "ares_record_ingested", {
    document_id: data.id,
    contact_id: contactId,
    source_url: sourceUrl,
  });

  return c.json({ correlation_id: correlationId, document_id: data.id, captured_at: data.captured_at, source_url: data.source_url });
});

app.post(`${BASE_PATH}/evidence/extract`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const documentId = body?.document_id?.toString();
  const model = body?.model?.toString() || "gpt-4o-mini";
  const promptVersion = body?.prompt_version?.toString() || "extractor_v1";
  if (!documentId) return c.json({ error: "Missing document_id" }, 400);

  const { data: doc, error: docError } = await admin
    .from("evidence_documents")
    .select("id, owner_user_id, source_url, captured_at, content_text, language, correlation_id")
    .eq("id", documentId)
    .eq("owner_user_id", userId)
    .single();

  if (docError || !doc) return c.json({ error: "Document not found" }, 404);

  const apiKey = await getOpenAiApiKeyForUser(userId);
  if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

  const extractionRunId = crypto.randomUUID();
  await admin.from("evidence_extraction_runs").insert({
    id: extractionRunId,
    owner_user_id: userId,
    correlation_id: correlationId,
    document_id: documentId,
    model,
    prompt_version: promptVersion,
    extractor_version: "v1",
    status: "failed",
    error: "not_started",
  });

  await auditEvent(admin, userId, correlationId, "extract", "extraction_started", {
    document_id: documentId,
    extraction_run_id: extractionRunId,
    model,
    prompt_version: promptVersion,
  });

  const openai = new OpenAI({ apiKey });
  const system = [
    "You are a strict evidence extractor.",
    "Return ONLY JSON (no markdown) as an array of objects with keys:",
    "claim, evidence_snippet, confidence.",
    "Rules:",
    "- Extract ONLY claims explicitly present in the provided text.",
    "- evidence_snippet MUST be a verbatim excerpt from the provided text.",
    "- No inference. No synthesis. No invented numbers or entities.",
    "- confidence must be one of: high, medium, low.",
    "- If nothing extractable, return []",
  ].join("\n");

  const user = [
    `SOURCE_URL: ${doc.source_url}`,
    `CAPTURED_AT: ${doc.captured_at}`,
    doc.language ? `LANGUAGE_HINT: ${doc.language}` : "",
    "",
    "PAGE_TEXT:",
    doc.content_text,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const extracted = JSON.parse(raw);
    if (!Array.isArray(extracted)) throw new Error("Extractor output is not an array");

    const claimsToInsert: any[] = [];
    for (const item of extracted) {
      const claim = item?.claim?.toString().trim();
      const evidenceSnippet = item?.evidence_snippet?.toString();
      const confidence = item?.confidence?.toString();
      if (!claim || !evidenceSnippet || !confidence) throw new Error("Missing claim fields in extractor output");
      if (!["high", "medium", "low"].includes(confidence)) throw new Error("Invalid confidence value");
      if (!doc.content_text.includes(evidenceSnippet)) {
        throw new Error("evidence_snippet not found verbatim in document content");
      }

      const claimHash = await sha256Hex(
        `${claim}\n---\n${doc.source_url}\n---\n${evidenceSnippet}`.toLowerCase().trim(),
      );

      claimsToInsert.push({
        owner_user_id: userId,
        correlation_id: correlationId,
        document_id: documentId,
        extraction_run_id: extractionRunId,
        claim,
        source_url: doc.source_url,
        evidence_snippet: evidenceSnippet,
        captured_at: doc.captured_at,
        confidence,
        language: doc.language || null,
        subject_name: null,
        claim_tags: [],
        claim_hash: claimHash,
      });
    }

    if (claimsToInsert.length > 0) {
      const { error: insertClaimsError } = await admin
        .from("evidence_claims")
        .upsert(claimsToInsert, { onConflict: "owner_user_id,claim_hash", ignoreDuplicates: true });
      if (insertClaimsError) throw new Error(insertClaimsError.message);
    }

    await admin
      .from("evidence_extraction_runs")
      .update({ status: "success", error: null })
      .eq("id", extractionRunId)
      .eq("owner_user_id", userId);

    await auditEvent(admin, userId, correlationId, "extract", "extraction_succeeded", {
      document_id: documentId,
      extraction_run_id: extractionRunId,
      claim_count: claimsToInsert.length,
    });

    const { data: insertedClaims } = await admin
      .from("evidence_claims")
      .select("id, claim, confidence")
      .eq("extraction_run_id", extractionRunId)
      .eq("owner_user_id", userId);

    return c.json({
      correlation_id: correlationId,
      extraction_run_id: extractionRunId,
      claims: (insertedClaims || []).map((row: any) => ({
        evidence_id: row.id,
        claim: row.claim,
        confidence: row.confidence,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("evidence_extraction_runs")
      .update({ status: "failed", error: message })
      .eq("id", extractionRunId)
      .eq("owner_user_id", userId);

    await auditEvent(admin, userId, correlationId, "extract", "extraction_failed", {
      document_id: documentId,
      extraction_run_id: extractionRunId,
      error: message,
    });

    return c.json({ error: message }, 500);
  }
});

app.get(`${BASE_PATH}/evidence/claims`, async (c) => {
  const userId = getUserId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const contactId = c.req.query("contact_id")?.toString();
  const status = c.req.query("status")?.toString();

  let q = admin
    .from("v_evidence_claims_with_review")
    .select(
      "evidence_id, claim, source_url, evidence_snippet, captured_at, confidence, document_id, contact_id, review_status, approved_claim, reviewed_at, reviewed_by",
    )
    .eq("owner_user_id", userId)
    .order("captured_at", { ascending: false });

  if (contactId) q = q.eq("contact_id", contactId);
  if (status) q = q.eq("review_status", status);

  const { data, error: listError } = await q;
  if (listError) return c.json({ error: listError.message }, 500);

  return c.json({
    claims: (data || []).map((row: any) => ({
      evidence_id: row.evidence_id,
      claim: row.claim,
      source_url: row.source_url,
      evidence_snippet: row.evidence_snippet,
      captured_at: row.captured_at,
      confidence: row.confidence,
      document_id: row.document_id,
      contact_id: row.contact_id,
      status: row.review_status,
      approved_claim: row.approved_claim,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
    })),
  });
});

app.post(`${BASE_PATH}/evidence/claims/:evidenceId/review`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const evidenceId = c.req.param("evidenceId");
  const body = await c.req.json().catch(() => ({}));
  const status = body?.status?.toString();
  const approvedClaim = body?.approved_claim?.toString();
  const reviewerNotes = body?.reviewer_notes?.toString();

  if (!["approved", "rejected", "needs_review"].includes(status)) return c.json({ error: "Invalid status" }, 400);

  const { data: claimRow, error: claimError } = await admin
    .from("evidence_claims")
    .select("id, owner_user_id")
    .eq("id", evidenceId)
    .eq("owner_user_id", userId)
    .single();
  if (claimError || !claimRow) return c.json({ error: "Claim not found" }, 404);

  const { error: insertError } = await admin.from("evidence_claim_reviews").insert({
    owner_user_id: userId,
    claim_id: evidenceId,
    status,
    approved_claim: approvedClaim || null,
    reviewer_notes: reviewerNotes || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: userId,
  });
  if (insertError) return c.json({ error: insertError.message }, 500);

  await auditEvent(admin, userId, correlationId, "review", "claim_reviewed", {
    evidence_id: evidenceId,
    status,
  });

  return c.json({ ok: true, evidence_id: evidenceId, status });
});

app.get(`${BASE_PATH}/facts`, async (c) => {
  const userId = getUserId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const contactId = c.req.query("contact_id")?.toString();

  let q = admin
    .from("v_approved_facts")
    .select("evidence_id, claim, source_url, evidence_snippet, captured_at, confidence, contact_id, approved_at, approved_by")
    .eq("owner_user_id", userId)
    .order("approved_at", { ascending: false });

  if (contactId) q = q.eq("contact_id", contactId);

  const { data, error: listError } = await q;
  if (listError) return c.json({ error: listError.message }, 500);

  return c.json({ facts: data || [] });
});

const validateGeneratedPack = (envelope: any) => {
  const errors: string[] = [];
  const evidenceIds = new Set<string>((envelope?.approved_facts || []).map((f: any) => f?.evidence_id).filter(Boolean));
  const hypothesisIds = new Set<string>((envelope?.hypotheses || []).map((h: any) => h?.hypothesis_id).filter(Boolean));

  const checkLines = (lines: any[], path: string) => {
    if (!Array.isArray(lines)) return;
    for (const line of lines) {
      const text = line?.text?.toString() || "";
      const eids = Array.isArray(line?.evidence_ids) ? line.evidence_ids : [];
      const hids = Array.isArray(line?.hypothesis_ids) ? line.hypothesis_ids : [];
      if (eids.length === 0 && hids.length === 0) errors.push(`${path}: line missing evidence_ids/hypothesis_ids`);
      for (const id of eids) if (!evidenceIds.has(id)) errors.push(`${path}: unknown evidence_id ${id}`);
      for (const id of hids) if (!hypothesisIds.has(id)) errors.push(`${path}: unknown hypothesis_id ${id}`);
      if (/\d/.test(text)) {
        const referencedSnippets = (envelope?.approved_facts || [])
          .filter((f: any) => eids.includes(f?.evidence_id))
          .map((f: any) => f?.evidence_snippet?.toString() || "");
        const digitToken = text.match(/\d+/)?.[0];
        if (digitToken && eids.length === 0) {
          errors.push(`${path}: numeric token "${digitToken}" requires evidence_ids`);
        } else if (digitToken && referencedSnippets.length > 0 && !referencedSnippets.some((s: string) => s.includes(digitToken))) {
          errors.push(`${path}: numeric token "${digitToken}" not present in any referenced evidence_snippet`);
        }
      }
    }
  };

  const packs = [
    ["cold_call_prep_card", envelope?.cold_call_prep_card],
    ["meeting_booking_pack", envelope?.meeting_booking_pack],
    ["spin_demo_pack", envelope?.spin_demo_pack],
  ] as const;

  for (const [name, obj] of packs) {
    if (!obj) continue;
    checkLines(obj.opener_variants, `${name}.opener_variants`);
    checkLines(obj.discovery_questions, `${name}.discovery_questions`);
    if (Array.isArray(obj.objections)) {
      for (const o of obj.objections) {
        checkLines([{ text: o?.response, evidence_ids: o?.evidence_ids, hypothesis_ids: o?.hypothesis_ids }], `${name}.objections`);
      }
    }
    checkLines(obj.meeting_asks, `${name}.meeting_asks`);
    checkLines(obj.agenda, `${name}.agenda`);
    checkLines(obj.next_step_conditions, `${name}.next_step_conditions`);
    if (obj.spin) {
      checkLines(obj.spin.situation, `${name}.spin.situation`);
      checkLines(obj.spin.problem, `${name}.spin.problem`);
      checkLines(obj.spin.implication, `${name}.spin.implication`);
      checkLines(obj.spin.need_payoff, `${name}.spin.need_payoff`);
    }
    if (obj.three_act_demo) {
      checkLines(obj.three_act_demo.act1, `${name}.three_act_demo.act1`);
      checkLines(obj.three_act_demo.act2, `${name}.three_act_demo.act2`);
      checkLines(obj.three_act_demo.act3, `${name}.three_act_demo.act3`);
      checkLines(obj.three_act_demo.proof_moments, `${name}.three_act_demo.proof_moments`);
      checkLines(obj.three_act_demo.close, `${name}.three_act_demo.close`);
    }
  }

  return { ok: errors.length === 0, errors };
};

type PackInclude = "cold_call_prep_card" | "meeting_booking_pack" | "spin_demo_pack";
const ALLOWED_PACK_INCLUDES = new Set<PackInclude>([
  "cold_call_prep_card",
  "meeting_booking_pack",
  "spin_demo_pack",
]);

type InternalResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; details?: unknown };

const coercePackIncludes = (raw: unknown): PackInclude[] => {
  const values = Array.isArray(raw) ? raw : [];
  const next = values
    .map((v) => v?.toString?.() ?? "")
    .filter((v): v is PackInclude => ALLOWED_PACK_INCLUDES.has(v as PackInclude));
  return next.length ? next : ["cold_call_prep_card"];
};

const generateAndSavePackInternal = async (params: {
  admin: any;
  userId: string;
  correlationId: string;
  rawContactId: string;
  include: PackInclude[];
  language: string;
  resolvedContact?: { contactId: string; contact: ResolvedContact };
}): Promise<
  InternalResult<{
    correlation_id: string;
    generation_run_id: string;
    pack_id: string;
    status: "success";
    quality_report: { passes: boolean; failed_checks: string[] };
    contact_id: string;
    contact: ResolvedContact;
    pack: any;
    insufficient_evidence: boolean;
  }>
> => {
  const { admin, userId, correlationId, rawContactId, include, language } = params;

  let contactId = params.resolvedContact?.contactId || rawContactId;
  let contact: ResolvedContact | null = params.resolvedContact?.contact || null;

  if (!contact) {
    const resolved = await resolveContactForUser(admin, userId, rawContactId);
    if (!resolved) return { ok: false, status: 404, error: "Contact not found" };
    contactId = resolved.contactId;
    contact = resolved.contact;
  }

  const { data: approvedFacts, error: factsError } = await admin
    .from("v_approved_facts")
    .select("evidence_id, claim, source_url, evidence_snippet, captured_at, confidence")
    .eq("owner_user_id", userId)
    .eq("contact_id", contactId);
  if (factsError) return { ok: false, status: 500, error: factsError.message };

  const hypotheses: any[] = [];
  const h1 = crypto.randomUUID();
  const insufficientEvidence = (approvedFacts || []).length === 0;
  hypotheses.push({
    hypothesis_id: h1,
    hypothesis: insufficientEvidence
      ? "Insufficient evidence to state company specifics; validate current workflow and ownership."
      : "Validate workflow details before using specific claims.",
    based_on_evidence_ids: [],
    how_to_verify:
      "Ask: How do you currently run this process today? Who owns follow-up actions and what blocks execution?",
    priority: "high",
  });

  const line = (id: string, text: string, evidenceIds: string[] = [], hypothesisIds: string[] = []) => ({
    id,
    text,
    evidence_ids: evidenceIds,
    hypothesis_ids: hypothesisIds,
  });

  const fallbackColdCall = include.includes("cold_call_prep_card")
    ? {
        opener_variants: [
          line("op1", `Dobrý den ${contact.name}, máte teď minutu na krátkou otázku?`, [], [h1]),
          line("op2", `Jestli se to nehodí, mám zavolat později, nebo je u vás lepší člověk na tenhle typ rozhodnutí?`, [], [h1]),
          line("op3", `Budu stručný — můžu se zeptat, jak to dnes řešíte?`, [], [h1]),
        ],
        discovery_questions: [
          line("dq1", "Jak to dnes řešíte (proces, nástroj, frekvence)?", [], [h1]),
          line("dq2", "Kdo to dnes vlastní a kdo je v tom ještě zapojený?", [], [h1]),
          line("dq3", "Kde se to dnes nejčastěji zasekne?", [], [h1]),
          line("dq4", "Co to stojí v čase nebo v riziku, když to zůstane stejné?", [], [h1]),
          line("dq5", "Co by muselo platit, aby mělo smysl to změnit?", [], [h1]),
        ],
        objections: [
          {
            id: "obj1",
            trigger: "Už to nějak řešíme.",
            response: "Super — co na tom funguje a co byste chtěli, aby fungovalo líp?",
            evidence_ids: [],
            hypothesis_ids: [h1],
          },
          {
            id: "obj2",
            trigger: "Nemám čas.",
            response: "Chápu. Můžu jen ověřit jednu věc: je větší problém získat input, nebo z toho udělat akci?",
            evidence_ids: [],
            hypothesis_ids: [h1],
          },
          {
            id: "obj3",
            trigger: "Pošlete to do mailu.",
            response: "Pošlu. Aby to nebylo generické: co má ten mail hlavně zodpovědět — dopad, implementaci, nebo cenu?",
            evidence_ids: [],
            hypothesis_ids: [h1],
          },
        ],
        insufficient_evidence: insufficientEvidence,
        insufficient_evidence_reasons: insufficientEvidence ? ["No approved facts for this contact."] : [],
      }
    : null;

  const fallbackMeetingPack = include.includes("meeting_booking_pack")
    ? {
        discovery_questions: [
          line("mq1", "Proč to řešíte právě teď?", [], [h1]),
          line("mq2", "Jak poznáte, že další krok/demíčko dává smysl?", [], [h1]),
          line("mq3", "Kdo musí být u dalšího kroku, aby se rozhodlo rychle?", [], [h1]),
          line("mq4", "Co musí být jasné po patnácti minutách, aby to stálo za pokračování?", [], [h1]),
        ],
        meeting_asks: [
          line("ma1", "Dává smysl dát si krátké demo a projít, jak to u vás dnes funguje end‑to‑end?", [], [h1]),
          line("ma2", "Pokud to bude relevantní, přizveme i člověka, který vlastní follow‑up a rozhodnutí.", [], [h1]),
        ],
        agenda: [
          line("ag1", "Jak to dnes běží a kde se to láme.", [], [h1]),
          line("ag2", "Jaký dopad to má na KPI a rizika.", [], [h1]),
          line("ag3", "Jak vypadá ideální stav a další krok.", [], [h1]),
        ],
        next_step_conditions: [
          line("ns1", "Když je bottleneck v ownershipu, řešíme odpovědnost a workflow.", [], [h1]),
          line("ns2", "Když je bottleneck v datech, řešíme sběr, kvalitu a akční výstupy.", [], [h1]),
        ],
        insufficient_evidence: insufficientEvidence,
        insufficient_evidence_reasons: insufficientEvidence ? ["No approved facts for this contact."] : [],
      }
    : null;

  const fallbackSpinPack = include.includes("spin_demo_pack")
    ? {
        spin: {
          situation: [line("s1", "Jak to dnes řešíte a kdo to vlastní?", [], [h1])],
          problem: [line("p1", "Co je dnes největší komplikace nebo bottleneck?", [], [h1])],
          implication: [line("i1", "Jaký dopad to má na čas, kvalitu, nebo riziko?", [], [h1])],
          need_payoff: [line("n1", "Kdybyste to vyřešili, co by se zlepšilo jako první?", [], [h1])],
        },
        three_act_demo: {
          act1: [line("a1", "Potvrdíme současný stav a cíle.", [], [h1])],
          act2: [line("a2", "Ukážeme konkrétní workflow a hodnotu v praxi.", [], [h1])],
          act3: [line("a3", "Sladíme další krok a success kritéria.", [], [h1])],
          proof_moments: [line("pm1", "Zmapujeme, co je pro vás důkaz úspěchu.", [], [h1])],
          close: [line("c1", "Domluvíme nejmenší další krok a kdo musí být u toho.", [], [h1])],
        },
        insufficient_evidence: insufficientEvidence,
        insufficient_evidence_reasons: insufficientEvidence ? ["No approved facts for this contact."] : [],
      }
    : null;

  const sanitizeText = (text: string) => text.replace(/\s+/g, " ").trim();

  const normalizeLines = (lines: any[], prefix: string, fallback: any[]) => {
    const fallbackLines = Array.isArray(fallback) ? fallback : [];
    if (!Array.isArray(lines) || lines.length === 0) return fallbackLines;
    const evidenceIds = new Set((approvedFacts || []).map((f: any) => f?.evidence_id).filter(Boolean));
    const hypothesisIds = new Set([h1]);
    return lines
      .map((line: any, idx: number) => {
        const text = sanitizeText(line?.text?.toString() || "");
        if (!text) return fallbackLines[idx] || null;
        const rawEvidence = Array.isArray(line?.evidence_ids) ? line.evidence_ids : [];
        const rawHypothesis = Array.isArray(line?.hypothesis_ids) ? line.hypothesis_ids : [];
        const evidence = rawEvidence.filter((id: string) => evidenceIds.has(id));
        const hypothesis = rawHypothesis.filter((id: string) => hypothesisIds.has(id));
        if (evidence.length === 0 && hypothesis.length === 0) hypothesis.push(h1);
        return {
          id: line?.id?.toString() || `${prefix}${idx + 1}`,
          text,
          evidence_ids: evidence,
          hypothesis_ids: hypothesis,
        };
      })
      .filter(Boolean);
  };

  const normalizeObjections = (items: any[], prefix: string, fallback: any[]) => {
    const fallbackItems = Array.isArray(fallback) ? fallback : [];
    if (!Array.isArray(items) || items.length === 0) return fallbackItems;
    const evidenceIds = new Set((approvedFacts || []).map((f: any) => f?.evidence_id).filter(Boolean));
    const hypothesisIds = new Set([h1]);
    return items
      .map((item: any, idx: number) => {
        const trigger = sanitizeText(item?.trigger?.toString() || "");
        const response = sanitizeText(item?.response?.toString() || "");
        if (!response) return fallbackItems[idx] || null;
        const rawEvidence = Array.isArray(item?.evidence_ids) ? item.evidence_ids : [];
        const rawHypothesis = Array.isArray(item?.hypothesis_ids) ? item.hypothesis_ids : [];
        const evidence = rawEvidence.filter((id: string) => evidenceIds.has(id));
        const hypothesis = rawHypothesis.filter((id: string) => hypothesisIds.has(id));
        if (evidence.length === 0 && hypothesis.length === 0) hypothesis.push(h1);
        return {
          id: item?.id?.toString() || `${prefix}${idx + 1}`,
          trigger,
          response,
          evidence_ids: evidence,
          hypothesis_ids: hypothesis,
        };
      })
      .filter(Boolean);
  };

  const normalizeThreeAct = (payload: any, prefix: string, fallback: any) => {
    if (!payload) return fallback || null;
    const result = {
      act1: normalizeLines(payload.act1, `${prefix}a1-`, fallback?.act1 || []),
      act2: normalizeLines(payload.act2, `${prefix}a2-`, fallback?.act2 || []),
      act3: normalizeLines(payload.act3, `${prefix}a3-`, fallback?.act3 || []),
      proof_moments: normalizeLines(payload.proof_moments, `${prefix}pm-`, fallback?.proof_moments || []),
      close: normalizeLines(payload.close, `${prefix}c-`, fallback?.close || []),
    };
    return result;
  };

  const normalizeSpin = (payload: any, prefix: string, fallback: any) => {
    if (!payload) return fallback || null;
    return {
      situation: normalizeLines(payload.situation, `${prefix}s-`, fallback?.situation || []),
      problem: normalizeLines(payload.problem, `${prefix}p-`, fallback?.problem || []),
      implication: normalizeLines(payload.implication, `${prefix}i-`, fallback?.implication || []),
      need_payoff: normalizeLines(payload.need_payoff, `${prefix}n-`, fallback?.need_payoff || []),
    };
  };

  let aiPack: any = null;
  let modelUsed = "deterministic_v0";
  let promptVersion = "deterministic";

  const apiKey = await getOpenAiApiKeyForUser(userId);
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const model = Deno.env.get("PACKS_MODEL") || "gpt-4o-mini";
      const intel = await kv.get(userKey(userId, `intel:${contactId}`));
      const facts = (approvedFacts || []).map((f: any) => ({
        evidence_id: f.evidence_id,
        claim: f.claim,
        evidence_snippet: f.evidence_snippet,
        source_url: f.source_url,
      }));

      const systemPrompt = `You are a senior B2B sales strategist. Output strict JSON only.

OFFER CONTEXT (what we sell):
${PRODUCT_KNOWLEDGE}
${INDUSTRY_KNOWLEDGE}

Rules:
- Use language: ${language}.
- Each line must include hypothesis_ids with the provided hypothesis id.
- evidence_ids may only use the provided evidence ids.
- If you mention any specific company fact (stack, headcount, revenue, numbers, events), you MUST reference evidence_ids that support it.
- Avoid digits. If you use digits, you MUST reference evidence_ids whose evidence_snippet contains the exact digit token.
- Keep each line under 140 characters.
- No fluff. No generic marketing.
- Do not invent facts; if unsure, ask discovery questions.

Return JSON with only the requested pack objects: cold_call_prep_card, meeting_booking_pack, spin_demo_pack.`;

      const userPrompt = `Contact:\n${JSON.stringify(
        {
          id: contactId,
          name: contact.name,
          title: contact.title || null,
          company: contact.company || null,
          linkedin_url: contact.linkedin_url || null,
          company_website: contact.company_website || null,
          manual_notes: contact.manual_notes || null,
        },
        null,
        2,
      )}\n\nCached intel (optional):\n${JSON.stringify(intel || {}, null, 2)}\n\nApproved facts:\n${JSON.stringify(facts, null, 2)}\n\nHypothesis id: ${h1}\nInclude packs: ${include.join(", ")}\n\nExpected JSON shape example:\n{\n  \"cold_call_prep_card\": {\n    \"opener_variants\": [{\"id\":\"op1\",\"text\":\"...\",\"evidence_ids\":[],\"hypothesis_ids\":[\"${h1}\"]}],\n    \"discovery_questions\": [{\"id\":\"dq1\",\"text\":\"...\",\"evidence_ids\":[],\"hypothesis_ids\":[\"${h1}\"]}],\n    \"objections\": [{\"id\":\"obj1\",\"trigger\":\"...\",\"response\":\"...\",\"evidence_ids\":[],\"hypothesis_ids\":[\"${h1}\"]}]\n  }\n}\nOnly include pack objects requested.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      aiPack = safeJsonParse(completion.choices?.[0]?.message?.content, null);
      modelUsed = model;
      promptVersion = "pack_ai_v1";
    } catch (e) {
      console.error("Pack generation OpenAI error:", e);
      aiPack = null;
    }
  }

  const coldCall = include.includes("cold_call_prep_card")
    ? {
        opener_variants: normalizeLines(aiPack?.cold_call_prep_card?.opener_variants, "op", fallbackColdCall?.opener_variants || []),
        discovery_questions: normalizeLines(aiPack?.cold_call_prep_card?.discovery_questions, "dq", fallbackColdCall?.discovery_questions || []),
        objections: normalizeObjections(aiPack?.cold_call_prep_card?.objections, "obj", fallbackColdCall?.objections || []),
        insufficient_evidence: insufficientEvidence,
        insufficient_evidence_reasons: insufficientEvidence ? ["No approved facts for this contact."] : [],
      }
    : null;

  const meetingPack = include.includes("meeting_booking_pack")
    ? {
        discovery_questions: normalizeLines(aiPack?.meeting_booking_pack?.discovery_questions, "mq", fallbackMeetingPack?.discovery_questions || []),
        meeting_asks: normalizeLines(aiPack?.meeting_booking_pack?.meeting_asks, "ma", fallbackMeetingPack?.meeting_asks || []),
        agenda: normalizeLines(aiPack?.meeting_booking_pack?.agenda, "ag", fallbackMeetingPack?.agenda || []),
        next_step_conditions: normalizeLines(aiPack?.meeting_booking_pack?.next_step_conditions, "ns", fallbackMeetingPack?.next_step_conditions || []),
        insufficient_evidence: insufficientEvidence,
        insufficient_evidence_reasons: insufficientEvidence ? ["No approved facts for this contact."] : [],
      }
    : null;

  const spinPack = include.includes("spin_demo_pack")
    ? {
        spin: normalizeSpin(aiPack?.spin_demo_pack?.spin, "sp", fallbackSpinPack?.spin || null),
        three_act_demo: normalizeThreeAct(aiPack?.spin_demo_pack?.three_act_demo, "ta", fallbackSpinPack?.three_act_demo || null),
        insufficient_evidence: insufficientEvidence,
        insufficient_evidence_reasons: insufficientEvidence ? ["No approved facts for this contact."] : [],
      }
    : null;

  const envelope = {
    correlation_id: correlationId,
    contact_id: contactId,
    approved_facts: (approvedFacts || []).map((f: any) => ({
      evidence_id: f.evidence_id,
      claim: f.claim,
      source_url: f.source_url,
      evidence_snippet: f.evidence_snippet,
      captured_at: f.captured_at,
      confidence: f.confidence,
    })),
    hypotheses,
    cold_call_prep_card: coldCall,
    meeting_booking_pack: meetingPack,
    spin_demo_pack: spinPack,
  };

  const validation = validateGeneratedPack(envelope);
  const qualityReport = { passes: validation.ok, failed_checks: validation.errors };
  if (!validation.ok) return { ok: false, status: 500, error: "Pack validation failed", details: qualityReport };

  const generationRunId = crypto.randomUUID();
  await admin.from("generation_runs").insert({
    id: generationRunId,
    owner_user_id: userId,
    correlation_id: correlationId,
    purpose: include.length > 1 ? "full_pack" : include[0],
    model: modelUsed,
    prompt_version: promptVersion,
    input: { contact_id: contactId, include },
    output: envelope,
    validator_output: qualityReport,
    status: "success",
    error: null,
  });

  const { data: savedPack, error: packError } = await admin
    .from("sales_packs")
    .insert({
      owner_user_id: userId,
      correlation_id: correlationId,
      contact_id: contactId,
      pack_version: 1,
      approved_facts: envelope.approved_facts,
      hypotheses: envelope.hypotheses,
      cold_call_prep_card: coldCall,
      meeting_booking_pack: meetingPack,
      spin_demo_pack: spinPack,
      quality_report: qualityReport,
      generation_run_id: generationRunId,
    })
    .select("id, correlation_id, contact_id, approved_facts, hypotheses, cold_call_prep_card, meeting_booking_pack, spin_demo_pack, quality_report, created_at")
    .single();

  if (packError || !savedPack) return { ok: false, status: 500, error: packError?.message || "Failed to save pack" };

  await auditEvent(admin, userId, correlationId, "generate", "pack_generated", {
    pack_id: savedPack.id,
    contact_id: contactId,
    include,
    insufficient_evidence: insufficientEvidence,
  });

  return {
    ok: true,
    value: {
      correlation_id: correlationId,
      generation_run_id: generationRunId,
      pack_id: savedPack.id,
      status: "success",
      quality_report: qualityReport,
      contact_id: contactId,
      contact,
      pack: savedPack,
      insufficient_evidence: insufficientEvidence,
    },
  };
};

app.post(`${BASE_PATH}/lead/prepare`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const rawContactId = body?.contact_id?.toString();
  const language = body?.language?.toString() || "cs";
  const include = coercePackIncludes(body?.include ?? ["cold_call_prep_card", "meeting_booking_pack", "spin_demo_pack"]);
  const baseUrl = body?.base_url?.toString() || null;

  if (!rawContactId) return c.json({ error: "Missing contact_id" }, 400);

  const resolved = await resolveContactForUser(admin, userId, rawContactId);
  if (!resolved) return c.json({ error: "Contact not found" }, 404);

  const derivedSite = deriveCompanyWebsiteFromEmail(resolved.contact.email || null);
  const companySite = (baseUrl || resolved.contact.company_website || derivedSite || "").toString().trim();
  let ingest: any = null;
  const extracts: Array<{ document_id: string; ok: boolean; extraction_run_id?: string; error?: string }> = [];

  if (companySite) {
    try {
      const normalized = normalizeBaseUrl(companySite);
      if (!resolved.contact.company_website || normalizeBaseUrl(resolved.contact.company_website) !== normalized) {
        await admin
          .from("contacts")
          .update({ company_website: normalized, updated_at: new Date().toISOString() })
          .eq("id", resolved.contactId);
      }
    } catch {
      // ignore invalid URLs
    }

    try {
      ingest = await ingestCompanySiteAllowlistInternal({
        admin,
        userId,
        correlationId,
        contactId: resolved.contactId,
        baseUrl: companySite,
      });
      for (const doc of ingest.documents || []) {
        try {
          const res = await extractEvidenceClaimsInternal({
            admin,
            userId,
            correlationId,
            documentId: doc.document_id,
            model: "gpt-4o-mini",
            promptVersion: "extractor_v1",
          });
          extracts.push({ document_id: doc.document_id, ok: true, extraction_run_id: res.extraction_run_id });
        } catch (e) {
          extracts.push({ document_id: doc.document_id, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
    } catch (e) {
      ingest = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const autoReview = await autoApproveLowRiskClaims({
    admin,
    userId,
    correlationId,
    contactId: resolved.contactId,
  });

  const packRes = await generateAndSavePackInternal({
    admin,
    userId,
    correlationId,
    rawContactId: resolved.contactId,
    include,
    language,
    resolvedContact: resolved,
  });

  if (!packRes.ok) {
    return c.json({ error: packRes.error, details: packRes.details ?? null }, packRes.status);
  }

  return c.json({
    correlation_id: packRes.value.correlation_id,
    generation_run_id: packRes.value.generation_run_id,
    pack_id: packRes.value.pack_id,
    quality_report: packRes.value.quality_report,
    pack: packRes.value.pack,
    contact: packRes.value.contact,
    ingest,
    extracts,
    auto_review: autoReview,
  });
});

app.post(`${BASE_PATH}/packs/generate`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const rawContactId = body?.contact_id?.toString();
  const include = coercePackIncludes(body?.include);
  const language = body?.language?.toString() || "cs";
  if (!rawContactId) return c.json({ error: "Missing contact_id" }, 400);

  const res = await generateAndSavePackInternal({
    admin,
    userId,
    correlationId,
    rawContactId,
    include,
    language,
  });

  if (!res.ok) return c.json({ error: res.error, details: res.details ?? null }, res.status);

  return c.json({
    correlation_id: res.value.correlation_id,
    generation_run_id: res.value.generation_run_id,
    pack_id: res.value.pack_id,
    status: "success",
    quality_report: res.value.quality_report,
  });
});

app.get(`${BASE_PATH}/packs/:packId`, async (c) => {
  const userId = getUserId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const packId = c.req.param("packId");
  const { data, error: packError } = await admin
    .from("sales_packs")
    .select("id, correlation_id, contact_id, approved_facts, hypotheses, company_dossier, lead_dossier, cold_call_prep_card, meeting_booking_pack, spin_demo_pack, quality_report, created_at")
    .eq("id", packId)
    .eq("owner_user_id", userId)
    .single();

  if (packError || !data) return c.json({ error: "Pack not found" }, 404);
  return c.json(data);
});

// --- PRE-CALL CONTEXT (FAST + CACHED) ---
app.post(`${BASE_PATH}/precall/context`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const rawContactId = body?.contact_id?.toString();
  const language = body?.language?.toString() || "cs";
  const include = coercePackIncludes(
    body?.include ?? ["cold_call_prep_card", "meeting_booking_pack", "spin_demo_pack"],
  );
  const ttlHoursRaw = Number(body?.ttl_hours ?? 24);
  const ttlHours = Number.isFinite(ttlHoursRaw) && ttlHoursRaw >= 0 ? ttlHoursRaw : 24;
  const timeline = body?.timeline || {};
  const timelineLimits = {
    activities: Math.max(0, Math.min(50, Number(timeline.activities ?? 15) || 15)),
    notes: Math.max(0, Math.min(50, Number(timeline.notes ?? 10) || 10)),
    deals: Math.max(0, Math.min(20, Number(timeline.deals ?? 3) || 3)),
  };

  if (!rawContactId) return c.json({ error: "Missing contact_id" }, 400);

  const resolved = await resolveContactForUser(admin, userId, rawContactId);
  if (!resolved) return c.json({ error: "Contact not found" }, 404);

  const pd = await resolvePipedrivePersonAndDeal({ admin, userId, rawContactId, resolved });
  let pdTimeline: { activities: any[]; notes: any[]; deals: any[] } | null = null;
  if (pd.configured && pd.apiKey && pd.personId) {
    try {
      pdTimeline = await fetchPipedriveTimeline({
        apiKey: pd.apiKey,
        personId: pd.personId,
        limits: timelineLimits,
      });
    } catch (e) {
      console.error("Pipedrive timeline fetch failed (non-blocking):", e);
    }
  }

  let pack: any = await getLatestPackForContact(admin, userId, resolved.contactId);
  let generated = false;

  if (!pack || isOlderThanHours(parseMaybeDate(pack?.created_at), ttlHours)) {
    const res = await generateAndSavePackInternal({
      admin,
      userId,
      correlationId,
      rawContactId: resolved.contactId,
      include,
      language,
      resolvedContact: resolved,
    });
    if (!res.ok) return c.json({ error: res.error, details: res.details ?? null }, res.status);
    pack = res.value.pack;
    generated = true;
  }

  const leadDossier = (pack?.lead_dossier && typeof pack.lead_dossier === "object") ? pack.lead_dossier : {};
  const existingBrief = (leadDossier as any)?.precall_brief ?? null;
  const existingBriefDate = parseMaybeDate(existingBrief?.generated_at || existingBrief?.generatedAt || null);

  let precall: any =
    existingBrief && !generated && !isOlderThanHours(existingBriefDate, ttlHours)
      ? existingBrief
      : null;

  if (!precall) {
    try {
      const brief = await generatePrecallBrief({
        contact: resolved.contact,
        timeline: pdTimeline,
        approvedFacts: (pack?.approved_facts || []) as any[],
        language,
        openaiApiKey: await getOpenAiApiKeyForUser(userId),
      });
      if (brief) {
        const nextLeadDossier = { ...(leadDossier as any), precall_brief: brief };
        const { error: updateError } = await admin
          .from("sales_packs")
          .update({ lead_dossier: nextLeadDossier, updated_at: new Date().toISOString() })
          .eq("id", pack.id)
          .eq("owner_user_id", userId);
        if (updateError) {
          console.error("sales_packs precall update failed (non-blocking):", updateError);
        }
        pack = { ...pack, lead_dossier: nextLeadDossier };
        precall = brief;
      }
    } catch (e) {
      console.error("Precall brief generation failed (non-blocking):", e);
    }
  }

  return c.json({
    contact: {
      id: resolved.contactId,
      name: resolved.contact.name,
      company: resolved.contact.company,
      email: resolved.contact.email,
      company_website: resolved.contact.company_website,
      title: resolved.contact.title,
      linkedin_url: resolved.contact.linkedin_url,
      manual_notes: resolved.contact.manual_notes,
    },
    pack,
    pack_id: pack?.id || null,
    generated,
    precall: precall
      ? {
          brief: precall.brief || "",
          why_now: precall.why_now || "",
          opener: precall.opener || "",
          risks: Array.isArray(precall.risks) ? precall.risks : [],
          questions: Array.isArray(precall.questions) ? precall.questions : [],
          generated_at: precall.generated_at || null,
        }
      : null,
    pipedrive: {
      configured: Boolean(pd.configured && pd.apiKey),
      person_id: pd.personId,
      timeline: pdTimeline,
    },
  });
});

// --- REAL-TIME WHISPERING: OBJECTIONS (DETERMINISTIC + EVIDENCE-GATED) ---
type ObjectionPlay = {
  id: string;
  category: string;
  core_fear: string;
  surface_objections: string[];
  detection_signals: string[];
  validated_response: string;
  implication_question: string;
  reframe: string;
  need_payoff: string;
  next_step: string;
};

const OBJECTION_DATASET_V1 = {
  version: "1.0",
  domain: "B2B HR-Tech SaaS",
  product: "Echo Pulse",
  global_response_rules: {
    never_do: ["defend_price", "argue", "overexplain_features", "rush_to_close"],
    always_do: ["validate_emotion", "reframe_context", "expand_implication", "offer_low_risk_next_step"],
    preferred_outcome: "pilot_or_next_step",
    primary_value_frame: ["early_signal", "decision_clarity", "risk_reduction", "time_savings_for_leadership"],
  },
  objection_space: [
    {
      id: "FIN_01",
      category: "financial",
      core_fear: "poor_roi",
      surface_objections: ["je to drahé", "nemáme na to rozpočet", "nevidím návratnost", "musím to obhájit vedení"],
      detection_signals: ["řeší cenu dřív než problém", "ptá se na slevy", "odkládá rozhodnutí kvůli rozpočtu"],
      validated_response: "Rozumím, dává smysl se dívat na návratnost.",
      implication_question: "Když dnes odejde dobrý člověk a vy to zjistíte pozdě, kolik vás to stojí?",
      reframe: "Nechci obhajovat cenu. Chci jen zjistit, jestli vám chybí včasný signál rizika.",
      need_payoff: "Pokud byste měl včasný signál, můžete reagovat dřív, než je rozhodnutí drahé.",
      next_step: "pilot_small_team",
    },
    {
      id: "DATA_01",
      category: "data_privacy",
      core_fear: "loss_of_trust",
      surface_objections: ["bojíme se GDPR", "lidi se neotevřou", "půjde poznat, kdo co řekl"],
      detection_signals: ["opakované otázky na anonymitu", "zapojení IT / právníka", "opatrný tón"],
      validated_response: "Tohle je naprosto legitimní obava.",
      implication_question: "Jakou pravdu dnes dostáváte od lidí, když nemají bezpečný kanál?",
      reframe: "Bez důvěry a bezpečí dostanete jen oficiální verzi reality.",
      need_payoff: "Cíl je bezpečný signál na úrovni týmu, ne individuální výpovědi.",
      next_step: "explain_aggregation_logic",
    },
    {
      id: "SQ_01",
      category: "status_quo",
      core_fear: "change_risk",
      surface_objections: ["už máme průzkumy", "komunikace funguje", "už to nějak řešíme"],
      detection_signals: ["obhajoba současného stavu", "srovnávání s jiným nástrojem"],
      validated_response: "To je dobře, že se tomu věnujete.",
      implication_question: "Jak rychle se dnes dozvíte, že se v jednom týmu něco láme?",
      reframe: "Nejde o nahrazení. Jde o frekvenci a včasnost signálu.",
      need_payoff: "Když víte dřív, máte víc možností jak reagovat.",
      next_step: "contrast_annual_vs_pulse",
    },
    {
      id: "EMO_01",
      category: "emotional_fear",
      core_fear: "loss_of_control",
      surface_objections: ["otevře to moc problémů", "nechci Pandořinu skříňku", "nebudeme to stíhat řešit"],
      detection_signals: ["nejistota v hlase", "téma kapacity", "uhýbání od rozhodnutí"],
      validated_response: "Tohle slyším často a je to pochopitelné.",
      implication_question: "Co se stane, když se o těch věcech dozvíte až ve chvíli, kdy je pozdě?",
      reframe: "Ty problémy často už existují; rozdíl je, jestli o nich víte včas a v jakém rozsahu.",
      need_payoff: "Bezpečný rozsah a prioritizace je důležitější než otevřít všechno najednou.",
      next_step: "define_safe_scope",
    },
    {
      id: "AUTH_01",
      category: "authority",
      core_fear: "internal_conflict",
      surface_objections: ["manažeři to nevezmou", "ukáže to slabiny vedení", "nebude to citlivé téma?"],
      detection_signals: ["řešení reakce manažerů", "opatrnost kolem leadershipu"],
      validated_response: "Tohle je citlivé téma v každé firmě.",
      implication_question: "Jak se dnes tyhle věci řeší bez dat?",
      reframe: "Data pomáhají odosobnit diskusi a snížit politiku.",
      need_payoff: "Manažeři dostanou šanci reagovat dřív a cíleněji.",
      next_step: "manager_framing",
    },
    {
      id: "TIME_01",
      category: "timing",
      core_fear: "decision_avoidance",
      surface_objections: ["teď se to nehodí", "ozveme se později", "není na to čas"],
      detection_signals: ["odkládání bez jasného důvodu", "vágní odpovědi"],
      validated_response: "Chápu, že teď řešíte spoustu věcí.",
      implication_question: "Co by se muselo stát, abyste si za tři měsíce řekl, že jste to měli řešit dřív?",
      reframe: "Právě při změnách se signály nejčastěji ztrácí.",
      need_payoff: "Časově omezený pilot nevyžaduje velké rozhodnutí.",
      next_step: "time_boxed_pilot",
    },
  ] as ObjectionPlay[],
};

const stripDiacritics = (input: string) =>
  input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const scoreObjection = (text: string, play: ObjectionPlay) => {
  const t = stripDiacritics(text);
  let score = 0;
  for (const s of play.surface_objections) {
    const key = stripDiacritics(s);
    if (key && t.includes(key)) score += 3;
  }
  // lightweight keyword boosts
  const boosts: Record<string, string[]> = {
    FIN_01: ["cena", "rozpocet", "drah", "sleva", "navratnost", "roi"],
    DATA_01: ["gdpr", "anonym", "anonymit", "duvera", "pravnik", "it"],
    SQ_01: ["uz", "pruzkum", "survey", "spokoj", "funguje", "mame"],
    EMO_01: ["pandor", "problem", "kapacit", "nestih", "moc", "control"],
    AUTH_01: ["manazer", "vedeni", "leadership", "polit", "citliv", "slabin"],
    TIME_01: ["pozdeji", "ted", "nyni", "cas", "nehodi", "potom", "pristi"],
  };
  for (const kw of boosts[play.id] || []) {
    if (t.includes(kw)) score += 1;
  }
  return score;
};

const classifyObjection = (text: string) => {
  const plays = OBJECTION_DATASET_V1.objection_space;
  let best: { play: ObjectionPlay; score: number } | null = null;
  for (const p of plays) {
    const s = scoreObjection(text, p);
    if (!best || s > best.score) best = { play: p, score: s };
  }
  const score = best?.score || 0;
  const confidence = score >= 5 ? "high" : score >= 3 ? "medium" : "low";
  return { play: best?.play || plays[0], score, confidence };
};

app.post(`${BASE_PATH}/whisper/objection`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const body = await c.req.json().catch(() => ({}));
  const contactId = body?.contact_id?.toString();
  const prospectText = body?.prospect_text?.toString();
  if (!contactId) return c.json({ error: "Missing contact_id" }, 400);
  if (!prospectText) return c.json({ error: "Missing prospect_text" }, 400);

  const { play, confidence } = classifyObjection(prospectText);

  // Approved internal product facts can be used, but only if they exist and are referenced via evidence_ids.
  const { data: internalFacts } = await admin
    .from("v_approved_facts")
    .select("evidence_id, claim, source_url, evidence_snippet, captured_at, confidence")
    .eq("owner_user_id", userId)
    .is("contact_id", null)
    .like("source_url", "internal://%");

  const productEvidenceIds: string[] = [];
  const productFactSnippets: string[] = [];
  for (const f of internalFacts || []) {
    if (!f?.evidence_id) continue;
    productEvidenceIds.push(f.evidence_id);
    productFactSnippets.push(f.evidence_snippet || "");
  }

  const insufficientEvidence = productEvidenceIds.length === 0;
  const hypotheses: any[] = [];

  const mkHyp = (hypothesis: string, howToVerify: string, basedOn: string[] = []) => {
    const id = crypto.randomUUID();
    hypotheses.push({
      hypothesis_id: id,
      hypothesis,
      based_on_evidence_ids: basedOn,
      how_to_verify: howToVerify,
      priority: "high",
    });
    return id;
  };

  const hValidate = mkHyp(
    "Tato námitka je primárně o základním strachu (core fear), ne o konkrétní formulaci. Potřebujeme potvrdit kontext.",
    "Zeptej se: Když říkáte (…), co je pro vás hlavní obava – rozpočet, důvěra/anonymita, kapacita řešit věci, nebo timing?",
    [],
  );

  const hProduct = insufficientEvidence
    ? mkHyp(
        "Produktové tvrzení nelze použít jako fakt bez schválené evidence. Drž se otázek a nízkorizikového next stepu.",
        "Neříkej žádné konkrétní produktové parametry. Vytěž jen proces, dopady a domluv pilot.",
        [],
      )
    : null;

  const line = (id: string, text: string, evidenceIds: string[] = [], hypothesisIds: string[] = []) => ({
    id,
    text,
    evidence_ids: evidenceIds,
    hypothesis_ids: hypothesisIds,
  });

  const whisper = {
    validate: line("validate", play.validated_response, [], [hValidate]),
    reframe: line("reframe", play.reframe, [], [hValidate, ...(hProduct ? [hProduct] : [])]),
    implication_question: line("implication_q", play.implication_question, [], [hValidate]),
    next_step: line(
      "next_step",
      play.next_step === "pilot_small_team"
        ? "Navrhuju malý pilot v jednom týmu a na konci jen vyhodnotit, jestli to stojí za rozšíření."
        : play.next_step === "time_boxed_pilot"
          ? "Navrhuju časově omezený pilot (např. 2–3 týdny) v jednom týmu a pak rozhodnutí na datech."
          : play.next_step === "define_safe_scope"
            ? "Navrhuju bezpečný rozsah: jeden tým, jedna oblast, a jasně co se s výstupy bude dít."
            : play.next_step === "explain_aggregation_logic"
              ? "Můžeme projít, jak přesně by byla anonymita zajištěná a jaké agregace byste potřebovali."
              : play.next_step === "manager_framing"
                ? "Můžeme si sladit, jak to odkomunikovat manažerům tak, aby to brali jako podporu, ne kontrolu."
                : "Můžeme udělat malý další krok a ověřit relevanci na konkrétním týmu.",
      [],
      [hValidate, ...(hProduct ? [hProduct] : [])],
    ),
  };

  const envelope = {
    correlation_id: correlationId,
    contact_id: contactId,
    objection_id: play.id,
    category: play.category,
    core_fear: play.core_fear,
    confidence,
    policy: OBJECTION_DATASET_V1.global_response_rules,
    product_evidence_available: !insufficientEvidence,
    hypotheses,
    whisper,
  };

  // Gate: every whisper line must have hypothesis_ids or evidence_ids
  const requiredLines = [whisper.validate, whisper.reframe, whisper.implication_question, whisper.next_step];
  for (const l of requiredLines) {
    const eids = Array.isArray(l.evidence_ids) ? l.evidence_ids : [];
    const hids = Array.isArray(l.hypothesis_ids) ? l.hypothesis_ids : [];
    if (eids.length === 0 && hids.length === 0) return c.json({ error: "Whisper validation failed" }, 500);
  }

  await auditEvent(admin, userId, correlationId, "generate", "whisper_generated", {
    contact_id: contactId,
    objection_id: play.id,
    confidence,
    product_evidence_available: !insufficientEvidence,
  });

  return c.json(envelope);
});

// --- TYPES ---
type Contact = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email?: string;
  status: 'pending' | 'called';
};

type Campaign = {
  id: string;
  name: string;
  description: string;
  contacts: Contact[];
};

type CallLog = {
  id: string;
  campaignId: string;
  contactId: string;
  contactName?: string;
  companyName?: string;
  disposition: string;
  notes: string;
  timestamp: number;
  duration?: number;
};

// --- ENDPOINTS ---

// --- ENDPOINTS ---

// --- KNOWLEDGE BASE ---
app.get(`${BASE_PATH}/knowledge`, async (c) => {
  const userId = getUserId(c);
  try {
    const modules = await kv.getByPrefix(userPrefix(userId, "knowledge:"));
    return c.json(modules);
  } catch (e) {
    console.error("Knowledge fetch failed:", e);
    return c.json({ error: "Failed to fetch knowledge" }, 500);
  }
});

app.post(`${BASE_PATH}/knowledge`, async (c) => {
  const userId = getUserId(c);
  const { title, content } = await c.req.json();
  if (!title || !content) return c.json({ error: "Missing title/content" }, 400);
  
  const id = crypto.randomUUID();
  await kv.set(userKey(userId, `knowledge:${id}`), { id, title, content });
  return c.json({ id, title, content });
});

app.delete(`${BASE_PATH}/knowledge/:id`, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param("id");
  await kv.del(userKey(userId, `knowledge:${id}`));
  return c.json({ ok: true });
});

// --- ANALYTICS ---
app.get(`${BASE_PATH}/analytics`, async (c) => {
  const userId = getUserId(c);
  try {
    const calls = await kv.getByPrefix(userPrefix(userId, "call:"));
    return c.json({
      totalCalls: calls.length,
      calls
    });
  } catch (e) {
    console.error("Analytics fetch failed:", e);
    return c.json({ totalCalls: 0, calls: [] });
  }
});

app.post(`${BASE_PATH}/pipedrive/import`, async (c) => {
  const userId = getUserId(c);
  const apiKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
  if (!apiKey) return c.json({ error: "No Pipedrive API key" }, 401);

  const admin = getAdminClient();
  if (!admin) return c.json({ error: "Supabase service role not configured" }, 500);

  try {
    const res = await fetch(`https://api.pipedrive.com/v1/leads?limit=200&api_token=${apiKey}`);
    if (!res.ok) return c.json({ error: "Pipedrive API error" }, res.status);
    const data = await res.json();
    const leads = (data.data || []).map((lead: any) => ({
      name: lead.title || lead.person_name || "Unnamed contact",
      phone: lead.person?.phone?.[0]?.value || lead.phone || null,
      email: lead.person?.email?.[0]?.value || lead.email || null,
      company: lead.organization_name || null,
      status: lead.label_ids?.[0] || lead.label || null,
      source: "pipedrive",
      external_id: lead.id?.toString() || null,
      last_touch: lead.update_time || null,
    }));

    const { error } = await admin
      .from("contacts")
      .upsert(leads, { onConflict: "source,external_id" });

    if (error) {
      console.error("Pipedrive import upsert failed:", error);
      return c.json({ error: "Failed to import contacts" }, 500);
    }

    return c.json({ ok: true, count: leads.length });
  } catch (e) {
    console.error("Pipedrive import failed:", e);
    return c.json({ error: "Pipedrive import failed" }, 500);
  }
});

// --- PIPEDRIVE INTEGRATION & ENRICHMENT ---

// 1. Create Verified Activity in Pipedrive (User Approved)
app.post(`${BASE_PATH}/pipedrive/activity`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
    if (!apiKey) return c.json({ error: "No API Key" }, 500);

    const { subject, type, note, person_id, duration } = await c.req.json();

    // --- 1. INTELLIGENT DEAL LINKING (The "Context Link") ---
    // Architecture decision: Activities must be linked to Deals for proper reporting.
    let deal_id = null;
    let org_id = null; // We can also fetch org_id to be safe, though Pipedrive often infers it.

    if (person_id) {
        try {
             console.log(`🔍 Hunting for Open Deals for Person ${person_id}...`);
             const dealRes = await fetch(`https://api.pipedrive.com/v1/persons/${person_id}/deals?status=open&limit=1&api_token=${apiKey}`, {
                 headers: { 'Accept': 'application/json' }
             });
             const dealData = await dealRes.json();
             
             if (dealData.data && dealData.data.length > 0) {
                 deal_id = dealData.data[0].id;
                 console.log(`🔗 SUCCESS: Linking Activity to Deal #${deal_id} ("${dealData.data[0].title}")`);
                 
                 // Capture Org ID if available from deal to ensure consistency
                 if (dealData.data[0].org_id) {
                     org_id = dealData.data[0].org_id.value;
                 }
             } else {
                 console.log("ℹ️ No Open Deal found. Activity will be logged to Person only.");
             }
        } catch (err) {
             console.error("⚠️ Deal Linking Failed (Non-blocking):", err);
        }
    }

    // --- 2. HTML FORMATTING (Beautifier) ---
    // Convert plain text newlines to HTML breaks and bold key sections for readability
    let htmlNote = note || "";
    if (!htmlNote.includes("<br>")) {
        htmlNote = htmlNote
            // Escape HTML chars if needed (basic)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            // Convert newlines
            .replace(/\n/g, '<br>')
            // Bold standard AI headers
            .replace(/(Result:|AI Summary:|Score:|Strengths:|Transcript:)/g, '<b>$1</b>');
    }

    const activityBody: any = {
        subject: subject,
        type: type || 'call',
        person_id: Number(person_id),
        done: 1, // Completed
        duration: duration || 0,
        note: htmlNote
    };

    if (deal_id) activityBody.deal_id = deal_id;
    if (org_id) activityBody.org_id = org_id;

    console.log("📤 Syncing Verified Activity to Pipedrive:", JSON.stringify(activityBody));

    const pdRes = await fetch(`https://api.pipedrive.com/v1/activities?api_token=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityBody)
    });

    if (!pdRes.ok) {
        const err = await pdRes.text();
        console.error("❌ Pipedrive Sync Error", err);
        return c.json({ error: "Failed to sync to Pipedrive", details: err }, 500);
    }

    return c.json({ success: true, data: await pdRes.json() });
  } catch (e) {
    console.error("Internal Sync Error", e);
    return c.json({ error: "Internal Sync Error" }, 500);
  }
});

// --- SECTOR-BASED BATTLE CARDS ENGINE ---
app.post(`${BASE_PATH}/ai/sector-battle-card`, async (c) => {
  const userId = getUserId(c);
  const { companyName, industry, personTitle } = await c.req.json();

  const apiKey = await getOpenAiApiKeyForUser(userId);
  if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `
    Jsi elitní Sales Strategist pro český B2B trh. Tvým úkolem je analyzovat prospekta a připravit "Battle Card" na míru.
    
    DEFINOVANÉ SEKTORY:
    1. SaaS / IT / Tech (Pain: integrace, security, škálování)
    2. E-commerce / Retail (Pain: marže, logistika, vratky, Q4 sezóna)
    3. Marketing / Agency (Pain: klientská retence, reporting, kreativní chaos)
    4. Finance / Legal / Consulting (Pain: compliance, risk, efektivita času)
    5. Construction / Real Estate (Pain: termíny, subdodavatelé, ceny materiálů)
    6. Manufacturing / Logistics (Pain: prostoje, energie, supply chain)
    7. HR / Recruitment (Pain: talent shortage, onboarding)

    INSTRUKCE:
    1. Podle názvu firmy "${companyName}" a oboru "${industry || 'neznámý'}" urči jeden z výše uvedených SEKTORŮ.
    2. Vytvoř 3 "Killer Objections Handlers" specifické pro tento sektor.
       - NEPOUŽÍVEJ obecné fráze ("Chápu vás").
       - POUŽIJ "Industry Jargon" (např. pro SaaS zmiň "API", pro Výrobu zmiň "OEE" nebo "směnný provoz").
    
    OUTPUT JSON FORMAT:
    {
      "detected_sector": "Název Sektoru",
      "sector_emoji": "Ikona",
      "strategy_insight": "Jedna věta, na co se v tomto sektoru zaměřit (např. 'Tlačí je termíny, nezdržuj.')",
      "objections": [
        {
          "trigger": "Např. 'Pošlete email' nebo 'Máme dodavatele'",
          "rebuttal": "Tvoje ostrá, sektorově specifická odpověď."
        }
      ]
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analýza pro firmu: ${companyName}, Pozice osoby: ${personTitle || "Rozhodovatel"}` },
      ],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return c.json(result);
  } catch (error) {
    console.error("Battle Card Gen Error:", error);
    return c.json({ error: "Failed to generate battle card" }, 500);
  }
});

// ============ BRIEF / CALL-SCRIPT / LIVE-COACH ============

// POST /ai/brief — Generate company+person brief with caching
app.post(`${BASE_PATH}/ai/brief`, async (c) => {
  const userId = getUserId(c);
  const { domain, personName, role, notes } = await c.req.json();
  if (!domain || !personName) return c.json({ error: "domain and personName required" }, 400);

  // Cache key
  const cacheKey = `brief:${await sha256Hex(`${userId}:${domain}:${personName}:${role || ""}`.toLowerCase())}`;
  const cached = await kv.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return c.json({ ...parsed, cached: true });
    } catch { /* stale cache, regenerate */ }
  }

  const apiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
  if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

  const openai = new OpenAI({ apiKey });
  const system = `You are an expert B2B sales intelligence analyst. Output ONLY valid JSON.`;
  const prompt = {
    task: "Create a structured company+person brief for a sales call.",
    domain,
    personName,
    role: role || "Unknown",
    notes: notes || "",
    schema: {
      company: { name: "string", industry: "string", size: "string?", website: "string?", summary: "string (2-3 sentences)", recentNews: "string? (1 sentence if found)" },
      person: { name: "string", role: "string", linkedin: "string?", background: "string? (1-2 sentences)", decisionPower: "'decision-maker' | 'influencer' | 'champion' | 'unknown'" },
      signals: "[{ type: 'opportunity'|'risk'|'neutral', text: 'string' }] (2-4 items)",
      landmines: "string[] (1-3 things to avoid in the call)",
      sources: "string[] (where you inferred info from)",
    },
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(prompt) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const result = {
      company: parsed.company || { name: domain, industry: "Unknown", summary: "" },
      person: parsed.person || { name: personName, role: role || "Unknown", decisionPower: "unknown" },
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 6) : [],
      landmines: Array.isArray(parsed.landmines) ? parsed.landmines.map(String).slice(0, 4) : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources.map(String).slice(0, 5) : [],
      generatedAt: new Date().toISOString(),
      cached: false,
    };
    // Cache for 2 hours
    await kv.set(cacheKey, JSON.stringify(result), 7200);
    return c.json(result);
  } catch (error) {
    console.error("Brief generation error:", error);
    return c.json({ error: "Failed to generate brief" }, 500);
  }
});

// POST /ai/call-script — Generate personalized call script from brief
app.post(`${BASE_PATH}/ai/call-script`, async (c) => {
  const userId = getUserId(c);
  const { brief, goal } = await c.req.json();
  if (!brief) return c.json({ error: "brief required" }, 400);

  const cacheKey = `script:${await sha256Hex(`${userId}:${brief?.company?.name || ""}:${brief?.person?.name || ""}:${goal || ""}`.toLowerCase())}`;
  const cached = await kv.get(cacheKey);
  if (cached) {
    try {
      return c.json({ ...JSON.parse(cached), cached: true });
    } catch { /* regenerate */ }
  }

  const apiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
  if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

  const openai = new OpenAI({ apiKey });
  const system = `You are an expert B2B cold call scriptwriter. Output ONLY valid JSON.`;
  const prompt = {
    task: "Create a personalized call script to qualify the lead and book a demo.",
    brief,
    goal: goal || "Book a 20-minute Echo Pulse demo",
    schema: {
      openingVariants: "[{ id: 'o1', text: 'string' }] (2-3 variants)",
      valueProps: "[{ persona: 'string', points: ['string'] }] (2-3 personas)",
      qualification: "[{ question: 'string', why: 'string' }] (3-4 items)",
      objections: "[{ objection: 'string', response: 'string' }] (4-6 items)",
      closeVariants: "[{ id: 'c1', text: 'string' }] (2-3 variants)",
      nextSteps: "string[] (2-3 items)",
    },
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(prompt) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const result = {
      openingVariants: Array.isArray(parsed.openingVariants) ? parsed.openingVariants.slice(0, 4) : [],
      valueProps: Array.isArray(parsed.valueProps) ? parsed.valueProps.slice(0, 4) : [],
      qualification: Array.isArray(parsed.qualification) ? parsed.qualification.slice(0, 6) : [],
      objections: Array.isArray(parsed.objections) ? parsed.objections.slice(0, 8) : [],
      closeVariants: Array.isArray(parsed.closeVariants) ? parsed.closeVariants.slice(0, 4) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String).slice(0, 4) : [],
      generatedAt: new Date().toISOString(),
      cached: false,
    };
    await kv.set(cacheKey, JSON.stringify(result), 7200);
    return c.json(result);
  } catch (error) {
    console.error("Call script generation error:", error);
    return c.json({ error: "Failed to generate call script" }, 500);
  }
});

// POST /ai/live-coach — Real-time coaching tips from captions
app.post(`${BASE_PATH}/ai/live-coach`, async (c) => {
  const { captionsChunk, brief, currentSpinStage } = await c.req.json();
  if (!captionsChunk) return c.json({ error: "captionsChunk required" }, 400);

  const apiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
  if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

  const openai = new OpenAI({ apiKey });
  const system = `You are a real-time B2B sales coach. Analyze the recent conversation and provide 1-3 short, actionable tips. Output ONLY valid JSON.`;
  const prompt = {
    task: "Provide coaching tips based on the conversation so far.",
    recentConversation: captionsChunk.slice(0, 2000),
    context: brief ? { company: brief.company?.name, person: brief.person?.name, role: brief.person?.role } : null,
    currentSpinStage: currentSpinStage || "S",
    schema: {
      tips: "[{ id: 't1', text: 'string (max 80 chars)', priority: 'high'|'medium'|'low' }] (1-3 items)",
      nextSpinQuestion: "{ phase: 'S'|'P'|'I'|'N', question: 'string' } (optional, one question)",
    },
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(prompt) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return c.json({
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3) : [],
      nextSpinQuestion: parsed.nextSpinQuestion || null,
    });
  } catch (error) {
    console.error("Live coach error:", error);
    return c.json({ error: "Live coach failed" }, 500);
  }
});

// 2. Auto-Enrich Organization Data (Smart)
app.patch(`${BASE_PATH}/pipedrive/enrich-org/:id`, async (c) => {
  try {
     const userId = getUserId(c);
     const apiKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
     const orgId = c.req.param('id');
     const body = await c.req.json();
     
     // Accept both old "extracted_crm_data" and new "smart_enrichment" formats
     const data = body.smart_enrichment || body;

     if (!apiKey || !orgId) return c.json({ error: "Missing params" }, 400);

     // 1. Update Standard Fields (Address)
     const updateData: any = {};
     if (data.address_city) updateData.address = data.address_city; // New format
     if (data.address) updateData.address = data.address; // Old format
     
     if (Object.keys(updateData).length > 0) {
         console.log(`✨ Enriching Org ${orgId} Address:`, updateData);
         await fetch(`https://api.pipedrive.com/v1/organizations/${orgId}?api_token=${apiKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
         });
     }

     // 2. Add "Digital Footprint" Note (Website, LinkedIn, Industry)
     // This is safer than guessing Custom Field IDs
     let noteContent = "🕵️ <b>AI Sales Detective Enrichment:</b><br>";
     if (data.verified_company_name) noteContent += `• Legal Name: ${data.verified_company_name}<br>`;
     if (data.industry_vertical) noteContent += `• Industry: ${data.industry_vertical}<br>`;
     if (data.website) noteContent += `• Web: <a href="${data.website}">${data.website}</a><br>`;
     if (data.linkedin_search_url) noteContent += `• LinkedIn Search: <a href="${data.linkedin_search_url}">Verify Person</a><br>`;
     
     if (noteContent.length > 50) { // Only add if we have content
         console.log(`📝 Adding Enrichment Note to Org ${orgId}`);
         await fetch(`https://api.pipedrive.com/v1/notes?api_token=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: orgId,
                content: noteContent
            })
         });
     }
     
     return c.json({ success: true });

  } catch (e) {
      console.error("Enrichment Error", e);
      return c.json({ error: "Enrichment failed" }, 500);
  }
});

// Pipedrive Integration (GET) - Modified to include Org ID
app.get(`${BASE_PATH}/pipedrive/contacts`, async (c) => {
  try {
    const userId = getUserId(c);
    let apiToken = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
    if (!apiToken) return c.json({ error: "No API Key" }, 500);
    apiToken = apiToken.trim();

    // Paginate through ALL Pipedrive persons
    const allPersons: any[] = [];
    let start = 0;
    let hasMore = true;
    while (hasMore) {
      const response = await fetch(
        `https://api.pipedrive.com/v1/persons?limit=500&start=${start}&api_token=${apiToken}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!response.ok) return c.json({ error: "Pipedrive Error" }, 500);
      const data = await response.json();
      if (!data.data || data.data.length === 0) break;
      allPersons.push(...data.data);
      const pagination = data.additional_data?.pagination;
      hasMore = pagination?.more_items_in_collection === true;
      start = pagination?.next_start ?? (start + 500);
      // Safety cap: max 5000 contacts
      if (allPersons.length >= 5000) break;
    }

    if (allPersons.length === 0) return c.json([]);

    const contacts = allPersons.map((p: any) => {
        // Try all phone entries, pick first non-empty value
        const phones = Array.isArray(p.phone) ? p.phone : [];
        const phone = phones.map((ph: any) => ph?.value?.trim()).filter(Boolean)[0] || null;
        const emails = Array.isArray(p.email) ? p.email : [];
        const email = emails.map((em: any) => em?.value?.trim()).filter(Boolean)[0] || null;
        return {
            id: String(p.id),
            name: p.name,
            company: p.org_name || null,
            org_id: p.org_id?.value,
            phone,
            email,
            role: p.job_title || null,
            aiScore: null,
            status: 'active'
        };
    }).filter((c: any) => c.name);

    return c.json(contacts);
  } catch (e) {
    return c.json({ error: "Internal Error" }, 500);
  }
});

// Update a contact dossier field (minimal; used by Lead Brief)
app.patch(`${BASE_PATH}/contacts/:id`, async (c) => {
  const userId = getUserId(c);
  const correlationId = getCorrelationId(c);
  const { admin, error } = requireAdmin(c);
  if (error) return error;

  const contactId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof body?.company_website === "string") {
    updates.company_website = body.company_website.trim() || null;
  }
  if (typeof body?.linkedin_url === "string") {
    updates.linkedin_url = body.linkedin_url.trim() || null;
  }
  if (typeof body?.manual_notes === "string") {
    updates.manual_notes = body.manual_notes.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No supported fields provided (company_website, linkedin_url, manual_notes)" }, 400);
  }

  const { data, error: updateError } = await admin
    .from("contacts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select(CONTACT_SELECT_FIELDS)
    .single();

  if (updateError || !data) {
    return c.json({ error: updateError?.message || "Contact not found" }, updateError ? 500 : 404);
  }

  await auditEvent(admin, userId, correlationId, "export", "contact_updated", {
    contact_id: contactId,
    updated_fields: Object.keys(updates),
  });

  return c.json({ success: true, contact: data });
});

// --- INTEGRATIONS (stored server-side) ---
app.get(`${BASE_PATH}/integrations/pipedrive`, async (c) => {
  const userId = getUserId(c);
  const apiKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
  return c.json({ configured: Boolean(apiKey && apiKey.toString().trim()) });
});

app.get(`${BASE_PATH}/integrations/pipedrive/test`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = ((await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY") || "").toString().trim();
    if (!apiKey) return c.json({ ok: false, error: "not_configured" });

    const res = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      const msg = json?.error || json?.message || "Pipedrive test failed";
      return c.json({ ok: false, error: msg });
    }
    const user = json?.data
      ? { id: json.data.id, name: json.data.name || null, email: json.data.email || null }
      : undefined;
    return c.json({ ok: true, user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ ok: false, error: msg });
  }
});

app.post(`${BASE_PATH}/integrations/pipedrive`, async (c) => {
  try {
    const userId = getUserId(c);
    const { apiKey } = await c.req.json();
    const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!trimmed) return c.json({ error: "API key required" }, 400);

    // Verify before storing.
    const testRes = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${encodeURIComponent(trimmed)}`, {
      headers: { Accept: "application/json" },
    });
    const testJson = await testRes.json().catch(() => null);
    if (!testRes.ok || !testJson?.success) {
      const msg = testJson?.error || testJson?.message || "Invalid Pipedrive API key";
      return c.json({ error: msg }, 401);
    }

    await kv.set(userKey(userId, "integration:pipedrive"), {
      apiKey: trimmed,
      updatedAt: Date.now(),
      verifiedAt: Date.now(),
      verifiedUser: testJson?.data ? { id: testJson.data.id, name: testJson.data.name || null } : null,
    });
    return c.json({ success: true });
  } catch (e) {
    console.error("Failed to save Pipedrive key", e);
    return c.json({ error: "Failed to save integration" }, 500);
  }
});

app.delete(`${BASE_PATH}/integrations/pipedrive`, async (c) => {
  try {
    const userId = getUserId(c);
    await kv.del(userKey(userId, "integration:pipedrive"));
    return c.json({ success: true });
  } catch (e) {
    console.error("Failed to delete Pipedrive key", e);
    return c.json({ error: "Failed to delete integration" }, 500);
  }
});

app.get(`${BASE_PATH}/integrations/openai`, async (c) => {
  const userId = getUserId(c);
  const apiKey = await getOpenAiApiKeyForUser(userId);
  return c.json({ configured: Boolean(apiKey) });
});

app.get(`${BASE_PATH}/integrations/openai/test`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = await getOpenAiApiKeyForUser(userId);
    if (!apiKey) return c.json({ ok: false, error: "not_configured" });
    const meta = await testOpenAiApiKey(apiKey);
    return c.json({ ok: true, ...meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ ok: false, error: msg });
  }
});

app.post(`${BASE_PATH}/integrations/openai`, async (c) => {
  try {
    const userId = getUserId(c);
    const { apiKey } = await c.req.json();
    const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!trimmed) return c.json({ error: "API key required" }, 400);

    const meta = await testOpenAiApiKey(trimmed);
    await kv.set(userKey(userId, "integration:openai"), { apiKey: trimmed, updatedAt: Date.now(), verifiedAt: Date.now() });
    return c.json({ success: true, ...meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 401);
  }
});

app.delete(`${BASE_PATH}/integrations/openai`, async (c) => {
  try {
    const userId = getUserId(c);
    await kv.del(userKey(userId, "integration:openai"));
    return c.json({ success: true });
  } catch (e) {
    console.error("Failed to delete OpenAI key", e);
    return c.json({ error: "Failed to delete integration" }, 500);
  }
});

// --- MEET LIVE TRANSCRIPT BRIDGE ---
// Accepts text chunks from the Meet extension and stores per-call, per-user
app.post(`${BASE_PATH}/meet/transcript`, async (c) => {
  try {
    const userId = getUserId(c);
    const { callId, text, speaker, speakerName, source } = await c.req.json();
    if (!callId || !text) return c.json({ error: "callId and text are required" }, 400);

    const event = {
      id: crypto.randomUUID(),
      text: text.toString(),
      speaker: (speaker || "user").toString(),
      speakerName: speakerName ? speakerName.toString() : null,
      source: source ? source.toString() : "meet_captions",
      ts: Date.now(),
    };

    const key = userKey(userId, `meet:${callId}:events`);
    const existing = (await kv.get(key)) as any[] | null;
    const updated = [...(existing || []), event].slice(-200); // keep last 200

    await kv.set(key, updated);
    await kv.set(userKey(userId, `meet:${callId}:meta`), { callId, userId, updatedAt: event.ts });

    return c.json({ success: true, event });
  } catch (e) {
    console.error("Meet transcript ingest failed", e);
    return c.json({ error: "Failed to ingest transcript" }, 500);
  }
});

// Retrieve recent transcript events
app.get(`${BASE_PATH}/meet/transcript/:callId`, async (c) => {
  try {
    const userId = getUserId(c);
    const callId = c.req.param("callId");
    const sinceParam = c.req.query("since");
    const since = sinceParam ? Number(sinceParam) : null;

    const key = userKey(userId, `meet:${callId}:events`);
    const events = ((await kv.get(key)) as any[] | null) || [];
    const filtered = since ? events.filter((e) => Number(e.ts) > since) : events;

    return c.json({ callId, events: filtered });
  } catch (e) {
    console.error("Meet transcript fetch failed", e);
    return c.json({ error: "Failed to fetch transcript" }, 500);
  }
});

// --- SPIN COACH ORCHESTRATOR (Real-time guidance) ---
const DEFAULT_PROOF_PACK = `
- Time: Reclaim 6–10 hrs/wk per rep via automated logging.
- Pipeline: Lift stage 2→3 by 8–12% via implication tracking.
- Risk: Reduce slip by 10–15% with objection playbooks.
- Experience: Raise buyer scores by 0.3–0.6 via structured discovery.
- Quality: Cut handoff leakage 18% with structured notes.
- Velocity: Shorten cycle 7–12 days via tight CTAs.
`;

const defaultSpinOutput = (stage: string) => ({
  stage: stage || "situation",
  say_next: "(pause)",
  coach_whisper: null,
  confidence: 0,
  why: null,
  risk: null,
  meta: { latency_ms: 0, model: null, mode: null },
});

const clampConfidence = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return 0;
  return Math.min(1, Math.max(0, num));
};

const safeJsonParse = (payload: any, fallback: any) => {
  if (!payload) return fallback;
  if (typeof payload === "object") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    const match = `${payload}`.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
};

const limitString = (text: string, max = 1600) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(text.length - max);
};

const SPIN_AGENT_TEMPLATES = {
  situation: {
    system: `You are the Situation agent. Extract only minimal situational facts (persona, stack, contract timing). Return JSON {"bullets":["",""],"confidence":0-1}. Max 3 bullets, <=20 words each. No advice.`,
  },
  problem: {
    system: `You are the Problem agent. Find 3 pains (2 explicit, 1 latent). Severity 1-3. Return JSON {"pains":[{"text":"","severity":1}],"confidence":0-1}. No fluff.`,
  },
  implication: {
    system: `You are the Implication agent. For each pain produce 1 implication with a metric (time/cost/risk). <=18 words. Return JSON {"implications":[{"pain_idx":0,"text":"","metric":""}],"confidence":0-1}.`,
  },
  payoff: {
    system: `You are the Need-Payoff agent. Map pains to outcomes with metric + proof point. 2 lines max. Return JSON {"payoffs":[{"pain_idx":0,"text":"","metric":""}],"confidence":0-1}.`,
  },
  objection: {
    system: `You are the Objection Sniper. Trigger on price/budget/timing/competition/DIY. Return JSON {"rebuttal":"","redirect_question":"","close_retry":""}. Each <=16 words.`,
  },
};

const buildAgentMessages = (role: keyof typeof SPIN_AGENT_TEMPLATES, payload: any) => {
  const base = SPIN_AGENT_TEMPLATES[role];
  const strict = Boolean(payload.strict);
  const header =
    base.system +
    (strict
      ? `\nSTRICT MODE:\n- Do NOT invent company facts or numbers.\n- Only use what is explicitly in TRANSCRIPT WINDOW.\n- If unsure, output empty arrays and confidence 0.\n`
      : "");
  const user = `
STAGE: ${payload.stage}
TRANSCRIPT WINDOW (latest 10-14 turns, trimmed): 
${payload.transcript}

ROLLING RECAP (120-160 tokens):
${payload.recap || "n/a"}

DEAL STATE (~300 tokens):
${payload.dealState || "{}"}

PROOF PACK (cached):
${payload.proofPack || DEFAULT_PROOF_PACK}
  `;
  return [
    { role: "system", content: header },
    { role: "user", content: user },
  ];
};

const runSpinAgent = async (openai: any, model: string, role: keyof typeof SPIN_AGENT_TEMPLATES, payload: any) => {
  try {
    const messages = buildAgentMessages(role, payload);
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages,
      max_tokens: 180,
    });
    const parsed = safeJsonParse(completion.choices?.[0]?.message?.content, null);
    return parsed || null;
  } catch (e) {
    console.error(`Spin agent ${role} failed`, e);
    return null;
  }
};

const buildOrchestratorMessages = (payload: any) => {
  const { stage, transcript, recap, dealState, proofPack, agents, timers, strict } = payload;
  const schema = `
Return JSON:
{
  "stage": "situation|problem|implication|need_payoff|close",
  "say_next": "string|(pause)",
  "coach_whisper": "string",
  "confidence": 0-1,
  "why": "short link to pain/implication",
  "risk": "short risk chip or ''",
  "meta": { "latency_ms": 0, "tokens_in": 0, "tokens_out": 0 }
}
If confidence <0.35 -> say_next="(pause)" and empty whisper.
`;

  const orchestrator = `
You are the orchestrator for real-time SPIN B2B sales coaching. One high-impact line at a time. No buyer roleplay.
- Keep stage timing: Situation <=4m, Problem 6-8m, Implication 6-8m, Need-Payoff 5-6m, Close 2-3m.
- If Situation facts >=3 or >4m, move to Problem.
- Require >=3 problems before Implication; require >=2 quantified implications before Need-Payoff.
- Close must propose date/time; if objection, call Objection Sniper first, then re-ask slot.
- Speak in business outcomes with metrics; avoid feature talk.
- If unsafe/unknown/low confidence -> (pause).
${strict ? "- STRICT MODE: never invent company facts, tech stack, headcount, numbers, or outcomes. If not in transcript, ask a question instead.\n" : ""}
`;

  const user = `
STAGE: ${stage}
STAGE TIMERS (sec): ${JSON.stringify(timers || {})}

TRANSCRIPT WINDOW:
${transcript}

ROLLING RECAP:
${recap}

DEAL STATE:
${dealState}

PROOF PACK:
${proofPack}

AGENTS:
Situation: ${JSON.stringify(agents.situation)}
Problem: ${JSON.stringify(agents.problem)}
Implication: ${JSON.stringify(agents.implication)}
Need-Payoff: ${JSON.stringify(agents.payoff)}
Objection: ${JSON.stringify(agents.objection || null)}
`;

  return [
    { role: "system", content: orchestrator + schema },
    { role: "user", content: user },
  ];
};

app.post(`${BASE_PATH}/ai/spin/next`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = await getOpenAiApiKeyForUser(userId);
    if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

    const body = await c.req.json();
    const liveModel = Deno.env.get("SPIN_LIVE_MODEL") || "gpt-4o-mini";
    const heavyModel = Deno.env.get("SPIN_HEAVY_MODEL") || "gpt-4.1";
    const mode = body?.mode === "heavy" ? "heavy" : "live";
    const orchestratorModel = mode === "heavy" ? heavyModel : liveModel;

    const stage = (body?.stage || "situation").toLowerCase();
    const transcriptWindow = Array.isArray(body?.transcriptWindow) ? body.transcriptWindow : [];
    const transcript = limitString(transcriptWindow.slice(-14).join("\n"), 4000);
    const recap = limitString(body?.recap || "", 1200);
    const dealState = limitString(
      typeof body?.dealState === "string" ? body.dealState : JSON.stringify(body?.dealState || {}),
      1200,
    );
    const proofPack = limitString(body?.proofPack || DEFAULT_PROOF_PACK, 1200);
    const strict = Boolean(body?.strict);

    const openai = new OpenAI({ apiKey });
    const agentPayload = { transcript, recap, dealState, proofPack, stage, strict };

    const [situation, problem, implication, payoff] = await Promise.all([
      runSpinAgent(openai, liveModel, "situation", agentPayload),
      runSpinAgent(openai, liveModel, "problem", agentPayload),
      runSpinAgent(openai, liveModel, "implication", agentPayload),
      runSpinAgent(openai, liveModel, "payoff", agentPayload),
    ]);

    let objection: any = null;
    if (body?.objectionTrigger) {
      objection = await runSpinAgent(openai, liveModel, "objection", { ...agentPayload, trigger: body.objectionTrigger });
    }

    const messages = buildOrchestratorMessages({
      stage,
      transcript,
      recap,
      dealState,
      proofPack,
      agents: { situation, problem, implication, payoff, objection },
      timers: body?.stageTimers || {},
      strict,
    });

    const started = Date.now();
    const completion = await openai.chat.completions.create({
      model: orchestratorModel,
      response_format: { type: "json_object" },
      messages,
      max_tokens: 220,
    });
    const latency = Date.now() - started;

    let parsed = safeJsonParse(completion.choices?.[0]?.message?.content, defaultSpinOutput(stage));
    if (!parsed || parsed.say_next === undefined) {
      parsed = defaultSpinOutput(stage);
    }
    parsed.confidence = clampConfidence(parsed.confidence ?? 0);
    if (parsed.confidence < 0.35) {
      parsed.say_next = "(pause)";
      parsed.coach_whisper = "";
    }
    parsed.meta = { ...(parsed.meta || {}), latency_ms: latency, model: orchestratorModel, mode };

    return c.json({
      output: parsed,
      agents: { situation, problem, implication, payoff, objection },
      model: orchestratorModel,
      mode,
    });
  } catch (e) {
    console.error("SPIN orchestrator error", e);
    return c.json({ error: "Failed to generate coaching output" }, 500);
  }
});

// --- RECORDING & TRANSCRIPTION ---

// 1. Upload Audio for Transcription (Whisper)
app.post(`${BASE_PATH}/ai/transcribe`, async (c) => {
    try {
        const userId = getUserId(c);
        const apiKey = await getOpenAiApiKeyForUser(userId);
        if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || !(file instanceof File)) {
            return c.json({ error: "No file uploaded" }, 400);
        }

        // Hard cap to limit abuse and unexpected cost.
        const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15MB
        if (file.size > MAX_AUDIO_BYTES) {
            return c.json({ error: "File too large" }, 413);
        }

        console.log(`🎤 Received audio file: ${file.name} (${file.size} bytes)`);

        // OpenAI expects a File object.
        const formData = new FormData();
        formData.append("file", file);
        formData.append("model", "whisper-1");
        formData.append("language", "cs"); // Force Czech

        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Whisper API Error", err);
            return c.json({ error: "Transcription Failed" }, 500);
        }

        const data = await response.json();
        console.log("✅ Transcription success");
        
        return c.json({ text: data.text });

    } catch (e) {
        console.error("Transcription Internal Error", e);
        return c.json({ error: "Internal Transcription Error" }, 500);
    }
});

// --- CONTACT INTEL ENDPOINTS ---
// GET: Retrieve cached AI intelligence for a contact
app.get(`${BASE_PATH}/contact-intel/:id`, async (c) => {
    try {
        const userId = getUserId(c);
        const contactId = c.req.param('id');
        const intel = await kv.get(userKey(userId, `intel:${contactId}`));
        
        if (intel) {
            return c.json(intel);
        }
        return c.json({ message: "No cached data found" }, 404);
    } catch (e) {
        console.error("Failed to retrieve contact intel", e);
        return c.json({ error: "Failed to retrieve intel" }, 500);
    }
});

// PATCH: Save/update AI intelligence for a contact
app.patch(`${BASE_PATH}/contact-intel/:id`, async (c) => {
    try {
        const userId = getUserId(c);
        const contactId = c.req.param('id');
        const body = await c.req.json();
        // body should contain { aiSummary, hiringSignal, intentScore, personalityType, etc. }
        
        // Save to KV - this creates permanent cache that survives app reloads
        await kv.set(userKey(userId, `intel:${contactId}`), { id: contactId, ...body });
        console.log(`💾 Cached AI data for contact ${contactId}`);
        
        return c.json({ success: true });
    } catch (e) {
        console.error("Failed to save contact intel", e);
        return c.json({ error: "Failed to save intel" }, 500);
    }
});

// DELETE: Clear cached AI intelligence for a contact (force re-analysis)
app.delete(`${BASE_PATH}/contact-intel/:id`, async (c) => {
    try {
        const userId = getUserId(c);
        const contactId = c.req.param('id');
        await kv.del(userKey(userId, `intel:${contactId}`));
        console.log(`🗑️ Cleared AI cache for contact ${contactId}`);
        
        return c.json({ success: true, message: "Cache cleared. Contact will be re-analyzed." });
    } catch (e) {
        console.error("Failed to delete contact intel", e);
        return c.json({ error: "Failed to delete intel" }, 500);
    }
});

// OpenAI Integration with Multi-Model Router
app.post(`${BASE_PATH}/ai/generate`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = await getOpenAiApiKeyForUser(userId);
    if (!apiKey) {
      return c.json({ error: "OpenAI not configured" }, 500);
    }

    const body = await c.req.json();
    const { contactName, company, goal, type, contextData, salesStyle, prompt } = body; 
    
    // 1. Fetch Custom Knowledge (Sales Codex)
    let customKnowledge = "";
    try {
        const knowledgeModules = await kv.getByPrefix(userPrefix(userId, "knowledge:"));
        if (knowledgeModules && knowledgeModules.length > 0) {
            customKnowledge = `
            USER'S SALES CODEX (Priority Instructions from uploaded books):
            ${knowledgeModules.map((k: any) => `--- METHODOLOGY: ${k.title} ---\n${k.content}`).join('\n')}
            `;
        }
    } catch (e) {
        console.error("Failed to load knowledge modules", e);
    }

    // 2. Define Style Instructions based on Sales Style
    let styleInstruction = "";
    if (salesStyle === 'hunter') {
        styleInstruction = `
        STYLE: HUNTER / CHALLENGER (CZ: "Dravý obchodník").
        - Be direct, assertive, professional but bold.
        - Focus on ROI, Money, Risk of Inaction.
        - Use short sentences. Don't use "filler words" (jakoby, vlastně).
        - Challenge their current status quo (Excel, annual surveys).
        `;
    } else {
        styleInstruction = `
        STYLE: CONSULTATIVE / ADVISOR (CZ: "Partner/Konzultant").
        - Be empathetic, curious, high emotional intelligence.
        - Focus on "Understanding", "Help", "Team Health".
        - Ask open-ended questions about their daily reality.
        - Use "We" language.
        `;
    }

    let model = "gpt-4o"; 
    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case 'email':
        model = "gpt-4o"; 
        systemPrompt = `You are top-tier B2B Sales Copywriter for the Czech market.
        ${PRODUCT_KNOWLEDGE}
        ${INDUSTRY_KNOWLEDGE}
        ${customKnowledge}
        ${styleInstruction}
        
        RULES FOR CZECH COLD EMAIL:
        1. NO "Marketing Fluff" (Revoluční, Game-changer, Špičkový). Use normal human language.
        2. Subject line must look internal/boring (e.g. "Dotaz k retenci", "Týmy v [Company]").
        3. Structure: Hook (Relevant observation) -> Problem (Pain) -> Solution (Echo) -> Soft CTA (Interest?).
        4. Max 100 words.
        5. OUTPUT MUST BE IN CZECH LANGUAGE.
        `;
        userPrompt = `Write a cold email to ${contactName} from ${company}. 
        Goal: ${goal}.
        Context/Triggers: ${JSON.stringify(contextData || {})}.
        
        If the company is manufacturing, focus on shift stability/turnover cost.
        If IT, focus on burnout/engagement.
        If unknown, focus on "Blind spots in management".
        `;
        break;

      case 'spin-script':
        model = "gpt-4o";
        systemPrompt = `You are a SPIN Selling expert creating a 20-minute consultative call script in Czech.
        ${PRODUCT_KNOWLEDGE}
        ${INDUSTRY_KNOWLEDGE}
        ${customKnowledge}
        ${styleInstruction}

        OUTPUT FORMAT: Valid JSON with this structure:
        {
          "totalDuration": "20 min",
          "blocks": [
            {
              "phase": "situation",
              "title": "Zjištění současného stavu",
              "duration": "5 min",
              "content": "Main talking points...",
              "questions": ["Question 1", "Question 2"],
              "tips": ["Tip 1"],
              "transitions": ["Transition to next phase..."]
            }
          ],
          "closingTechniques": [{"name": "Assumptive close", "script": "..."}],
          "objectionHandlers": [{"objection": "Je to drahé", "response": "..."}]
        }

        4 blocks required: situation, problem, implication, need-payoff.
        ALL TEXT IN CZECH. Natural spoken language.
        `;
        userPrompt = prompt || `Create a full 20-minute SPIN call script for ${contactName || 'the lead'} at ${company || 'their company'}.
        Goal: ${goal || 'Book a demo meeting'}.
        Context: ${JSON.stringify(contextData || {})}`;
        break;

      case 'script':
        model = "gpt-4o";
        systemPrompt = `You are a cold-calling expert creating a script for a Czech B2B rep.
        ${PRODUCT_KNOWLEDGE}
        ${INDUSTRY_KNOWLEDGE}
        ${styleInstruction}
        
        THE "CZECH REALITY" RULES:
        1. Don't be overly fake happy ("Jak se máte?"). It's suspicious in CZ.
        2. Go straight to the point after introduction.
        3. The Hook must be about THEM, not about US.
        4. Use a "Permission to discuss" or "Upfront Contract" approach.
        
        OUTPUT FORMAT:
        - Opener (Strict professional greeting)
        - The Bridge (Why I'm calling specifically YOU)
        - The Problem (Hypothesis of pain)
        - The Ask (Interest check)
        
        LANGUAGE: CZECH. Natural, spoken flow.
        `;
        userPrompt = `Create a 20-second opening script for calling ${contactName} at ${company}. 
        Goal: ${goal}.`;
        break;

      case 'research':
        model = "gpt-4o"; 
        systemPrompt = `You are a "Sales OSINT Detective" for the Czech B2B market.
        
        INPUT DATA:
        - Name: ${contactName}
        - Company (CRM): ${company}
        - Email: ${contextData?.email || "N/A"}
        
        YOUR MISSION:
        1. ANALYZE EMAIL DOMAIN (if available):
           - If email is 'jan@skoda-auto.cz', domain is 'skoda-auto.cz'.
           - Infer REAL Company Name (e.g., "Škoda Auto a.s.").
           - Infer Website (e.g., "https://www.skoda-auto.cz").
           - Infer Likely HQ City based on CZ registry knowledge (e.g., "Mladá Boleslav").
        
        2. PERSON PROFILING:
           - Generate a precise LinkedIn Search URL for this person.
           - Guess their seniority based on title/role.
        
        3. STRATEGIC HYPOTHESIS (The "Why"):
           - Combine Industry + Size + Czech Market Context to guess their Pain Point.
        
        OUTPUT JSON:
        {
            "aiSummary": "1 strategic sentence: What they do & their market position.",
            "hiringSignal": "Inferred Pain Point (e.g. 'Manufacturing = Turnover', 'IT = Burnout').",
            "personalityType": { "type": "Driver/Analytical/Amiable", "advice": "Tactical advice for the call." },
            "intentScore": number (0-100),
            "openingLine": "Hyper-personalized opener referencing their specific industry/situation.",
            "smart_enrichment": {
               "verified_company_name": "Official Legal Name",
               "website": "https://...",
               "address_city": "City/HQ location",
               "linkedin_search_url": "https://www.linkedin.com/search/results/people/?keywords=Name+Company",
               "industry_vertical": "e.g. E-commerce / Automotive"
            }
        }
        
        LANGUAGE: Czech (except JSON keys).
        `;
        userPrompt = `Perform Deep Audit on: ${contactName}, ${company}, Email: ${contextData?.email || "Unknown"}.
        If email domain is generic (gmail/seznam), rely on Company Name.
        If domain is corporate, TRUST THE DOMAIN for enrichment.
        `;
        break;
        
      case 'analysis':
        model = "gpt-4o";
        systemPrompt = `You are a CRM Data Enrichment Bot.
        Extract BANT and key facts from the text.
        LANGUAGE: CZECH (except keys).
        `;
        userPrompt = `Extract BANT (Budget, Authority, Need, Timeline) from: ${JSON.stringify(contextData)}.
        If missing, return empty string.`;
        break;

      case 'battle_card':
        model = "gpt-4o";
        systemPrompt = `You are an expert sales coach whispering advice during a call.
        ${PRODUCT_KNOWLEDGE}
        ${styleInstruction}
        
        ADDRESSING CZECH OBJECTIONS:
        - "Pošlete to do mailu" (Brush off) -> Needs a "Hook" to ensure they actually read it.
        - "Máme na to lidi/HR" (Status Quo) -> Challenge: "Do they have data or just feelings?"
        - "Nejsou peníze" -> Reframe to "Cost of Turnover".
        - "Lidi by to nevyplňovali" (Skepticism) -> "It takes 2 mins via SMS."
        
        Output: Direct, short imperative advice in Czech. Max 2 sentences.
        `;
        userPrompt = `Trigger: ${contextData?.trigger}. Context: ${company}. Give me the best response line.`;
        break;

      case 'live_assist':
        model = "gpt-4o-mini"; 
        systemPrompt = `You are a real-time sales copilot. Analyze the last few seconds of a sales call transcript.
        
        YOUR JOB:
        1. Identify if the prospect raised a specific OBJECTION (price, competitor, no time, "send email", "we have excel").
        2. Identify if the prospect gave a BUYING SIGNAL (asking about price, implementation, specific features).
        3. If NO objection or signal is found, return { "trigger": null }.
        4. If found, return specific advice.
        
        IMPORTANT: Output JSON only. 
        Format: { "trigger": "objection_name" | "signal_name", "advice": "Short command in Czech (max 10 words).", "battleCardKey": "budget" | "competitor" | "timing" | "trust" | "email_brush_off" | null }
        `;
        userPrompt = `Transcript excerpt: "${contextData?.transcript}". Sales Style: ${salesStyle}. Analyze immediately.`;
        break;

      case 'roleplay':
        model = "gpt-4o"; 
        const prospect = contextData?.contact || {};
        const history = contextData?.history || [];
        
        systemPrompt = `You are a Czech B2B Prospect in a realistic roleplay. 
        
        PROSPECT PROFILE:
        Name: ${prospect.name}
        Role: ${prospect.role}
        Company: ${prospect.company}
        
        BEHAVIOR:
        - You are busy, skeptical, and tired of sales calls.
        - You are NOT helpful. The salesperson must EARN your attention.
        - Use typical Czech fillers ("No...", "Jako...", "Hele...").
        - If they pitch generic benefits, say "To už máme" or "Nemám zájem".
        - If they mention a specific pain point relevant to your industry (turnover, burnout), become interested.
        
        LANGUAGE: Czech only. Colloquial is fine.
        `;
        
        userPrompt = `Conversation History:
        ${history.map((h: any) => `${h.speaker === 'me' ? 'Salesperson' : 'Prospect'}: ${h.text}`).join('\n')}
        
        Salesperson just said: "${contextData?.lastUserMessage || '(Silence)'}"
        
        Respond as the Prospect (keep it short):`;
        break;

      case 'call-intelligence':
        model = "gpt-4o";
        systemPrompt = `You are an elite Czech B2B sales intelligence analyst for Echo Pulse by Behavery.
        ${PRODUCT_KNOWLEDGE}
        ${INDUSTRY_KNOWLEDGE}
        ${customKnowledge}
        ${styleInstruction}

        YOUR MISSION: Prepare a COMPLETE call intelligence brief so the salesperson can:
        1. APPROACH the prospect with a hyper-personalized opening
        2. QUALIFY them using BANT + discovery questions
        3. BOOK a 20-minute demo meeting

        You MUST return a valid JSON object with EXACTLY these fields:
        {
          "companyInsight": "2-3 sentence strategic summary of the company — what they do, size estimate, market position, and why Echo Pulse matters to them",
          "painPoints": ["pain point 1 specific to their industry/role", "pain point 2", "pain point 3"],
          "openingLine": "A natural, direct Czech opening line (no fake friendliness). Reference their specific situation. Max 2 sentences. Example: 'Dobrý den, [jméno], volám z Behavery. Vidím, že [firma] je ve výrobě – řešíte teď fluktuaci na směnách?'",
          "qualifyingQuestions": ["SPIN-style discovery question 1 in Czech", "question 2", "question 3", "question 4"],
          "objectionHandlers": [
            {"objection": "Pošlete to mailem", "response": "direct Czech rebuttal"},
            {"objection": "Nemáme rozpočet", "response": "reframe response"},
            {"objection": "Máme vlastní řešení", "response": "challenger response"},
            {"objection": "Nemám čas", "response": "permission-based response"},
            {"objection": "Musím to probrat s vedením", "response": "authority navigation response"}
          ],
          "competitorMentions": ["competitor 1 with positioning note", "competitor 2"],
          "recentNews": "Any relevant industry trend, legislation, or market shift in CZ that creates urgency (e.g., labor law changes, sector growth/decline). If nothing specific, mention a general Czech market trend relevant to the prospect.",
          "decisionMakerTips": "Intel on the person — likely seniority, decision-making power, communication style recommendation, and what motivates their role (KPIs they care about). If title is given, use it. Otherwise guess from context.",
          "bookingScript": "Natural Czech closing script to book a 20-min demo. Must include: value prop summary, specific time suggestion, and a soft close. Example: 'Navrhuji, ať si dáme 20 minut příští týden – ukážu vám, jak to funguje v praxi u podobných firem. Hodí se úterý nebo čtvrtek dopoledne?'"
        }

        CRITICAL RULES:
        - ALL text values MUST be in Czech (except JSON keys)
        - Be SPECIFIC to the company/person/industry — no generic filler
        - Pain points must relate to their actual industry, not generic sales pain
        - Opening line must be natural spoken Czech, no marketing speak
        - Objection handlers must address real Czech B2B objections
        - If you don't have enough info, make educated guesses based on industry + Czech market knowledge
        - qualifyingQuestions should follow SPIN methodology (Situation → Problem → Implication → Need-payoff)
        - ALWAYS return all fields, never null or undefined
        `;
        userPrompt = `Prepare complete call intelligence for:
        - Person: ${contactName || 'Unknown'}
        - Title/Role: ${contextData?.title || 'Unknown'}
        - Company: ${company || 'Unknown'}
        - Industry: ${contextData?.industry || 'Unknown'}
        - Email: ${contextData?.email || 'N/A'}
        - Website: ${contextData?.website || 'N/A'}
        - Notes: ${contextData?.notes || 'None'}
        
        Generate the full JSON intelligence brief.`;
        break;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model, 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: (type === 'research' || type === 'call-intelligence') ? 0.3 : (type === 'spin-script' ? 0.5 : 0.7),
        response_format: (type === 'research' || type === 'spin-script' || type === 'call-intelligence') ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI API error:", err);
      return c.json({ error: "Failed to generate AI content" }, response.status);
    }

    const aiData = await response.json();
    const content = aiData.choices[0]?.message?.content || "";

    // For research, parse the JSON
    if (type === 'research') {
        try {
            return c.json(JSON.parse(content));
        } catch (e) {
            console.error("Failed to parse JSON from AI", content);
            return c.json({ error: "Invalid AI JSON format" }, 500);
        }
    }

    // For call-intelligence, parse JSON and return directly
    if (type === 'call-intelligence') {
        try {
            const parsed = JSON.parse(content);
            // Ensure all required fields exist with fallbacks
            return c.json({
                companyInsight: parsed.companyInsight || '',
                painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
                openingLine: parsed.openingLine || '',
                qualifyingQuestions: Array.isArray(parsed.qualifyingQuestions) ? parsed.qualifyingQuestions : [],
                objectionHandlers: Array.isArray(parsed.objectionHandlers) ? parsed.objectionHandlers : [],
                competitorMentions: Array.isArray(parsed.competitorMentions) ? parsed.competitorMentions : [],
                recentNews: parsed.recentNews || '',
                decisionMakerTips: parsed.decisionMakerTips || '',
                bookingScript: parsed.bookingScript || '',
            });
        } catch (e) {
            console.error("Failed to parse call-intelligence JSON from AI", content);
            return c.json({ error: "AI returned invalid JSON for call intelligence" }, 500);
        }
    }

    // For spin-script, return as { script: ... }
    if (type === 'spin-script') {
        try {
            const parsed = JSON.parse(content);
            return c.json({ script: parsed });
        } catch (e) {
            console.error("Failed to parse SPIN script JSON from AI", content);
            return c.json({ script: null, error: "AI returned invalid JSON for SPIN script" }, 500);
        }
    }

    return c.json({ content });

  } catch (error) {
    console.error("OpenAI integration error:", error);
    return c.json({ error: "Internal AI Error" }, 500);
  }
});

// Text-to-Speech Endpoint
app.post(`${BASE_PATH}/ai/speak`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = await getOpenAiApiKeyForUser(userId);
    if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

    const { text, voice } = await c.req.json();

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voice || "onyx", // onyx is deep and authoritative, good for prospects? Or "alloy" for generic.
      }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("TTS Error", err);
        return c.json({ error: "TTS Failed" }, 500);
    }

    // Proxy the audio stream
    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });

  } catch (e) {
    console.error("TTS Internal Error", e);
    return c.json({ error: "TTS Error" }, 500);
  }
});

// Analyze Call (Post-Mortem)
app.post(`${BASE_PATH}/ai/analyze-call`, async (c) => {
  try {
    const userId = getUserId(c);
    const { transcript, salesStyle, contact } = await c.req.json();
    
    if (!transcript || transcript.length < 2) {
        return c.json({ score: 0, feedback: "Call too short to analyze." });
    }

    const apiKey = await getOpenAiApiKeyForUser(userId);
    if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

    const systemPrompt = `You are a brutal but fair Sales Sales Manager. 
    Your rep just finished a call. Analyze the transcript based on the '${salesStyle}' methodology.
    
    CRITERIA:
    1. Did they build rapport?
    2. Did they uncover pain points?
    3. Did they handle objections effectively?
    4. Did they close/ask for next steps?
    
    IMPORTANT: All feedback (summary, strengths, weaknesses, coachingTip) MUST be in Czech language.

    OUTPUT JSON FORMAT:
    {
      "score": number (0-100),
      "summary": "1 sentence summary",
      "strengths": ["point 1", "point 2"],
      "weaknesses": ["point 1", "point 2"],
      "coachingTip": "One specific thing to do differently next time."
    }`;

    const userPrompt = `
    Contact: ${contact?.name} (${contact?.role})
    Transcript:
    ${transcript.map((t: any) => `${t.speaker}: ${t.text}`).join('\n')}
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);
    
    return c.json(analysis);

  } catch (e) {
    console.error("Analysis Error", e);
    return c.json({ error: "Analysis Failed" }, 500);
  }
});

// --- MENTOR CHAT ENDPOINT ---
app.post(`${BASE_PATH}/mentor-chat`, async (c) => {
  try {
    const { message, history } = await c.req.json();
    const userId = getUserId(c);
    const apiKey = await getOpenAiApiKeyForUser(userId);
    if (!apiKey) return c.json({ error: "OpenAI not configured" }, 500);

    const systemPrompt = `You are the "Navigator" of the Echo Telesales OS.
    Your user is a sales representative with ADHD.
    
    YOUR PERSONA:
    - Name: Echo
    - Tone: Calm, empathetic, highly intelligent, supportive. Think J.A.R.V.I.S. meets a good therapist.
    - Style: Brief but warm. Validating. No "hustle culture" toxicity.
    - Role: Help the user navigate executive dysfunction. If they are tired, suggest a break or a low-energy task. If they are stuck, help them find the smallest first step.
    
    INSTRUCTIONS:
    1. Answer the user's question or react to their statement.
    2. Keep responses short (max 2-3 sentences).
    3. Use formatting (bolding) for key words to help readability.
    4. Speak in Czech language.
    5. Always validate their feeling first ("It makes sense you are tired"), then gently suggest a path forward (not a command).
    `;

    // Convert history to OpenAI format
    const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
        { role: "user", content: message }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
      }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Analyze sentiment of the reply to determine mood
    // Simple heuristic: if it contains specific words, set mood.
    // In a real app, we'd ask LLM to output JSON with mood.
    let mood = 'neutral';
    if (reply.includes('!')) mood = 'happy';
    if (reply.includes('?')) mood = 'concerned';

    return c.json({ reply, mood });

  } catch (e) {
    console.error("Mentor Chat Error", e);
    return c.json({ error: "Mentor is offline" }, 500);
  }
});

// --- KNOWLEDGE BASE ENDPOINTS ---

// Get all knowledge modules
app.get(`${BASE_PATH}/knowledge`, async (c) => {
  try {
    const userId = getUserId(c);
    const modules = await kv.getByPrefix(userPrefix(userId, "knowledge:"));
    return c.json(modules);
  } catch (e) {
    return c.json({ error: "Failed to fetch knowledge" }, 500);
  }
});

// Add/Update knowledge module
app.post(`${BASE_PATH}/knowledge`, async (c) => {
  try {
    const userId = getUserId(c);
    const { title, content, tags } = await c.req.json();
    if (!title || !content) return c.json({ error: "Title and content required" }, 400);

    const id = crypto.randomUUID();
    const module = { id, title, content, tags: tags || [] };
    
    await kv.set(userKey(userId, `knowledge:${id}`), module);
    return c.json({ success: true, module });
  } catch (e) {
    return c.json({ error: "Failed to save module" }, 500);
  }
});

// Delete knowledge module
app.delete(`${BASE_PATH}/knowledge/:id`, async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    await kv.del(userKey(userId, `knowledge:${id}`));
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to delete" }, 500);
  }
});

// Health check
app.get(`${BASE_PATH}/health`, (c) =>
  c.json({ status: "ok", version: FUNCTION_VERSION, time: new Date().toISOString() }),
);

app.get(`${BASE_PATH}/health/db`, async (c) => {
  try {
    // A lightweight DB round-trip via KV table.
    await kv.get("healthcheck");
    return c.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return c.json({ ok: false, error: message });
  }
});

// Get all campaigns
app.get(`${BASE_PATH}/campaigns`, async (c) => {
  try {
    const userId = getUserId(c);
    const campaigns = await kv.getByPrefix(userPrefix(userId, "campaign:"));
    return c.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return c.json({ error: "Failed to fetch campaigns" }, 500);
  }
});

// Create a new campaign
app.post(`${BASE_PATH}/campaigns`, async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const { name, description, contacts } = body;
    
    if (!name) return c.json({ error: "Name is required" }, 400);

    const id = crypto.randomUUID();
    const campaign: Campaign = {
      id,
      name,
      description: description || "",
      contacts: contacts || []
    };

    await kv.set(userKey(userId, `campaign:${id}`), campaign);
    return c.json({ success: true, id });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return c.json({ error: "Failed to create campaign" }, 500);
  }
});

// Delete a campaign
app.delete(`${BASE_PATH}/campaigns/:id`, async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    await kv.del(userKey(userId, `campaign:${id}`));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete campaign" }, 500);
  }
});

// Log a call result
app.post(`${BASE_PATH}/call-logs`, async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const { campaignId, contactId, contactName, companyName, disposition, notes, duration } = body;

    const logId = crypto.randomUUID();
    const log: CallLog = {
      id: logId,
      campaignId,
      contactId,
      contactName,
      companyName,
      disposition,
      notes,
      timestamp: Date.now(),
      duration,
    };

    // Save log (non-blocking for Pipedrive sync)
    try {
      await kv.set(userKey(userId, `log:${logId}`), log);
    } catch (e) {
      console.error("KV log save failed (non-blocking):", e);
    }

    const admin = getAdminClient();

    let resolved: { contactId: string; contact: ResolvedContact } | null = null;
    if (admin && typeof contactId === "string" && contactId.trim()) {
      try {
        resolved = await resolveContactForUser(admin, userId, contactId.trim());
      } catch {
        resolved = null;
      }
    }

    // Save to DB calls table (best-effort)
    if (admin) {
      try {
        const connected = disposition === "connected" || disposition === "meeting";
        const durationSec = typeof duration === "number" ? duration : Number(duration);
        await admin.from("calls").insert({
          contact_id: resolved?.contactId || null,
          status: "completed",
          outcome: typeof disposition === "string" ? disposition : null,
          connected,
          duration_sec: Number.isFinite(durationSec) ? durationSec : null,
          notes: typeof notes === "string" ? notes : null,
        });
      } catch (e) {
        console.error("DB calls insert failed (non-blocking):", e);
      }
    }

    // --- PIPEDRIVE SYNC START ---
    const pipedriveKey = await getPipedriveApiKeyForUser(userId);
    const pipedriveResult: { attempted: boolean; synced: boolean; activity_id?: number; error?: string } = {
      attempted: false,
      synced: false,
    };

    if (pipedriveKey) {
      pipedriveResult.attempted = true;
      try {
        const rawId = typeof contactId === "string" ? contactId.trim() : "";
        let personId: number | null = null;
        let orgId: number | null = null;
        let dealId: number | null = null;

        if (resolved && admin) {
          const pd = await resolvePipedrivePersonAndDeal({ admin, userId, rawContactId: rawId, resolved });
          personId = pd.personId;
          orgId = pd.orgId;
        } else {
          const directPersonId = Number(rawId);
          if (Number.isFinite(directPersonId) && !Number.isNaN(directPersonId)) {
            personId = directPersonId;
          } else {
            const leadMatch = rawId.match(/^(lead:|lead-|lead_)?(\d+)$/i);
            const leadId = leadMatch?.[2] || null;
            if (leadId) {
              const leadJson: any = await pipedriveJson(pipedriveKey, `leads/${encodeURIComponent(leadId)}`);
              const lead = leadJson?.data || {};
              const personIdRaw =
                lead.person_id?.value ??
                lead.person_id ??
                lead.person?.id ??
                lead.person?.value ??
                null;
              const orgIdRaw =
                lead.organization_id?.value ??
                lead.organization_id ??
                lead.org_id?.value ??
                lead.org_id ??
                null;
              const candidate = Number(personIdRaw);
              if (Number.isFinite(candidate) && !Number.isNaN(candidate)) personId = candidate;
              const candidateOrg = orgIdRaw ? Number(orgIdRaw) : null;
              if (candidateOrg !== null && Number.isFinite(candidateOrg) && !Number.isNaN(candidateOrg)) orgId = candidateOrg;
            }
          }
        }

        if (!personId) {
          pipedriveResult.error = "Pipedrive person_id unresolved";
        } else {
          // Link to an open deal if present (best-effort)
          try {
            const dealsJson: any = await pipedriveJson(
              pipedriveKey,
              `persons/${encodeURIComponent(String(personId))}/deals?status=open&limit=1`,
            );
            const deal = dealsJson?.data?.[0] || null;
            const candidateDealId = Number(deal?.id);
            if (Number.isFinite(candidateDealId) && !Number.isNaN(candidateDealId)) dealId = candidateDealId;
            const orgRaw = deal?.org_id?.value ?? deal?.org_id ?? null;
            const candidateOrg = orgRaw ? Number(orgRaw) : null;
            if (!orgId && candidateOrg !== null && Number.isFinite(candidateOrg) && !Number.isNaN(candidateOrg)) orgId = candidateOrg;
          } catch (e) {
            console.error("Pipedrive open-deal lookup failed (non-blocking):", e);
          }

          let subject = `Echo Call: ${disposition}`;
          let type = "call";
          if (disposition === "sent") {
            subject = "Echo Email Sent";
            type = "email";
          }

          const safeNotes = typeof notes === "string" ? notes.trim() : "";
          const aiNote =
            await Promise.race([
              generateCallNoteForPipedrive({
                language: "cs",
                disposition: typeof disposition === "string" ? disposition : "call",
                durationSec: duration,
                notes: safeNotes,
                openaiApiKey: await getOpenAiApiKeyForUser(userId),
                contact: {
                  name: resolved?.contact?.name || contactName || null,
                  title: resolved?.contact?.title || null,
                  company: resolved?.contact?.company || companyName || null,
                },
              }),
              sleep(2500).then(() => null),
            ]);

          const noteText = (aiNote || safeNotes || `Logged via Echo. Disposition: ${disposition}`).toString();
          const htmlNote = formatActivityNoteHtml(noteText);

          const activityBody: any = {
            subject,
            type,
            person_id: personId,
            done: 1,
            duration: toPdDurationHHMM(duration),
            note: htmlNote || noteText,
          };
          if (dealId) activityBody.deal_id = dealId;
          if (orgId) activityBody.org_id = orgId;

          let lastErr: string | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const pdRes = await fetch(`https://api.pipedrive.com/v1/activities?api_token=${pipedriveKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify(activityBody),
            });
            const parsed = await pdRes.json().catch(() => null);
            if (pdRes.ok && parsed?.data?.id) {
              pipedriveResult.synced = true;
              pipedriveResult.activity_id = Number(parsed.data.id);
              lastErr = null;
              break;
            }

            lastErr = parsed?.error || parsed?.message || `HTTP ${pdRes.status}`;
            const retryable = pdRes.status === 429 || pdRes.status >= 500;
            if (!retryable || attempt === 2) break;
            await sleep(350 * (attempt + 1) + Math.floor(Math.random() * 250));
          }

          if (!pipedriveResult.synced && lastErr) {
            pipedriveResult.error = lastErr;
          }
        }
      } catch (pdErr) {
        console.error("Pipedrive Sync Error:", pdErr);
        pipedriveResult.error = pdErr instanceof Error ? pdErr.message : String(pdErr);
      }
    }
    // --- PIPEDRIVE SYNC END ---

    // Verify campaign and update contact status if needed (simplified logic)
    // In a real app, we'd find the campaign and update the specific contact's status inside it
    // For this MVP, we will rely on the frontend to filter 'pending' vs 'called' based on local state or reload.
    
    return c.json({
      success: true,
      logId,
      pipedrive: pipedriveResult.attempted
        ? {
            synced: pipedriveResult.synced,
            activity_id: pipedriveResult.activity_id || null,
            error: pipedriveResult.error || null,
          }
        : { synced: false, activity_id: null, error: "not_configured" },
    });
  } catch (error) {
    console.error("Error logging call:", error);
    return c.json({ error: "Failed to log call" }, 500);
  }
});

// --- ANALYTICS ENDPOINTS ---

app.get(`${BASE_PATH}/analytics`, async (c) => {
  try {
    const userId = getUserId(c);
    // Fetch all logs
    const logs = await kv.getByPrefix(userPrefix(userId, "log:"));
    
    if (!logs || logs.length === 0) {
        return c.json({
            totalCalls: 0,
            connectRate: 0,
            revenue: 0,
            dispositionBreakdown: [],
            dailyVolume: []
        });
    }

    // 1. Calculate KPIs
    const totalCalls = logs.length;
    
    // Calculate Today's Calls
    const today = new Date().toLocaleDateString('en-US');
    const callsToday = logs.filter((l: any) => new Date(l.timestamp).toLocaleDateString('en-US') === today).length;

    const connectedDispositions = new Set(['connected', 'meeting', 'callback', 'not-interested']);
    const connected = logs.filter((l: any) => connectedDispositions.has(l.disposition)).length;
    const sent = logs.filter((l: any) => l.disposition === 'sent').length;
    const connectRate = totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0;
    
    // Estimated revenue based on €500 per connected call
    const revenue = connected * 500; 
    
    // 2. Breakdown
    const breakdownMap: Record<string, number> = {};
    logs.forEach((l: any) => {
        const d = l.disposition || 'unknown';
        breakdownMap[d] = (breakdownMap[d] || 0) + 1;
    });
    const dispositionBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({ name, value }));

    // 3. Daily Volume (Last 7 days)
    const volumeMap: Record<string, number> = {};
    logs.forEach((l: any) => {
        const date = new Date(l.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
        volumeMap[date] = (volumeMap[date] || 0) + 1;
    });
    
    const dailyVolume = Object.entries(volumeMap).map(([time, value]) => ({ time, value }));

    // 4. Recent Activity Feed (Last 5 items)
    const recentActivity = logs
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
        .map((l: any) => {
            const disposition = l.disposition || 'unknown';
            const isConnected = connectedDispositions.has(disposition);
            const labelName = l.contactName || `contact ${l.contactId}`;

            let text = `Attempted contact ${labelName} (${disposition})`;
            if (disposition === 'sent') text = `Email sent to ${labelName}`;
            if (disposition === 'meeting') text = `Meeting booked with ${labelName}`;
            if (disposition === 'callback') text = `Callback scheduled with ${labelName}`;
            if (disposition === 'not-interested') text = `Not interested: ${labelName}`;
            if (disposition === 'connected') text = `Connected with ${labelName}`;

            return {
                id: l.timestamp, // use timestamp as ID
                type: disposition === 'sent' ? 'email' : isConnected ? 'call' : 'alert',
                text,
                time: new Date(l.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                action: 'View'
            };
        });

    return c.json({
        totalCalls,
        callsToday,
        connectRate,
        revenue,
        dispositionBreakdown,
        dailyVolume,
        recentActivity
    });

  } catch (e) {
    console.error("Analytics Error", e);
    return c.json({ error: "Failed to calc analytics" }, 500);
  }
});

// SEED DATA (Disabled for Production)
app.post(`${BASE_PATH}/seed`, async (c) => {
  return c.json({ message: "Seeding disabled. Production mode active." });
});

// Supabase Edge Functions gateway sometimes forwards requests with an extra
// `/<function-slug>` prefix (e.g. "/make-server-139017f8/health"). Mount the app
// under both variants to avoid 404s.
const wrapper = new Hono();
wrapper.route("/", app);
wrapper.route("/make-server-139017f8", app);

Deno.serve(wrapper.fetch);
