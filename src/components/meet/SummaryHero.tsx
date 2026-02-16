import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { echoApi } from "../../utils/echoApi";
import { isSupabaseConfigured } from "../../utils/supabase/info";
import { computeSequenceIso, formatSequenceWhen } from "../../utils/time";
import { SPIN_PHASES } from "../../features/meetcoach/constants";
import { formatTime } from "../../features/meetcoach/helpers";
import type { Lead, SPINPhase } from "../../features/meetcoach/types";

export interface WrapupAnalysis {
  score?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  coachingTip?: string;
}

interface SummaryHeroProps {
  lead: Lead;
  totalTime: number;
  phaseTimes: Record<SPINPhase, number>;
  onNewDemo: () => void;
  analysis: WrapupAnalysis | null;
  analysisLoading: boolean;
  analysisError: string | null;
  emailDraft: string;
  emailLoading: boolean;
  emailError: string | null;
  emailCopied: boolean;
  onGenerateEmail: () => void;
  onCopyEmail: () => void;
  onEmailDraftChange: (value: string) => void;
  smartBccAddress: string;
  sequenceSendTime: string;
  crmSaving: boolean;
  crmResult: { ok: boolean; message: string } | null;
  onSaveCrm: () => void;
}

type EmailHistoryItem = {
  id?: string | number;
  sent_at?: string | null;
  email_type?: string | null;
  subject?: string | null;
};

type ScheduleRow = {
  email_type?: string;
  status?: string;
};

import { useUserSettingsCtx } from "../../contexts/UserSettingsContext";

