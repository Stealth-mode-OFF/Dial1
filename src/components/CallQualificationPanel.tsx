import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { echoApi } from "../utils/echoApi";

// ============ TYPES ============
export interface CallQualification {
  companySize: string;
  engagementMeasurement: string;
  lateInfo: string;
  decisionMakers: string;
  demoNotes: string;
  qualified: boolean;
  createdAt: Date;
}

interface Props {
  contactName: string;
  companyName: string;
  contactId: string;
  personId?: number;
  orgId?: number;
  visible: boolean;
}

// ============ NOTE GENERATOR ============
export function generatePipedriveNote(
  q: CallQualification,
  contactName: string,
  companyName: string,
): string {
  const lines: string[] = [];

  lines.push("CALL NOTE");
  lines.push("");
  lines.push("🟦 Situation");
  lines.push(
    `• Volal jsem ${companyName}${contactName ? ` / ${contactName}` : ""}.`,
  );
  lines.push(`• Velikost firmy: ${q.companySize || "—"}`);
  lines.push("");
  lines.push("🟧 Problem");
  lines.push("• Zjišťování nálady / engagementu:");
  lines.push(`  ${q.engagementMeasurement || "—"}`);
  lines.push("");
  lines.push("🟥 Implication");
  lines.push(`• Pozdní informace o problémech: ${q.lateInfo || "—"}`);
  lines.push("");
  lines.push("🟩 Need/Payoff");
  lines.push("• —");
  lines.push("");
  lines.push("Další rozhodující osoby:");
  lines.push(q.decisionMakers || "—");
  lines.push("");
  lines.push("Důležité pro demo:");
  lines.push(q.demoNotes || "—");
  lines.push("");
  lines.push(`Kvalifikace: ${q.qualified ? "ANO" : "NE"}`);

  return lines.join("\n");
}

