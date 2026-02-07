/**
 * Export TL;DV transcripts.
 *
 * Usage:
 *   TLDV_API_KEY=... node scripts/tldv-export-transcripts.mjs
 *   TLDV_API_KEY=... node scripts/tldv-export-transcripts.mjs --max-meetings 200 --out tmp/tldv-export.jsonl
 *
 * Notes:
 * - No secrets are written to disk.
 * - Output is written to tmp/ and ignored by git via .gitignore.
 */

import fs from "node:fs";
import path from "node:path";

const API_BASE = "https://pasta.tldv.io/v1alpha1";

function parseArgs(argv) {
  const args = {
    out: "",
    maxMeetings: 2000,
    pageSize: 100,
    format: "jsonl", // jsonl | json
    includeMissing: false,
    meetingId: "",
    query: "",
    from: "",
    to: "",
    onlyParticipated: null,
    meetingType: "",
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i] || "";
    else if (a === "--max-meetings") args.maxMeetings = Number(argv[++i] || "0") || args.maxMeetings;
    else if (a === "--page-size") args.pageSize = Math.min(200, Math.max(1, Number(argv[++i] || "0") || args.pageSize));
    else if (a === "--format") args.format = (argv[++i] || "jsonl").toLowerCase();
    else if (a === "--include-missing") args.includeMissing = true;
    else if (a === "--meeting-id") args.meetingId = argv[++i] || "";
    else if (a === "--query") args.query = argv[++i] || "";
    else if (a === "--from") args.from = argv[++i] || "";
    else if (a === "--to") args.to = argv[++i] || "";
    else if (a === "--only-participated") args.onlyParticipated = true;
    else if (a === "--meeting-type") args.meetingType = argv[++i] || "";
    else if (a === "--help" || a === "-h") args.help = true;
  }

  return args;
}