export function SummaryHero({
  lead,
  totalTime,
  phaseTimes,
  onNewDemo,
  analysis,
  analysisLoading,
  analysisError,
  emailDraft,
  emailLoading,
  emailError,
  emailCopied,
  onGenerateEmail,
  onCopyEmail,
  onEmailDraftChange,
  smartBccAddress,
  sequenceSendTime,
  crmSaving,
  crmResult,
  onSaveCrm,
}: SummaryHeroProps) {
  const { schedulerUrl: SCHEDULER_URL } = useUserSettingsCtx();
  const [showScheduler, setShowScheduler] = useState(false);
  const [emailLogStatus, setEmailLogStatus] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryItem[]>([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);
  const [sequenceEnabled, setSequenceEnabled] = useState(false);
  const [sequenceBusy, setSequenceBusy] = useState(false);
  const [sequenceMsg, setSequenceMsg] = useState<string | null>(null);
  const sequenceTime =
    (sequenceSendTime || "09:00").toString().trim() || "09:00";
  const sequenceTimeZone = "Europe/Prague";

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!lead?.id) return;
    let cancelled = false;
    setEmailHistoryLoading(true);
    echoApi.email
      .history(lead.id)
      .then((res) => {
        if (cancelled) return;
        setEmailHistory(Array.isArray(res?.emails) ? res.emails : []);
      })
      .catch(() => {
        if (cancelled) return;
        setEmailHistory([]);
      })
      .finally(() => {
        if (cancelled) return;
        setEmailHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!lead?.id) return;
    let cancelled = false;
    echoApi.emailSchedule
      .active({ contactId: lead.id })
      .then((res) => {
        if (cancelled) return;
        const rows = (
          Array.isArray(res?.schedules) ? res.schedules : []
        ) as ScheduleRow[];
        const has = rows.some(
          (row) =>
            String(row?.email_type || "").startsWith("sequence-") &&
            (row?.status === "pending" || row?.status === "draft-created"),
        );
        setSequenceEnabled(has);
      })
      .catch(() => {
        if (cancelled) return;
        setSequenceEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  if (showScheduler) {
    return (
      <div className="mc-scheduler-embed">
        <div className="mc-scheduler-header">
          <h3>📅 Naplánuj follow-up</h3>
          <button
            className="mc-scheduler-close"
            onClick={() => setShowScheduler(false)}
          >
            ✕ Zavřít
          </button>
        </div>
        <iframe
          src={SCHEDULER_URL}
          className="mc-scheduler-iframe"
          title="Pipedrive Scheduler"
          allow="payment"
        />
      </div>
    );
  }

  return (
    <div className="mc-summary">
      <div className="mc-summary-header">
        <span className="mc-summary-icon">✅</span>
        <h2 className="mc-summary-title">Demo dokončeno</h2>
      </div>
      <div className="mc-summary-stats">
        <div className="mc-summary-stat">
          <span className="mc-summary-stat-value">{formatTime(totalTime)}</span>
          <span className="mc-summary-stat-label">Celkový čas</span>
        </div>
        {SPIN_PHASES.map((phase) => (
          <div
            key={phase.id}
            className="mc-summary-stat"
            style={{ "--phase-color": phase.color } as CSSProperties}
          >
            <span className="mc-summary-stat-value">
              {formatTime(phaseTimes[phase.id] || 0)}
            </span>
            <span className="mc-summary-stat-label">
              {phase.icon} {phase.name}
            </span>
          </div>
        ))}
      </div>
      <div className="mc-summary-lead">
        <span className="mc-summary-lead-label">Klient</span>
        <span className="mc-summary-lead-name">{lead.name}</span>
        <span className="mc-summary-lead-company">{lead.company}</span>
      </div>

      <div className="mc-ai-wrapup">
        <div className="mc-ai-wrapup-title">AI hodnocení</div>
        {!isSupabaseConfigured ? (
          <div className="mc-ai-wrapup-note">AI není nakonfigurovaná.</div>
        ) : analysisLoading ? (
          <div className="mc-ai-wrapup-note">⏳ Analyzuji demo…</div>
        ) : analysisError ? (
          <div className="mc-ai-wrapup-error">
            Nepodařilo se analyzovat: {analysisError}
          </div>
        ) : analysis ? (
          <div className="mc-ai-wrapup-grid">
            <div className="mc-ai-score">
              <div className="mc-ai-score-num">
                {Number(analysis.score ?? 0)}
              </div>
              <div className="mc-ai-score-label">/ 100</div>
            </div>
            <div className="mc-ai-wrapup-body">
              {analysis.summary ? (
                <div className="mc-ai-summary">{analysis.summary}</div>
              ) : null}
              {Array.isArray(analysis.strengths) &&
              analysis.strengths.length ? (
                <div className="mc-ai-list">
                  <div className="mc-ai-list-title">Silné stránky</div>
                  <ul>
                    {analysis.strengths.slice(0, 4).map((s, i) => (
                      <li key={`${s}-${i}`}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {Array.isArray(analysis.weaknesses) &&
              analysis.weaknesses.length ? (
                <div className="mc-ai-list">
                  <div className="mc-ai-list-title">Slabiny</div>
                  <ul>
                    {analysis.weaknesses.slice(0, 4).map((s, i) => (
                      <li key={`${s}-${i}`}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {analysis.coachingTip ? (
                <div className="mc-ai-tip">
                  <strong>Tip:</strong> {analysis.coachingTip}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mc-ai-wrapup-note">
            Počkej na titulky a AI udělá shrnutí.
          </div>
        )}

        <div className="mc-ai-email">
          <button
            className="mc-ai-email-btn"
            onClick={onGenerateEmail}
            disabled={!isSupabaseConfigured || emailLoading}
          >
            {emailLoading
              ? "⏳ Generuji follow‑up e‑mail…"
              : "✉️ Vygenerovat follow‑up e‑mail (AI)"}
          </button>
          {emailError ? (
            <div className="mc-ai-wrapup-error">{emailError}</div>
          ) : null}
          {emailDraft ? (
            <div className="mc-ai-email-editor">
              <div className="mc-ai-email-actions">
                <button className="mc-ai-email-copy" onClick={onCopyEmail}>
                  {emailCopied ? "Zkopírováno ✓" : "📋 Kopírovat"}
                </button>
                <button
                  className="mc-ai-email-copy"
                  type="button"
                  onClick={async () => {
                    setEmailLogStatus(null);
                    try {
                      const lines = emailDraft.split("\n");
                      const subjectLine = lines.find((l) =>
                        l.startsWith("Předmět:"),
                      );
                      const subject = subjectLine
                        ? subjectLine.replace("Předmět:", "").trim()
                        : `${lead.company} – follow-up po demo`;
                      const bodyLines = lines.filter(
                        (l) => !l.startsWith("Předmět:"),
                      );
                      const body = bodyLines.join("\n").trim();
                      const res = await echoApi.email.log({
                        contactId: lead.id,
                        contactName: lead.name,
                        company: lead.company,
                        emailType: "demo-followup",
                        subject,
                        body,
                        recipientEmail: lead.email || undefined,
                        source: "manual",
                      });
                      if (!res?.ok) throw new Error(res?.error || "Log selhal");
                      setEmailLogStatus("Označeno jako odeslané ✓");
                      try {
                        const h = await echoApi.email.history(lead.id);
                        setEmailHistory(
                          Array.isArray(h?.emails) ? h.emails : [],
                        );
                      } catch {
                        // ignore
                      }
                    } catch {
                      setEmailLogStatus("Nepodařilo se zalogovat e‑mail");
                    }
                  }}
                >
                  ✅ Označit jako odeslané
                </button>
                {lead.email && (
                  <button
                    className="mc-ai-email-mailto"
                    type="button"
                    onClick={async () => {
                      const lines = emailDraft.split("\n");
                      const subjectLine = lines.find((l) =>
                        l.startsWith("Předmět:"),
                      );
                      const subject = subjectLine
                        ? subjectLine.replace("Předmět:", "").trim()
                        : `${lead.company} – follow-up po demo`;
                      const bodyLines = lines.filter(
                        (l) => !l.startsWith("Předmět:"),
                      );
                      const body = bodyLines.join("\n").trim();
                      const bcc = smartBccAddress || "";
                      const mailtoUrl = `mailto:${encodeURIComponent(lead.email!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${bcc ? `&bcc=${encodeURIComponent(bcc)}` : ""}`;

                      if (isSupabaseConfigured) {
                        try {
                          const status = await echoApi.gmail.getStatus();
                          if (status?.configured) {
                            const res = await echoApi.gmail.createDraft({
                              to: lead.email!,
                              subject,
                              body,
                              bcc: bcc || undefined,
                              log: {
                                contactId: lead.id,
                                contactName: lead.name,
                                company: lead.company,
                                emailType: "demo-followup",
                              },
                            });
                            if (res?.ok && res.gmailUrl) {
                              window.open(
                                res.gmailUrl,
                                "_blank",
                                "noopener,noreferrer",
                              );
                              try {
                                const h = await echoApi.email.history(lead.id);
                                setEmailHistory(
                                  Array.isArray(h?.emails) ? h.emails : [],
                                );
                              } catch {
                                // ignore
                              }
                              return;
                            }
                          }
                        } catch {
                          // Silent fallback to mailto:
                        }
                      }

                      window.open(mailtoUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    📧 Otevřít v e‑mailu
                  </button>
                )}
              </div>
              <textarea
                value={emailDraft}
                onChange={(e) => onEmailDraftChange(e.target.value)}
                rows={8}
              />
              {!lead.email && (
                <div className="mc-ai-email-hint muted">
                  Kontakt nemá e‑mail – zkopíruj text a pošli ručně.
                </div>
              )}
              {smartBccAddress && (
                <div className="mc-ai-email-hint muted">
                  SmartBCC: {smartBccAddress}
                </div>
              )}
              {emailLogStatus ? (
                <div className="mc-ai-email-hint muted">{emailLogStatus}</div>
              ) : null}
              {isSupabaseConfigured && lead?.id ? (
                emailHistoryLoading ? (
                  <div className="mc-ai-email-hint muted">
                    Poslední e‑maily: ⏳ Načítám…
                  </div>
                ) : emailHistory.length ? (
                  <div className="mc-ai-email-hint muted">
                    <div>Poslední e‑maily:</div>
                    <ul style={{ margin: "6px 0 0 16px" }}>
                      {emailHistory.slice(0, 3).map((item) => {
                        const when = item?.sent_at
                          ? new Date(String(item.sent_at)).toLocaleDateString(
                              "cs-CZ",
                            )
                          : "—";
                        const type = String(item?.email_type || "");
                        const typeLabel =
                          type === "cold"
                            ? "cold"
                            : type === "demo-followup"
                              ? "po demo"
                              : type === "sequence-d1"
                                ? "D+1"
                                : type === "sequence-d3"
                                  ? "D+3"
                                  : type;
                        const subject = item?.subject
                          ? String(item.subject)
                          : "—";
                        return (
                          <li
                            key={String(
                              item?.id || `${when}-${type}-${subject}`,
                            )}
                          >
                            {when} · {typeLabel} · {subject}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="mc-ai-email-hint muted">
                    Poslední e‑maily: —
                  </div>
                )
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mc-ai-email" style={{ marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={sequenceEnabled}
              disabled={!isSupabaseConfigured || sequenceBusy}
              onChange={async (e) => {
                const next = e.target.checked;
                setSequenceMsg(null);
                setSequenceBusy(true);
                try {
                  if (!next) {
                    await echoApi.emailSchedule.cancel({ contactId: lead.id });
                    setSequenceEnabled(false);
                    setSequenceMsg("Sekvence zrušena.");
                    return;
                  }

                  if (!emailDraft.trim()) {
                    setSequenceEnabled(false);
                    setSequenceMsg(
                      "Nejdřív vygeneruj follow‑up e‑mail (aby měl AI kontext).",
                    );
                    return;
                  }

                  const lines = emailDraft.split("\n");
                  const subjectLine = lines.find((l) =>
                    l.startsWith("Předmět:"),
                  );
                  const originalSubject = subjectLine
                    ? subjectLine.replace("Předmět:", "").trim()
                    : `${lead.company} – follow-up po demo`;
                  const bodyLines = lines.filter(
                    (l) => !l.startsWith("Předmět:"),
                  );
                  const originalBody = bodyLines.join("\n").trim();

                  const d1 = computeSequenceIso(
                    1,
                    sequenceTime,
                    sequenceTimeZone,
                  );
                  const d3 = computeSequenceIso(
                    3,
                    sequenceTime,
                    sequenceTimeZone,
                  );
                  const baseContext = {
                    sequenceKind: "demo",
                    contactName: lead.name,
                    company: lead.company,
                    recipientEmail: lead.email || "",
                    bcc: smartBccAddress || "",
                    originalEmail: {
                      subject: originalSubject,
                      body: originalBody,
                    },
                  };

                  const res = await echoApi.emailSchedule.create({
                    contactId: lead.id,
                    schedules: [
                      {
                        emailType: "sequence-d1",
                        scheduledFor: d1,
                        context: baseContext,
                      },
                      {
                        emailType: "sequence-d3",
                        scheduledFor: d3,
                        context: baseContext,
                      },
                    ],
                  });
                  if (!res?.ok)
                    throw new Error(
                      res?.error || "Nepodařilo se naplánovat sekvenci",
                    );
                  setSequenceEnabled(true);
                  setSequenceMsg("Sekvence naplánována ✓");
                } catch (err) {
                  setSequenceEnabled(false);
                  setSequenceMsg(
                    err instanceof Error
                      ? err.message
                      : "Nepodařilo se naplánovat sekvenci",
                  );
                } finally {
                  setSequenceBusy(false);
                }
              }}
            />
            <span style={{ fontWeight: 700 }}>
              Naplánovat follow‑up sekvenci
            </span>
          </label>
          <div className="mc-ai-email-hint muted">
            → D+1: krátký bump (
            {formatSequenceWhen(
              computeSequenceIso(1, sequenceTime, sequenceTimeZone),
              sequenceTimeZone,
            )}
            )
          </div>
          <div className="mc-ai-email-hint muted">
            → D+3: finální follow‑up (
            {formatSequenceWhen(
              computeSequenceIso(3, sequenceTime, sequenceTimeZone),
              sequenceTimeZone,
            )}
            )
          </div>
          {sequenceMsg ? (
            <div className="mc-ai-email-hint muted">{sequenceMsg}</div>
          ) : null}
        </div>

        <div className="mc-ai-crm">
          <button
            className="mc-ai-crm-btn"
            onClick={onSaveCrm}
            disabled={!isSupabaseConfigured || crmSaving}
          >
            {crmSaving ? "⏳ Ukládám do CRM…" : "💾 Uložit do CRM (Pipedrive)"}
          </button>
          {crmResult ? (
            <div className={`mc-ai-crm-msg ${crmResult.ok ? "ok" : "err"}`}>
              {crmResult.message}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mc-summary-actions">
        <button
          className="mc-summary-btn primary"
          onClick={() => setShowScheduler(true)}
        >
          📅 Naplánovat follow-up
        </button>
        <button className="mc-summary-btn secondary" onClick={onNewDemo}>
          🔄 Nové demo
        </button>
      </div>
    </div>
  );
}