// ============ NOTE PREVIEW MODAL ============
function PipedriveNotePreview({
  noteText,
  onClose,
  onSend,
  sending,
  sent,
  error,
  onEdit,
}: {
  noteText: string;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  sent: boolean;
  error: string | null;
  onEdit: (text: string) => void;
}) {
  return (
    <motion.div
      className="qual-preview-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="qual-preview-modal"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qual-preview-header">
          <span className="qual-preview-badge">📋 Pipedrive Note Preview</span>
          <button className="qual-preview-close" onClick={onClose}>
            ×
          </button>
        </div>

        <textarea
          className="qual-preview-textarea"
          value={noteText}
          onChange={(e) => onEdit(e.target.value)}
          rows={18}
          spellCheck={false}
        />

        {error && <div className="qual-preview-error">{error}</div>}

        <div className="qual-preview-actions">
          <button className="qual-btn qual-btn-ghost" onClick={onClose}>
            Zavřít
          </button>
          {sent ? (
            <span className="qual-sent-badge">✓ Uloženo do Pipedrive</span>
          ) : (
            <button
              className="qual-btn qual-btn-primary"
              onClick={onSend}
              disabled={sending}
            >
              {sending ? "Odesílám…" : "Odeslat do Pipedrive"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ MAIN PANEL — COLD CALL SCRIPT ============
export function CallQualificationPanel({
  contactName,
  companyName,
  contactId,
  personId,
  orgId,
  visible,
}: Props) {
  const [companySize, setCompanySize] = useState("");
  const [engagement, setEngagement] = useState("");
  const [lateInfo, setLateInfo] = useState("");
  const [decisionMakers, setDecisionMakers] = useState("");
  const [demoNotes, setDemoNotes] = useState("");
  const [qualified, setQualified] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const prevContactId = useRef(contactId);

  // Reset when contact changes
  useEffect(() => {
    if (contactId !== prevContactId.current) {
      setCompanySize("");
      setEngagement("");
      setLateInfo("");
      setDecisionMakers("");
      setDemoNotes("");
      setQualified(false);
      setShowPreview(false);
      setSent(false);
      setSendError(null);
      prevContactId.current = contactId;
    }
  }, [contactId]);

  const hasAnyContent =
    companySize.trim() ||
    engagement.trim() ||
    lateInfo.trim() ||
    decisionMakers.trim() ||
    demoNotes.trim();

  // Extract name parts for salutation
  const nameParts = contactName.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const salutation = lastName ? `pane ${lastName}` : contactName;

  const handleSave = useCallback(() => {
    const q: CallQualification = {
      companySize,
      engagementMeasurement: engagement,
      lateInfo,
      decisionMakers,
      demoNotes,
      qualified,
      createdAt: new Date(),
    };
    const text = generatePipedriveNote(q, contactName, companyName);
    setPreviewText(text);
    setShowPreview(true);
    setSent(false);
    setSendError(null);
  }, [
    companySize,
    engagement,
    lateInfo,
    decisionMakers,
    demoNotes,
    qualified,
    contactName,
    companyName,
  ]);

  const handleSend = useCallback(async () => {
    if (!personId && !orgId) {
      setSendError(
        "Kontakt nemá Pipedrive person_id ani org_id — poznámku nelze přiřadit.",
      );
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await echoApi.addPipedriveNote({
        personId: personId ?? undefined,
        orgId: orgId ?? undefined,
        content: previewText,
      });
      setSent(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Nepodařilo se odeslat");
    } finally {
      setSending(false);
    }
  }, [previewText, personId, orgId]);

  if (!visible) return null;

  return (
    <>
      <div className="qual-panel">
        {/* ---- SCRIPT HEADER ---- */}
        <div className="qual-script-badge">📞 Call Script</div>

        {/* ---- OPENING ---- */}
        <div className="qual-script-section">
          <p className="qual-script-line qual-script-line-greeting">
            „Dobrý den, <strong>{salutation}</strong>,
          </p>
          <p className="qual-script-line">
            tady Josef Hofman z <strong>Behavery</strong>.
          </p>
        </div>

        <div className="qual-script-section">
          <p className="qual-script-line qual-script-line-pitch">
            Pomáháme CEO a vedoucím ve firmách podobného typu, aby{" "}
            <strong>
              včas viděli, kde se týmy začínají přetěžovat nebo ztrácet motivaci
            </strong>
            , aniž by museli dělat další HR procesy.
          </p>
        </div>

        <div className="qual-script-transition">Můžu se jen rychle zeptat…</div>

        <div className="qual-script-warnings">
          <span>⚠️ žádná statistika</span>
          <span>⚠️ žádný pitch</span>
          <span>⚠️ jen relevance + otázka</span>
        </div>

        {/* ---- QUESTION 1 ---- */}
        <div className="qual-script-question">
          <div className="qual-script-q-row">
            <span className="qual-script-q-num">1</span>
            <div className="qual-script-q-text">
              <p className="qual-script-q-main">
                Kolik je vás dnes přibližně ve firmě?
              </p>
              <p className="qual-script-q-why">→ relevance: hledáme 50+ lidí</p>
            </div>
          </div>
          <input
            type="text"
            className="qual-script-input"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            placeholder="např. 120 lidí"
            autoComplete="off"
          />
        </div>

        {/* ---- QUESTION 2 ---- */}
        <div className="qual-script-question">
          <div className="qual-script-q-row">
            <span className="qual-script-q-num">2</span>
            <div className="qual-script-q-text">
              <p className="qual-script-q-main">
                Zjišťujete nějak pravidelně náladu nebo spokojenost týmů?
              </p>
              <p className="qual-script-q-why">
                → zjistím jestli to řeší a jak
              </p>
            </div>
          </div>
          <input
            type="text"
            className="qual-script-input"
            value={engagement}
            onChange={(e) => setEngagement(e.target.value)}
            placeholder="Ano / Ne / Částečně + jak?"
            autoComplete="off"
          />
        </div>

        {/* ---- QUESTION 3 ---- */}
        <div className="qual-script-question">
          <div className="qual-script-q-row">
            <span className="qual-script-q-num">3</span>
            <div className="qual-script-q-text">
              <p className="qual-script-q-main">
                Jak často se k vám dostane informace, že je někde problém, až
                pozdě?
              </p>
              <p className="qual-script-q-why">→ bolest = naše příležitost</p>
            </div>
          </div>
          <input
            type="text"
            className="qual-script-input"
            value={lateInfo}
            onChange={(e) => setLateInfo(e.target.value)}
            placeholder="Stává se / Občas / Ne…"
            autoComplete="off"
          />
        </div>

        {/* ---- TRANSITION TO CLOSE ---- */}
        <div className="qual-script-transition qual-script-transition-close">
          Pokud to dává smysl → nabídni 20 min demo ↓
        </div>

        {/* ---- DECISION MAKERS ---- */}
        <div className="qual-script-question qual-script-question-secondary">
          <div className="qual-script-q-row">
            <span className="qual-script-q-icon">👥</span>
            <div className="qual-script-q-text">
              <p className="qual-script-q-main">
                Je potřeba přizvat někoho dalšího k rozhodnutí?
              </p>
            </div>
          </div>
          <input
            type="text"
            className="qual-script-input"
            value={decisionMakers}
            onChange={(e) => setDecisionMakers(e.target.value)}
            placeholder="Kdo konkrétně? (jméno + role)"
            autoComplete="off"
          />
        </div>

        {/* ---- DEMO NOTES ---- */}
        <div className="qual-script-demo">
          <div className="qual-script-q-row">
            <span className="qual-script-q-icon">📝</span>
            <p className="qual-script-q-main">Důležité pro demo</p>
          </div>
          <textarea
            className="qual-script-textarea"
            value={demoNotes}
            onChange={(e) => setDemoNotes(e.target.value)}
            placeholder="Co zmínili, na co navázat při demu…"
            rows={2}
          />
        </div>

        {/* ---- FOOTER ---- */}
        <div className="qual-footer">
          <label className="qual-checkbox-label">
            <input
              type="checkbox"
              checked={qualified}
              onChange={(e) => setQualified(e.target.checked)}
              className="qual-checkbox"
            />
            <span
              className={`qual-checkbox-text ${qualified ? "qual-yes" : ""}`}
            >
              {qualified ? "✓ Kvalifikovaný" : "Kvalifikovaný lead"}
            </span>
          </label>

          <button
            className="qual-btn qual-btn-save"
            onClick={handleSave}
            disabled={!hasAnyContent}
          >
            Uložit do Pipedrive
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
          <PipedriveNotePreview
            noteText={previewText}
            onClose={() => setShowPreview(false)}
            onSend={handleSend}
            sending={sending}
            sent={sent}
            error={sendError}
            onEdit={setPreviewText}
          />
        )}
      </AnimatePresence>
    </>
  );
}
