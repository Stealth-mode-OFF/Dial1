// Supabase function smoke test for production endpoints.
// Usage:
// SUPABASE_URL=https://<project>.supabase.co \
// SUPABASE_ANON_KEY=<anon> \
// OPENAI_API_KEY=<key> \   # optional to hit /ai/spin/next
// node scripts/health-check.js

const fetch = global.fetch;

// Minimal .env loader (keeps this script dependency-free)
try {
  const fs = require("node:fs");
  if (fs.existsSync(".env")) {
    const raw = fs.readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {
  // ignore
}

const baseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const openaiKey = process.env.OPENAI_API_KEY || "";
const functionName = process.env.SUPABASE_FUNCTION_NAME || "make-server-139017f8";

if (!baseUrl || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set envs and retry.");
  process.exit(1);
}

const fnBase = `${baseUrl}/functions/v1/${functionName}`;

async function check(endpoint, options = {}) {
  const url = `${fnBase}/${endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, options).catch((error) => ({ ok: false, status: 0, error }));
  const body = res?.json ? await res.json().catch(() => null) : res?.error || null;
  return { endpoint: `/${endpoint}`, status: res?.status, ok: res?.ok, body };
}

(async () => {
  const headers = { Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" };
  const results = [];

  results.push(await check("health", { headers }));
  results.push(await check("analytics", { headers }));
  const pipedriveToken = process.env.VITE_PIPEDRIVE_API_TOKEN || "";
  const pipedriveConfigured = pipedriveToken && pipedriveToken !== "your_pipedrive_token_here";
  if (pipedriveConfigured) {
    results.push(await check("pipedrive/contacts", { headers }));
  } else {
    results.push({ endpoint: "/pipedrive/contacts", status: "skipped", ok: false, body: "Pipedrive not configured" });
  }

  if (openaiKey) {
    results.push(
      await check("ai/spin/next", {
        method: "POST",
        headers,
        body: JSON.stringify({
          stage: "problem",
          transcriptWindow: ["User: Hello", "Prospect: We need better tracking."],
          recap: "Prospect wants better tracking.",
          dealState: { pains: ["tracking"], persona: "ops" },
        }),
      }),
    );
  } else {
    results.push({ endpoint: "/ai/spin/next", status: "skipped", ok: false, body: "OPENAI_API_KEY missing" });
  }

  console.table(
    results.map((r) => ({
      endpoint: r.endpoint,
      status: r.status,
      ok: r.ok,
      note: r.body?.error || r.body?.message || (typeof r.body === "string" ? r.body : "ok"),
    })),
  );

  const failing = results.filter((r) => !r.ok && r.status !== "skipped");
  if (failing.length > 0) {
    process.exit(1);
  }
})();
