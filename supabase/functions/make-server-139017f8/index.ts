import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import OpenAI from "npm:openai";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

const allowedOrigins = (Deno.env.get("ECHO_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Enable CORS
app.use(
  "/*",
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Echo-User"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Supabase mounts this function at /functions/v1/make-server-139017f8
// so internal routes should be root-relative (no extra prefix).
const FUNCTION_NAME = Deno.env.get("SUPABASE_FUNCTION_NAME") || "make-server-139017f8";
const BASE_PATH = FUNCTION_NAME ? `/${FUNCTION_NAME}` : "";

const DEFAULT_USER_ID = Deno.env.get("ECHO_DEFAULT_USER_ID") || "owner";
const REQUIRE_AUTH = Deno.env.get("ECHO_REQUIRE_AUTH") === "true";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

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
  const headerUser = c.req.header("x-echo-user");
  if (headerUser) return headerUser.trim();

  const authHeader = c.req.header("Authorization") || null;
  const authUserId = await getAuthUserId(authHeader);
  if (authUserId) return authUserId;

  if (!REQUIRE_AUTH) return DEFAULT_USER_ID;
  return null;
};

const getUserId = (c: any) => c.get("userId") as string;

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

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  if (c.req.path.endsWith("/health")) return next();

  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  c.set("userId", userId);
  await next();
});

// --- INTEGRATIONS: PIPEDRIVE ---
app.get(`${BASE_PATH}/integrations/pipedrive`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
    return c.json({ configured: Boolean(apiKey) });
  } catch (e) {
    console.error("GET /integrations/pipedrive error:", e);
    return c.json({ configured: false, error: String(e) }, 200);
  }
});

app.post(`${BASE_PATH}/integrations/pipedrive`, async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const apiKey = body?.apiKey?.toString().trim();
    if (!apiKey) return c.json({ error: "Missing apiKey" }, 400);

    // Test Pipedrive API key validity
    console.log("🔐 Testing Pipedrive API key...");
    const testRes = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`);
    const testData = await testRes.json();
    
    if (!testData.success) {
      console.error("❌ Pipedrive API test failed:", testData);
      return c.json({ error: "Invalid Pipedrive API key", details: testData }, 401);
    }

    console.log("✅ Pipedrive API key is valid, storing...");
    await kv.set(userKey(userId, "integration:pipedrive"), { apiKey });
    return c.json({ ok: true, user: testData.data });
  } catch (e) {
    console.error("POST /integrations/pipedrive error:", e);
    return c.json({ error: String(e), type: e instanceof Error ? e.constructor.name : typeof e }, 500);
  }
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

// --- PIPEDRIVE CONTACTS & ENRICHMENT ---
app.get(`${BASE_PATH}/pipedrive/contacts`, async (c) => {
  const userId = getUserId(c);
  const apiKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
  if (!apiKey) return c.json({ error: "No Pipedrive API key" }, 401);

  try {
    // Fetch leads instead of persons
    const res = await fetch(`https://api.pipedrive.com/v1/leads?limit=50&api_token=${apiKey}`);
    if (!res.ok) return c.json({ error: "Pipedrive API error" }, res.status);
    const data = await res.json();
    
    // Transform leads to match expected contact format
    const leads = (data.data || []).map((lead: any) => ({
      id: lead.id,
      name: lead.title || lead.person_name || null, // TODO: connect to live Pipedrive person data
      phone: lead.person?.phone?.[0]?.value || lead.phone || null,
      email: lead.person?.email?.[0]?.value || lead.email || null,
      organization: lead.organization_name || null, // TODO: connect to live org enrichment
      label: lead.label_ids?.[0] || lead.label || null,
      value: lead.value?.amount || 0,
      currency: lead.value?.currency || 'CZK',
      source: 'pipedrive_lead'
    }));
    
    return c.json(leads);
  } catch (e) {
    console.error("Pipedrive fetch failed:", e);
    return c.json({ error: "Pipedrive API error" }, 500);
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
  const { companyName, industry, personTitle } = await c.req.json();
  
  const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
  });

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

    const response = await fetch(`https://api.pipedrive.com/v1/persons?limit=50&api_token=${apiToken}`, {
        headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return c.json({ error: "Pipedrive Error" }, 500);
    const data = await response.json();
    if (!data.data) return c.json([]);

    const contacts = data.data.map((p: any) => {
        return {
            id: String(p.id),
            name: p.name,
            company: p.org_name || null, // TODO: connect to live org enrichment
            org_id: p.org_id?.value,
            phone: p.phone?.[0]?.value || null,
            role: p.active_flag ? "Contact" : null, // Use Pipedrive active_flag
            aiScore: null, // TODO: connect to AI scoring service
            status: 'active'
        };
    }).filter((c: any) => c.name);

    return c.json(contacts);
  } catch (e) {
    return c.json({ error: "Internal Error" }, 500);
  }
});

