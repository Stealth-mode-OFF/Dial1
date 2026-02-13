#!/usr/bin/env node
/**
 * enrich-ico.mjs
 * ──────────────
 * Connects to Pipedrive, iterates all deals, extracts email domain from the
 * associated person, scrapes the company website for IČO (Czech business ID),
 * falls back to ARES API search by org name, and writes the IČO to the
 * organization's "IČO" custom field in Pipedrive.
 *
 * Usage:
 *   node scripts/enrich-ico.mjs              # dry-run (default)
 *   node scripts/enrich-ico.mjs --write      # actually update Pipedrive
 *   node scripts/enrich-ico.mjs --write --force  # overwrite existing IČO values
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env parser (no dotenv dependency)
try {
  const envContent = readFileSync(resolve(__dirname, "../.env"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  /* .env not found — rely on env vars */
}

// ─── Config ──────────────────────────────────────────────────────────────────
const API_KEY = process.env.PIPEDRIVE_API_KEY;
if (!API_KEY) {
  console.error("❌ PIPEDRIVE_API_KEY not set in .env");
  process.exit(1);
}
const PD_BASE = "https://api.pipedrive.com/v1";
const ORG_ICO_FIELD = "76678774522658bbb568a4a829f97a133294384d"; // Org → "IČO"
const ORG_CID_FIELD = "3fefa9bee2a67889ddc4e247ec12cb20d729a959"; // Org → "Company ID (ICO)"
const DEAL_CID_FIELD = "e8f41ce53b4a2eba1050b385216bb4db7e789fca"; // Deal → "Company ID (IČO)"
const ARES_SEARCH =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat";

const WRITE_MODE = process.argv.includes("--write");
const FORCE_MODE = process.argv.includes("--force");