function fmtTime(seconds) {
  if (!Number.isFinite(seconds)) return "??:??";
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, apiKey) {
  const res = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
      // Some deployments accept bearer tokens; sending both is harmless for valid keys.
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

async function listMeetingsPage({ apiKey, page, limit }) {
  const url = new URL(`${API_BASE}/meetings`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  return await fetchJson(url.toString(), apiKey);
}

async function getTranscript({ apiKey, meetingId }) {
  const url = `${API_BASE}/meetings/${encodeURIComponent(meetingId)}/transcript`;
  return await fetchJson(url, apiKey);
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let idx = 0;
  let active = 0;

  return await new Promise((resolve) => {
    const next = () => {
      while (active < concurrency && idx < items.length) {
        const i = idx++;
        active++;
        Promise.resolve()
          .then(() => worker(items[i], i))
          .then((r) => results.push({ i, ok: true, r }))
          .catch((e) => results.push({ i, ok: false, e }))
          .finally(() => {
            active--;
            if (idx >= items.length && active === 0) resolve(results);
            else next();
          });
      }
    };
    next();
  });
}

function ensureTmpOut(outPath) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      [
        "Usage:",
        "  TLDV_API_KEY=... node scripts/tldv-export-transcripts.mjs [--out tmp/tldv-export.jsonl]",
        "  TLDV_API_KEY=... node scripts/tldv-export-transcripts.mjs --meeting-id <id>",
        "",
        "Options:",
        "  --out <path>            Output path (.jsonl default)",
        "  --format jsonl|json     Output format (default: jsonl)",
        "  --max-meetings <n>      Max meetings to fetch (default: 2000)",
        "  --page-size <n>         Meetings page size (default: 100)",
        "  --include-missing       Include entries where transcript fetch failed (status + error)",
        "  --meeting-id <id>       Fetch transcript for a single meeting id (skips listing)",
        "  --query <q>             Filter meetings (server-side)",
        "  --from <date>           Filter meetings from date (server-side)",
        "  --to <date>             Filter meetings to date (server-side)",
        "  --only-participated     Filter meetings (server-side)",
        "  --meeting-type internal|external  Filter meetings (server-side)",
      ].join("\n"),
    );
    process.exit(0);
  }

  const apiKey = process.env.TLDV_API_KEY || process.env.TLDV_API_TOKEN || "";
  if (!apiKey) {
    console.error("Missing TLDV_API_KEY. Set it in env and retry.");
    process.exit(1);
  }

  // Single meeting mode
  if (args.meetingId) {
    const meetingId = args.meetingId.trim();
    const outBase = args.out || `tmp/tldv-${meetingId}.json`;
    ensureTmpOut(outBase);
    const transcript = await getTranscript({ apiKey, meetingId });
    fs.writeFileSync(outBase, JSON.stringify({ meetingId, transcript }, null, 2), "utf8");

    const outTxt = outBase.replace(/\.json$/i, ".txt");
    const events = transcript?.data || transcript?.events || [];
    const lines = [];
    lines.push(`=== MEETING ${meetingId} ===`);
    for (const ev of Array.isArray(events) ? events : []) {
      const start = fmtTime(ev?.startTime ?? ev?.start ?? ev?.start_time);
      const speaker = ev?.speakerName || ev?.speaker || "speaker";
      const text = (ev?.content || ev?.text || "").toString().replace(/\s+/g, " ").trim();
      if (!text) continue;
      lines.push(`[${start}] ${speaker}: ${text}`);
    }
    fs.writeFileSync(outTxt, lines.join("\n"), "utf8");

    console.log(`Transcript exported: ${outTxt}`);
    console.log(`JSON: ${outBase}`);
    return;
  }

  const outBase =
    args.out ||
    `tmp/tldv-export-${new Date().toISOString().slice(0, 10)}.${args.format === "json" ? "json" : "jsonl"}`;

  ensureTmpOut(outBase);

  const stream = fs.createWriteStream(outBase, { encoding: "utf8" });

  const meetings = [];
  let page = 1;
  let fetched = 0;
  let done = false;

  // Fetch meeting list paginated.
  while (!done && meetings.length < args.maxMeetings) {
    const url = new URL(`${API_BASE}/meetings`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(args.pageSize));
    if (args.query) url.searchParams.set("query", args.query);
    if (args.from) url.searchParams.set("from", args.from);
    if (args.to) url.searchParams.set("to", args.to);
    if (args.onlyParticipated === true) url.searchParams.set("onlyParticipated", "true");
    if (args.meetingType) url.searchParams.set("meetingType", args.meetingType);

    const res = await fetchJson(url.toString(), apiKey);
    const results = res?.results || res?.meetings || res?.data || [];
    if (!Array.isArray(results) || results.length === 0) break;
    for (const m of results) {
      if (meetings.length >= args.maxMeetings) break;
      meetings.push(m);
    }
    fetched += results.length;
    page += 1;
    const totalPages = res?.pages || res?.totalPages || null;
    if (totalPages && page > totalPages) done = true;
    if (results.length < args.pageSize) done = true;
  }

  const meetingIds = meetings
    .map((m) => m?.id || m?._id || m?.meetingId)
    .filter((x) => typeof x === "string" && x.length > 0);

  const uniq = [];
  const seen = new Set();
  for (const id of meetingIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(id);
  }

  const withTranscript = [];

  const poolRes = await runPool(
    uniq,
    async (meetingId) => {
      // Light rate limiting
      await sleep(80);
      try {
        const transcript = await getTranscript({ apiKey, meetingId });
        return { meetingId, transcript };
      } catch (e) {
        return { meetingId, error: String(e?.message || e), status: e?.status || null, body: e?.body || null };
      }
    },
    3,
  );

  for (const r of poolRes) {
    if (!r.ok) continue;
    const payload = r.r;
    if (payload.transcript) {
      withTranscript.push(payload);
    } else if (args.includeMissing) {
      withTranscript.push(payload);
    }
  }

  if (args.format === "json") {
    stream.write(JSON.stringify(withTranscript, null, 2));
  } else {
    for (const item of withTranscript) {
      stream.write(`${JSON.stringify(item)}\n`);
    }
  }
  stream.end();

  // Also write a human readable text file.
  const outTxt = outBase.replace(/\.(jsonl|json)$/i, ".txt");
  ensureTmpOut(outTxt);
  const lines = [];

  for (const item of withTranscript) {
    lines.push(`=== MEETING ${item.meetingId} ===`);
    if (!item.transcript) {
      lines.push(`(missing transcript) status=${item.status || "?"} error=${item.error || "unknown"}`);
      lines.push("");
      continue;
    }
    const events = item.transcript?.data || item.transcript?.events || [];
    if (!Array.isArray(events) || events.length === 0) {
      lines.push("(empty transcript)");
      lines.push("");
      continue;
    }
    for (const ev of events) {
      const start = fmtTime(ev?.startTime ?? ev?.start ?? ev?.start_time);
      const speaker = ev?.speakerName || ev?.speaker || "speaker";
      const text = (ev?.content || ev?.text || "").toString().replace(/\s+/g, " ").trim();
      if (!text) continue;
      lines.push(`[${start}] ${speaker}: ${text}`);
    }
    lines.push("");
  }

  fs.writeFileSync(outTxt, lines.join("\n"), "utf8");

  console.log(`Meetings scanned: ${uniq.length}`);
  console.log(`Transcripts exported: ${withTranscript.filter((x) => x.transcript).length}`);
  console.log(`JSON: ${outBase}`);
  console.log(`TEXT: ${outTxt}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
