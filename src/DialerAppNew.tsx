// ═══════════════════════════════════════════════════════════════
// DialerApp — clean orchestrator (refactored)
//
// All state logic extracted to hooks:
//   useDialerSession  → session, navigation, stats
//   useAutoDial       → no-answer countdown
//   usePipedriveCRM   → all CRM writes
//   useBrief          → AI brief generation
//   useBatchBriefs    → batch preloading
//
// Config in features/dialer/config.ts
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";

import { useSales } from "./contexts/SalesContext";
import { isSupabaseConfigured } from "./utils/supabase/info";
import { useBrief } from "./hooks/useBrief";
import { useBatchBriefs } from "./hooks/useBatchBriefs";
import { inferDomainFromEmail, normalizeCompanyDomain } from "./utils/domain";
import { formatTime } from "./features/dialer/helpers";
import { useDialerSession } from "./features/dialer/useDialerSession";
import { useAutoDial } from "./features/dialer/useAutoDial";
import { usePipedriveCRM } from "./features/dialer/usePipedriveCRM";
import { DEFAULT_SMS_TEMPLATE, SCHEDULER_URL } from "./features/dialer/config";
import type { CallOutcome, Contact } from "./features/dialer/types";

import { FloatingWhisper } from "./features/dialer/components/FloatingWhisper";
import { LeadSidebar } from "./features/dialer/components/LeadSidebar";
import { SettingsOverlay } from "./features/dialer/components/SettingsOverlay";
import { CallingPhase } from "./components/dial/CallingPhase";
import { EmptyState } from "./components/dial/EmptyState";
import { ReadyPhase } from "./components/dial/ReadyPhase";
import { WrapupNoAnswerOverlay } from "./components/dial/WrapupNoAnswerOverlay";

// ─── Helpers ───────────────────────────────────────────────────
function mapContacts(
  salesContacts: ReturnType<typeof useSales>["contacts"],
): Contact[] {
  if (!salesContacts?.length) return [];
  return salesContacts.map((c) => ({
    id: c.id,
    name: c.name || "Neznámý",
    company: c.company || "",
    phone: c.phone || "",
    email: c.email || undefined,
    title: c.title,
    status: (c.status as Contact["status"]) || "new",
    priority:
      c.score && c.score > 70
        ? "high"
        : c.score && c.score > 40
          ? "medium"
          : "low",
    orgId: c.orgId ?? undefined,
    website: undefined,
  }));
}

