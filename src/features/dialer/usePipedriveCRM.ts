// ═══════════════════════════════════════════════════════════════
// usePipedriveCRM — all Pipedrive writing in one place
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { echoApi } from "../../utils/echoApi";
import { isSupabaseConfigured } from "../../utils/supabase/info";
import { formatTime, outcomeLabel } from "./helpers";
import type { CallOutcome, Contact } from "./types";
import type { CallLogResult } from "../../utils/echoApi";

export interface CrmResult {
  ok: boolean;
  message: string;
}

/**
 * Resolves Pipedrive person_id for a contact.
 * First tries the fast path (passed from call-log response), then falls back to precall/context.
 */
async function resolvePipedrivePersonId(
  contactId: string,
  hintPersonId?: number | null,
): Promise<number | undefined> {
  // Fast path: use the person_id already resolved by call-logs endpoint
  if (hintPersonId && Number.isFinite(hintPersonId) && hintPersonId > 0) {
    return hintPersonId;
  }
  // Slow fallback: precall/context (only if hint was unavailable)
  try {
    const ctx = await echoApi.precall.context({
      contact_id: contactId,
      include: [],
      ttl_hours: 24,
      timeline: { activities: 0, notes: 0, deals: 0 },
    });
    return ctx?.pipedrive?.person_id ?? undefined;
  } catch {
    return undefined;
  }
}