// Per-user Pipedrive integration settings (stored server-side)
app.get(`${BASE_PATH}/integrations/pipedrive`, async (c) => {
  const userId = getUserId(c);
  const apiKey = await getPipedriveKey(userId);
  return c.json({ configured: Boolean(apiKey) });
});

app.post(`${BASE_PATH}/integrations/pipedrive`, async (c) => {
  try {
    const userId = getUserId(c);
    const { apiKey } = await c.req.json();
    if (!apiKey || typeof apiKey !== "string") {
      return c.json({ error: "API key required" }, 400);
    }
    await kv.set(userKey(userId, "integration:pipedrive"), {
      apiKey: apiKey.trim(),
      updatedAt: Date.now(),
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
  const header = base.system;
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
  const { stage, transcript, recap, dealState, proofPack, agents, timers } = payload;
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
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 500);

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

    const openai = new OpenAI({ apiKey });
    const agentPayload = { transcript, recap, dealState, proofPack, stage };

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
        const apiKey = Deno.env.get("OPENAI_API_KEY");
        if (!apiKey) return c.json({ error: "No API Key" }, 500);

        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || !(file instanceof File)) {
            return c.json({ error: "No file uploaded" }, 400);
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

// OpenAI Integration with Multi-Model Router
app.post(`${BASE_PATH}/ai/generate`, async (c) => {
  try {
    const userId = getUserId(c);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
    }

    const body = await c.req.json();
    const { contactName, company, goal, type, contextData, salesStyle } = body; 
    
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
        temperature: type === 'research' ? 0.3 : 0.7, // Lower temp for data/research
        response_format: type === 'research' ? { type: "json_object" } : undefined
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

    return c.json({ content });

  } catch (error) {
    console.error("OpenAI integration error:", error);
    return c.json({ error: "Internal AI Error" }, 500);
  }
});

// Text-to-Speech Endpoint
app.post(`${BASE_PATH}/ai/speak`, async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return c.json({ error: "No API Key" }, 500);

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
    const { transcript, salesStyle, contact } = await c.req.json();
    
    if (!transcript || transcript.length < 2) {
        return c.json({ score: 0, feedback: "Call too short to analyze." });
    }

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
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
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
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) return c.json({ error: "No API Key" }, 500);

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
app.get(`${BASE_PATH}/health`, (c) => c.json({ status: "ok" }));

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

    // Save log
    await kv.set(userKey(userId, `log:${logId}`), log);

    // --- PIPEDRIVE SYNC START ---
    // If this contact is from Pipedrive (we can check if ID is numeric, or if campaign is 'live-pipedrive')
    // Ideally, we should pass a flag or check the campaign ID. 
    // For this MVP, we'll try to sync if the ID looks like a Pipedrive ID (numeric) and we have an API key.
    
    const pipedriveKey = (await getPipedriveKey(userId)) || Deno.env.get("PIPEDRIVE_API_KEY");
    if (pipedriveKey && !isNaN(Number(contactId))) {
        try {
            let subject = `Echo Call: ${disposition}`;
            let type = 'call';
            
            if (disposition === 'sent') {
                subject = `Echo Email Sent`;
                type = 'email';
            }

            const activityBody = {
                subject: subject,
                type: type,
                person_id: Number(contactId),
                done: 1, // Mark as done immediately
                duration: typeof duration === "number" ? duration : 0,
                note: notes || `Logged via Echo Telesales OS. Disposition: ${disposition}`
            };

            const pdRes = await fetch(`https://api.pipedrive.com/v1/activities?api_token=${pipedriveKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activityBody)
            });
            
            if (!pdRes.ok) {
                console.error("Failed to sync to Pipedrive:", await pdRes.text());
            } else {
                console.log("Synced activity to Pipedrive:", await pdRes.json());
            }
        } catch (pdErr) {
            console.error("Pipedrive Sync Error:", pdErr);
        }
    }
    // --- PIPEDRIVE SYNC END ---

    // Verify campaign and update contact status if needed (simplified logic)
    // In a real app, we'd find the campaign and update the specific contact's status inside it
    // For this MVP, we will rely on the frontend to filter 'pending' vs 'called' based on local state or reload.
    
    return c.json({ success: true, logId });
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

Deno.serve(app.fetch);