// ─── Component ────────────────────────────────────────────────
export function DialerApp() {
  const {
    contacts: salesContacts,
    isLoading,
    pipedriveConfigured,
    refresh,
  } = useSales();
  const {
    progress: batchProgress,
    preload: batchPreload,
    skip: skipPreload,
    briefsByContactId,
  } = useBatchBriefs();

  const contacts = useMemo(() => mapContacts(salesContacts), [salesContacts]);

  // ─── Session & navigation ───
  const ds = useDialerSession(contacts);
  const {
    session,
    phase,
    setPhase,
    contact,
    activeIndex,
    setActiveIndex,
    nextContact,
  } = ds;

  // ─── Call timing ───
  const [callStart, setCallStart] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [wrapupOutcome, setWrapupOutcome] = useState<CallOutcome | null>(null);

  // ─── Form state ───
  const [notes, setNotes] = useState("");
  const [aiQualAnswers, setAiQualAnswers] = useState<string[]>(["", "", ""]);
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [importing, setImporting] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState(
    () => localStorage.getItem("dial1.smsTemplate") || DEFAULT_SMS_TEMPLATE,
  );

  // ─── CRM ───
  const crm = usePipedriveCRM();

  // ─── Brief / Script ───
  const { brief, generate: generateBrief, clear: clearBrief } = useBrief();
  const [companyDomain, setCompanyDomain] = useState("");

  const externalNavDisabled =
    import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === "true";

  // ─── Auto-dial ───
  const startCall = useCallback(() => {
    if (!contact) return;
    setPhase("calling");
    setCallStart(Date.now());
    ds.setSession((s) => ({
      ...s,
      stats: { ...s.stats, calls: s.stats.calls + 1 },
    }));
    if (!externalNavDisabled) {
      // Open tel: link without navigating away from the app
      const telLink = document.createElement("a");
      telLink.href = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;
      telLink.target = "_blank";
      telLink.rel = "noopener";
      telLink.click();
    }
  }, [contact, externalNavDisabled, ds, setPhase]);

  const nextAndCall = useCallback(() => {
    nextContact();
    setTimeout(() => startCall(), 600);
  }, [nextContact, startCall]);

  const autoDial = useAutoDial(nextAndCall);

  // ─── Call timer ───
  useEffect(() => {
    if (!callStart) return;
    const t = setInterval(
      () => setCallDuration(Math.floor((Date.now() - callStart) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [callStart]);

  // ─── Reset state on contact change ───
  useEffect(() => {
    if (!contact) return;
    setNotes(session.notesByContact[contact.id] || "");
    const fromSession = session.domainByContact?.[contact.id] || "";
    const inferred =
      inferDomainFromEmail(contact.email) ||
      normalizeCompanyDomain(contact.website || "");
    setCompanyDomain(normalizeCompanyDomain(fromSession || inferred));
    clearBrief();
    setAiQualAnswers(["", "", ""]);
    crm.resetResult();
    setShowScheduler(false);
    setWrapupOutcome(null);
    setPhase("ready");
    setCallDuration(0);
    autoDial.reset();
  }, [contact?.id]);

  // ─── Generate brief for current contact ───
  useEffect(() => {
    if (!contact || !companyDomain || !isSupabaseConfigured) return;
    generateBrief(
      {
        domain: companyDomain,
        personName: contact.name,
        role: contact.title || "Neznámá role",
        notes: contact.notes || "",
      },
      false,
    );
  }, [contact?.id, companyDomain]);

  // ─── Batch preload briefs ───
  const lastPreloadCountRef = useRef(0);
  useEffect(() => {
    if (!contacts.length || !isSupabaseConfigured || !batchProgress.done)
      return;
    if (contacts.length === lastPreloadCountRef.current) return;
    lastPreloadCountRef.current = contacts.length;
    batchPreload(contacts);
  }, [contacts, batchProgress.done]);

  // ─── Persist SMS template ───
  useEffect(() => {
    try {
      localStorage.setItem("dial1.smsTemplate", smsTemplate);
    } catch {}
  }, [smsTemplate]);

  // ─── Actions ───
  const handleImport = useCallback(async () => {
    setImporting(true);
    await refresh();
    setImporting(false);
  }, [refresh]);

  /**
   * Record a call outcome in session stats (no CRM write — CallingPhase does that).
   * Called by CallingPhase.onRecordCall before it saves to Pipedrive.
   */
  const recordCallForSession = useCallback(
    (outcome: CallOutcome) => {
      if (!contact) return;
      const dur = callStart ? Math.floor((Date.now() - callStart) / 1000) : 0;
      setWrapupOutcome(outcome);
      ds.recordCall(contact.id, outcome, dur, notes);
      setCallStart(null);
      setCallDuration(dur);
    },
    [callStart, contact, notes, ds],
  );

  const updateQualAnswer = useCallback((index: number, value: string) => {
    setAiQualAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const getSmsUrl = useCallback(() => {
    if (!contact?.phone) return "";
    const phone = contact.phone.replace(/[^\d+]/g, "");
    return phone ? `sms:${phone}?body=${encodeURIComponent(smsTemplate)}` : "";
  }, [contact?.phone, smsTemplate]);

  const sendSms = useCallback(() => {
    const url = getSmsUrl();
    if (!url) return;
    autoDial.pause();
    window.location.href = url;
  }, [getSmsUrl, autoDial]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const inInput = tag === "input" || tag === "textarea";

      if (inInput) {
        if (e.key === "Escape") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
          return;
        }
        // Keyboard shortcuts in calling phase are now handled
        // directly by CallingPhase component's action buttons
        return;
      }

      if (e.key === "c" && phase === "ready") {
        e.preventDefault();
        startCall();
      }
      if (phase === "wrapup" && wrapupOutcome === "no-answer") {
        if (e.key === " ") {
          e.preventDefault();
          autoDial.pause();
        }
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          sendSms();
        }
        if (e.key === "Enter") {
          e.preventDefault();
          autoDial.skipToNext();
        }
      }
      // Connected/meeting wrapup is now handled directly in CallingPhase
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, contacts.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    contacts.length,
    autoDial,
    phase,
    sendSms,
    startCall,
    wrapupOutcome,
    setActiveIndex,
  ]);

  // ─── Derived data ───
  const displayBrief = contact ? briefsByContactId[contact.id] || brief : null;
  const completedCount = Object.keys(session.completedOutcomes).length;

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div
      className="dialer-v2"
      data-testid="dialer-app"
      data-app-phase={phase}
      data-wrapup-outcome={wrapupOutcome || undefined}
    >
      {/* ─── HEADER ─── */}
      <header className="header-v2">
        <div className="header-v2-left">
          <button onClick={() => setShowSettings(true)} className="header-btn">
            ⚙ Nastavení
          </button>
        </div>
        <div className="header-v2-stats">
          <span title="Provoláno dnes">
            {completedCount}/{contacts.length} leadů
          </span>
          <span>{session.stats.calls} hovorů</span>
          <span>{session.stats.connected} spojeno</span>
          <span>{session.stats.meetings} dem</span>
          <span>{formatTime(session.stats.talkTime)}</span>
        </div>
        <div className="header-v2-right">
          <button
            onClick={handleImport}
            disabled={importing || !pipedriveConfigured}
            className="header-btn header-btn-import"
          >
            {importing ? "..." : "↓ Import 30 leadů"}
          </button>
        </div>
      </header>

      {/* ─── PROGRESS TICKS ─── */}
      {contacts.length > 0 && (
        <div className="seq-tick-bar">
          {contacts.map((c, i) => {
            const outcome = session.completedOutcomes[c.id];
            const isCurrent = i === completedCount;
            let cls = "seq-tick";
            if (outcome === "connected" || outcome === "meeting")
              cls += " seq-tick--ok";
            else if (outcome === "no-answer") cls += " seq-tick--skip";
            else if (isCurrent) cls += " seq-tick--active";
            return <span key={c.id} className={cls} />;
          })}
        </div>
      )}

      {/* ─── BATCH PRELOAD OVERLAY ─── */}
      {!batchProgress.done && (
        <div className="seq-preload-overlay">
          <div className="seq-preload-card">
            <h3>⏳ Připravuji AI briefy</h3>
            <p>
              {batchProgress.loaded}/{batchProgress.total} leadů
            </p>
            <div className="seq-preload-track">
              <div
                className="seq-preload-fill"
                style={{
                  width: `${Math.round((batchProgress.loaded / Math.max(1, batchProgress.total)) * 100)}%`,
                }}
              />
            </div>
            <button className="seq-preload-skip" onClick={skipPreload}>
              Přeskočit, volat hned →
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN ─── */}
      <main className="main-v2">
        {isLoading ? (
          <div className="loading">Načítám…</div>
        ) : !contact ? (
          <EmptyState
            importing={importing}
            pipedriveConfigured={pipedriveConfigured}
            onImport={handleImport}
            onShowSettings={() => setShowSettings(true)}
          />
        ) : phase === "ready" ? (
          <ReadyPhase
            contact={contact}
            displayBrief={displayBrief}
            sessionStats={session.stats}
            queuePosition={activeIndex + 1}
            queueTotal={contacts.length}
            completedCount={completedCount}
            onCall={startCall}
            onSkip={nextContact}
          />
        ) : phase === "calling" ? (
          <>
            <CallingPhase
              contact={contact}
              callDuration={callDuration}
              aiQualAnswers={aiQualAnswers}
              notes={notes}
              onAnswerChange={updateQualAnswer}
              onNotesChange={setNotes}
              onLogCallAndNote={crm.logCallAndNote}
              onNextContact={nextContact}
              onRecordCall={recordCallForSession}
              pipedriveConfigured={pipedriveConfigured}
            />{" "}
            <FloatingWhisper />{" "}
          </>
        ) : wrapupOutcome === "no-answer" ? (
          <WrapupNoAnswerOverlay
            contact={contact}
            autoDialCountdown={autoDial.countdown}
            smsUrl={getSmsUrl()}
            onSendSms={sendSms}
            onPauseAutoDial={autoDial.pause}
            onAutoDialNext={autoDial.skipToNext}
          />
        ) : (
          // Connected/meeting wrapup is now handled directly in CallingPhase
          // This fallback just advances to next contact
          <div className="seq-wrapup">
            <div style={{ padding: 32, textAlign: "center" }}>
              Přechod na dalšího leada…
            </div>
          </div>
        )}
      </main>

      {/* ─── LEAD SIDEBAR ─── */}
      {contacts.length > 0 && (
        <LeadSidebar
          contacts={contacts}
          activeIndex={activeIndex}
          completedOutcomes={session.completedOutcomes}
          onSelect={setActiveIndex}
        />
      )}

      {/* ─── SETTINGS OVERLAY ─── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsOverlay
            open={showSettings}
            onClose={() => setShowSettings(false)}
            smsTemplate={smsTemplate}
            onSmsTemplateChange={setSmsTemplate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default DialerApp;