export function usePipedriveCRM() {
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CrmResult | null>(null);

  const resetResult = useCallback(() => setResult(null), []);

  /**
   * Log a call activity + optional detailed note to Pipedrive.
   * Returns { ok: true/false, message } with detailed feedback.
   */
  const logCallAndNote = useCallback(
    async (
      contact: Contact,
      outcome: CallOutcome,
      duration: number,
      qualAnswers: string[],
      notes: string,
    ): Promise<CrmResult> => {
      if (!isSupabaseConfigured) {
        const r = { ok: false, message: "Supabase není nakonfigurovaný." };
        setResult(r);
        return r;
      }

      setSaving(true);
      setResult(null);

      try {
        // 1) Log call activity
        const logRes = await echoApi.logCall({
          contactId: contact.id,
          contactName: contact.name,
          companyName: contact.company,
          disposition: outcome,
          notes:
            notes ||
            (outcome === "no-answer"
              ? "Nedovoláno"
              : outcome === "meeting"
                ? "Demo domluveno"
                : "Dovoláno"),
          duration,
        });

        const pd = logRes?.pipedrive;

        // Track whether Pipedrive sync actually succeeded
        let activityOk = false;
        let lastMsg = "";

        // Extract person_id/org_id from call-log response for note writing
        const resolvedPersonId = pd?.person_id ?? null;
        const resolvedOrgId = pd?.org_id ?? null;

        if (pd?.synced) {
          activityOk = true;
          lastMsg = `✓ Aktivita #${pd.activity_id || ""} uložena do Pipedrive.`;
          setResult({ ok: true, message: lastMsg });
        } else if (pd?.error === "not_configured") {
          const r = {
            ok: false,
            message: "Pipedrive API klíč není nastaven v Nastavení.",
          };
          setResult(r);
          return r;
        } else if (pd?.error) {
          // Activity failed but we still try to write the note below
          lastMsg = `⚠ Aktivita: ${pd.error}`;
          setResult({ ok: false, message: lastMsg });
        } else {
          lastMsg = "Pipedrive sync selhal — žádná odpověď ze serveru.";
          setResult({ ok: false, message: lastMsg });
        }

        // 2) Add detailed note for connected/meeting calls
        //    ALWAYS attempt note writing — even if activity logging failed
        if (outcome !== "no-answer") {
          const lines: string[] = [
            "<b>📞 Hovor</b>",
            `Klient: <b>${contact.name}</b> (${contact.title || "—"}) – <b>${contact.company}</b>`,
            `Výsledek: <b>${outcomeLabel(outcome)}</b>`,
            `Délka: <b>${formatTime(duration)}</b>`,
          ];

          const qa = qualAnswers
            .filter(Boolean)
            .slice(0, 3)
            .map((a, idx) => `• Q${idx + 1}: ${a}`)
            .join("<br>");
          if (qa) lines.push(`<br><b>Kvalifikace:</b><br>${qa}`);
          if (notes?.trim())
            lines.push(`<br><b>Poznámky:</b><br>${notes.trim()}`);

          const personId = await resolvePipedrivePersonId(
            contact.id,
            resolvedPersonId,
          );
          const effectiveOrgId = contact.orgId || resolvedOrgId || undefined;

          if (personId || effectiveOrgId) {
            try {
              await echoApi.addPipedriveNote({
                personId,
                orgId: effectiveOrgId,
                content: lines.join("<br>"),
              });
              setResult({
                ok: true,
                message: "✓ Aktivita + poznámka uloženy do Pipedrive.",
              });
              lastMsg = "✓ Aktivita + poznámka uloženy do Pipedrive.";
            } catch (noteErr) {
              console.warn(
                "Pipedrive note failed (activity was logged):",
                noteErr,
              );
              // Activity was saved, just note failed — still consider partial success
              setResult({
                ok: true,
                message: "✓ Aktivita uložena, ale poznámka se nepodařila.",
              });
              lastMsg = "✓ Aktivita uložena, ale poznámka se nepodařila.";
            }
          } else {
            console.warn(
              `Kontakt ${contact.id} nemá person_id ani org_id — poznámka přeskočena`,
            );
            const noteSkipMsg = activityOk
              ? "✓ Aktivita uložena (poznámka přeskočena — kontakt nemá Pipedrive ID)."
              : "✗ Aktivita i poznámka selhaly — kontakt nemá Pipedrive ID.";
            setResult({
              ok: activityOk,
              message: noteSkipMsg,
            });
            lastMsg = noteSkipMsg;
          }
        }

        const finalResult: CrmResult = activityOk
          ? { ok: true, message: lastMsg || "✓ Uloženo do Pipedrive." }
          : { ok: false, message: lastMsg || "Pipedrive sync selhal." };
        return finalResult;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Neznámá chyba";
        console.error("logCallAndNote failed:", e);
        const r = {
          ok: false,
          message: `Uložení do Pipedrive selhalo: ${msg}`,
        };
        setResult(r);
        return r;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  /**
   * Fire-and-forget log for no-answer (called automatically on endCall).
   */
  const logCallBackground = useCallback(
    (
      contact: Contact,
      outcome: CallOutcome,
      duration: number,
      notes: string,
    ) => {
      if (!isSupabaseConfigured) return;
      echoApi
        .logCall({
          contactId: contact.id,
          contactName: contact.name,
          companyName: contact.company,
          disposition: outcome,
          notes: notes || (outcome === "no-answer" ? "Nedovoláno" : "Dovoláno"),
          duration,
        })
        .then((res) => {
          const pd = res?.pipedrive;
          if (pd?.synced) {
            setResult({ ok: true, message: "Aktivita uložena do Pipedrive." });
          } else if (pd?.error && pd.error !== "not_configured") {
            setResult({ ok: false, message: `Pipedrive: ${pd.error}` });
          }
        })
        .catch((err) => {
          console.error("Auto-log to Pipedrive failed:", err);
          setResult({
            ok: false,
            message: err?.message || "Pipedrive log selhalo",
          });
        });
    },
    [],
  );

  /**
   * Save a pre-call note to Pipedrive.
   */
  const savePrecallNote = useCallback(
    async (contact: Contact, noteText: string) => {
      if (!isSupabaseConfigured) throw new Error("Backend není připojen");

      const personId = await resolvePipedrivePersonId(contact.id);

      if (!personId && !contact.orgId) {
        throw new Error("Kontakt nemá propojení s Pipedrive");
      }

      await echoApi.addPipedriveNote({
        personId,
        orgId: contact.orgId,
        content: `<b>Poznámka (pre-call):</b><br>${noteText.replace(/\n/g, "<br>")}`,
      });
    },
    [],
  );

  return {
    saving,
    result,
    resetResult,
    logCallAndNote,
    logCallBackground,
    savePrecallNote,
  };
}