// Generic / free email domains to skip
const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.cz",
  "outlook.com",
  "hotmail.com",
  "hotmail.cz",
  "live.com",
  "icloud.com",
  "me.com",
  "seznam.cz",
  "email.cz",
  "centrum.cz",
  "post.cz",
  "volny.cz",
  "atlas.cz",
  "tiscali.cz",
  "quick.cz",
  "wo.cz",
  "iol.cz",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "fastmail.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "gmx.de",
  "msn.com",
  "windowslive.com",
  "mac.com",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pdFetch(path) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${PD_BASE}/${path}${sep}api_token=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive ${path} → ${res.status}`);
  return res.json();
}

async function pdPut(path, body) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${PD_BASE}/${path}${sep}api_token=${API_KEY}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Pipedrive PUT ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

/** Paginate all deals from Pipedrive */
async function getAllDeals() {
  const deals = [];
  let start = 0;
  while (true) {
    const json = await pdFetch(
      `deals?status=all_not_deleted&limit=100&start=${start}`,
    );
    if (json.data) deals.push(...json.data);
    const page = json.additional_data?.pagination;
    if (!page?.more_items_in_collection) break;
    start = page.next_start;
  }
  return deals;
}

/** Extract best email from deal's person_id inline data */
function getEmailFromDeal(deal) {
  const person = deal.person_id;
  if (!person) return null;
  const emails = person.email;
  if (!emails || !Array.isArray(emails)) return null;
  const primary = emails.find((e) => e.primary) || emails[0];
  return primary?.value || null;
}

/** Extract domain from email, skip generic */
function extractDomain(email) {
  if (!email) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase().trim();
  if (GENERIC_DOMAINS.has(domain)) return null;
  return domain;
}

// ─── IČO lookup: Strategy 1 – scrape website ────────────────────────────────
const ICO_REGEX =
  /(?:IČO?|IČO|ICO|I[CČ]O|Identifikační\s+číslo)[:\s]*(\d{6,8})\b/gi;

async function scrapeIcoFromWebsite(domain) {
  const urls = [
    `https://www.${domain}`,
    `https://${domain}`,
    `http://www.${domain}`,
    `http://${domain}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ICO-Enricher/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (!res.ok) continue;

      const html = await res.text();

      // Search the HTML body for IČO patterns
      const matches = [];
      let m;
      while ((m = ICO_REGEX.exec(html)) !== null) {
        const ico = m[1].padStart(8, "0"); // IČO is 8 digits, pad if shorter
        matches.push(ico);
      }
      ICO_REGEX.lastIndex = 0;

      if (matches.length > 0) {
        // Return the most common match (deduplicate)
        const counts = {};
        for (const ico of matches) {
          counts[ico] = (counts[ico] || 0) + 1;
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted[0][0];
      }

      // Also try a broader pattern: look for 8-digit numbers near IČO-like keywords
      const broadRegex = /(?:IČ|ICO|IČO|ičo|Ič|Ic)[^0-9]{0,15}(\d{8})/g;
      while ((m = broadRegex.exec(html)) !== null) {
        return m[1];
      }
    } catch {
      // Timeout, DNS fail, etc. — try next URL variant
      continue;
    }
  }
  return null;
}

// ─── IČO lookup: Strategy 2 – ARES search by org name ───────────────────────
async function searchAresByName(orgName) {
  if (!orgName) return null;

  // Clean the name: remove common suffixes / noise
  let cleaned = orgName
    .replace(/\s*(s\.r\.o\.|a\.s\.|spol\.\s*s\s*r\.\s*o\.)\s*$/i, "")
    .replace(/[,.\-–—]+$/, "")
    .trim();

  if (cleaned.length < 2) return null;

  try {
    const res = await fetch(ARES_SEARCH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obchodniJmeno: cleaned, start: 0, pocet: 3 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const subjects = data.ekonomickeSubjekty;
    if (!subjects || subjects.length === 0) return null;

    // Try exact-ish match first
    for (const s of subjects) {
      if (!s.ico) continue; // skip entries without IČO (e.g. branch offices)
      const name = (s.obchodniJmeno || "").toLowerCase();
      if (
        name.includes(cleaned.toLowerCase()) ||
        cleaned
          .toLowerCase()
          .includes(name.replace(/\s*(s\.r\.o\.|a\.s\.).*$/i, "").trim())
      ) {
        return String(s.ico).padStart(8, "0");
      }
    }
    // Fallback: first result that has IČO
    const withIco = subjects.find((s) => s.ico);
    if (!withIco) return null;
    return String(withIco.ico).padStart(8, "0");
  } catch {
    return null;
  }
}

// ─── IČO lookup: Strategy 3 – ARES search by domain as name ─────────────────
async function searchAresByDomain(domain) {
  // Try using domain without TLD as company name search
  const baseName = domain
    .replace(/\.(cz|sk|com|eu|net|org|info|biz|co)$/i, "")
    .replace(/[._-]/g, " ")
    .trim();
  if (baseName.length < 2) return null;
  return searchAresByName(baseName);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("  IČO Enrichment Script for Pipedrive");
  console.log(
    `  Mode: ${WRITE_MODE ? "✏️  WRITE" : "👁️  DRY-RUN"}${FORCE_MODE ? " (force overwrite)" : ""}`,
  );
  console.log(
    "═══════════════════════════════════════════════════════════════\n",
  );

  // 1. Fetch all deals
  console.log("📥 Fetching all deals from Pipedrive...");
  const deals = await getAllDeals();
  console.log(`   Found ${deals.length} deals\n`);

  // 2. Deduplicate by org — collect emails + track deal IDs per org
  const orgMap = new Map(); // orgId → { orgName, email, domain, dealTitle, dealIds[] }
  let skippedNoPerson = 0;
  let skippedNoEmail = 0;
  let skippedGeneric = 0;
  let skippedNoOrg = 0;

  for (const deal of deals) {
    const orgData = deal.org_id;
    if (!orgData) {
      skippedNoOrg++;
      continue;
    }
    const orgId = typeof orgData === "object" ? orgData.value : orgData;

    // Always track the deal ID for this org
    if (orgMap.has(orgId)) {
      orgMap.get(orgId).dealIds.push(deal.id);
      continue;
    }

    const email = getEmailFromDeal(deal);
    if (!email && !deal.person_id) {
      skippedNoPerson++;
      continue;
    }
    if (!email) {
      skippedNoEmail++;
      continue;
    }

    const domain = extractDomain(email);
    if (!domain) {
      skippedGeneric++;
      continue;
    }

    const orgName = typeof orgData === "object" ? orgData.name : null;
    orgMap.set(orgId, {
      orgId,
      orgName,
      email,
      domain,
      dealTitle: deal.title,
      dealIds: [deal.id],
    });
  }

  console.log(`📊 Unique organizations to process: ${orgMap.size}`);
  console.log(
    `   Skipped: ${skippedNoOrg} no-org, ${skippedNoPerson} no-person, ${skippedNoEmail} no-email, ${skippedGeneric} generic-email\n`,
  );

  // 3. Check existing IČO values (skip orgs that already have one, unless --force)
  const toProcess = [];
  for (const [orgId, info] of orgMap) {
    try {
      const orgJson = await pdFetch(`organizations/${orgId}`);
      const existingIco = orgJson.data?.[ORG_ICO_FIELD];
      if (existingIco && !FORCE_MODE) {
        console.log(
          `   ⏭️  ${info.orgName || orgId} already has IČO: ${existingIco}`,
        );
        continue;
      }
      info.existingIco = existingIco || null;
      toProcess.push(info);
    } catch (e) {
      console.log(`   ⚠️  Failed to fetch org ${orgId}: ${e.message}`);
    }
    await sleep(200); // rate limiting
  }

  console.log(`\n🔍 Organizations to enrich: ${toProcess.length}\n`);

  // 4. For each org: scrape website → fallback ARES by name → fallback ARES by domain
  const results = { updated: 0, notFound: 0, errors: 0 };

  for (const info of toProcess) {
    const { orgId, orgName, domain, email, dealTitle } = info;
    console.log(
      `── Org: ${orgName || orgId} | Email: ${email} | Domain: ${domain}`,
    );

    let ico = null;

    // Strategy 1: Scrape website
    console.log(`   🌐 Scraping https://${domain} ...`);
    ico = await scrapeIcoFromWebsite(domain);
    if (ico) {
      console.log(`   ✅ Found IČO from website: ${ico}`);
    }

    // Strategy 2: ARES by org name
    if (!ico && orgName) {
      console.log(`   📚 Searching ARES by name: "${orgName}" ...`);
      ico = await searchAresByName(orgName);
      if (ico) {
        console.log(`   ✅ Found IČO from ARES (by name): ${ico}`);
      }
      await sleep(500);
    }

    // Strategy 3: ARES by domain base name
    if (!ico) {
      console.log(`   📚 Searching ARES by domain: "${domain}" ...`);
      ico = await searchAresByDomain(domain);
      if (ico) {
        console.log(`   ✅ Found IČO from ARES (by domain): ${ico}`);
      }
      await sleep(500);
    }

    if (!ico) {
      console.log(`   ❌ Could not find IČO`);
      results.notFound++;
      continue;
    }

    // 5. Write to Pipedrive — org (both IČO fields) + all associated deals
    if (WRITE_MODE) {
      try {
        // Update org: both IČO and Company ID (ICO)
        await pdPut(`organizations/${orgId}`, {
          [ORG_ICO_FIELD]: ico,
          [ORG_CID_FIELD]: ico,
        });
        console.log(`   💾 Updated org ${orgId} IČO → ${ico}`);

        // Update every deal linked to this org
        for (const dealId of info.dealIds) {
          try {
            await pdPut(`deals/${dealId}`, { [DEAL_CID_FIELD]: ico });
            console.log(
              `   💾 Updated deal ${dealId} Company ID (IČO) → ${ico}`,
            );
          } catch (de) {
            console.log(
              `   ⚠️  Failed to update deal ${dealId}: ${de.message}`,
            );
          }
          await sleep(200);
        }
        results.updated++;
      } catch (e) {
        console.log(`   ❌ Failed to update org: ${e.message}`);
        results.errors++;
      }
      await sleep(300);
    } else {
      console.log(
        `   🔸 DRY-RUN: would set IČO = ${ico} on org ${orgId} + ${info.dealIds.length} deal(s)`,
      );
      results.updated++;
    }
  }

  // Summary
  console.log(
    "\n═══════════════════════════════════════════════════════════════",
  );
  console.log("  Summary");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log(`  Total deals:      ${deals.length}`);
  console.log(`  Unique orgs:      ${orgMap.size}`);
  console.log(`  Processed:        ${toProcess.length}`);
  console.log(`  IČO found/set:    ${results.updated}`);
  console.log(`  Not found:        ${results.notFound}`);
  console.log(`  Errors:           ${results.errors}`);
  if (!WRITE_MODE) {
    console.log(
      "\n  ⚠️  This was a DRY RUN. Use --write to actually update Pipedrive.",
    );
  }
}

main().catch((e) => {
  console.error("💥 Fatal:", e);
  process.exit(1);
});
