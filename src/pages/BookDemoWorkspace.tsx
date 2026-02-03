import React, { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi, type ApprovedFact, type EvidenceClaim } from '../utils/echoApi';

type Hypothesis = {
  hypothesis_id: string;
  hypothesis: string;
  based_on_evidence_ids: string[];
  how_to_verify: string;
  priority: 'high' | 'medium' | 'low';
};

type PackLine = {
  id: string;
  text: string;
  evidence_ids: string[];
  hypothesis_ids: string[];
};

type MeetingPack = {
  opener_variants: PackLine[];
  discovery_questions: PackLine[];
  objections: Array<{ id: string; trigger: string; response: string; evidence_ids: string[]; hypothesis_ids: string[] }>;
  meeting_asks: PackLine[];
  agenda: PackLine[];
  next_step_conditions: PackLine[];
  spin?: {
    situation: PackLine[];
    problem: PackLine[];
    implication: PackLine[];
    need_payoff: PackLine[];
  };
  insufficient_evidence: boolean;
  insufficient_evidence_reasons?: string[];
};

type ColdCallCard = {
  discovery_questions: PackLine[];
};

type SalesPack = {
  id: string;
  contact_id: string;
  approved_facts: ApprovedFact[];
  hypotheses: Hypothesis[];
  cold_call_prep_card: ColdCallCard | null;
  meeting_booking_pack: MeetingPack | null;
  created_at: string;
};

const STORAGE_LAST_PACK_PREFIX = 'echo.lastPackId.';

const safeHost = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

const lineBadge = (line: { evidence_ids?: string[]; hypothesis_ids?: string[] }) => {
  const hasEvidence = (line?.evidence_ids || []).length > 0;
  const hasHypothesis = (line?.hypothesis_ids || []).length > 0;
  if (hasEvidence) return { text: 'FACT', tone: 'success' as const };
  if (hasHypothesis) return { text: 'HYP', tone: 'warning' as const };
  return { text: '—', tone: 'subtle' as const };
};

export function BookDemoWorkspace() {
  const { contacts, visibleContacts, showCompletedLeads, activeContact, setActiveContactId } = useSales();
  const [noteText, setNoteText] = useState('');
  const [claims, setClaims] = useState<EvidenceClaim[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [pack, setPack] = useState<SalesPack | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const contactId = activeContact?.id || '';
  const contactOptions = useMemo(() => {
    const base = (showCompletedLeads ? contacts : visibleContacts).slice(0, 80);
    if (activeContact && !base.find((c) => c.id === activeContact.id)) {
      return [activeContact, ...base];
    }
    return base;
  }, [contacts, visibleContacts, showCompletedLeads, activeContact]);

  const refreshIntel = async () => {
    if (!contactId) return;
    setBusy(true);
    setStatus(null);
    try {
      const [factsRes, claimsRes] = await Promise.all([
        echoApi.evidence.listFacts({ contact_id: contactId }),
        echoApi.evidence.listClaims({ contact_id: contactId, status: 'needs_review' }),
      ]);
      setFacts(factsRes.facts || []);
      setClaims(claimsRes.claims || []);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to refresh intel');
    } finally {
      setBusy(false);
    }
  };

  const loadLastPack = async () => {
    if (!contactId) return;
    const key = `${STORAGE_LAST_PACK_PREFIX}${contactId}`;
    const packId = window.localStorage.getItem(key);
    if (!packId) {
      setPack(null);
      return;
    }
    setBusy(true);
    try {
      const res = await echoApi.packs.get(packId);
      setPack(res as SalesPack);
    } catch {
      window.localStorage.removeItem(key);
      setPack(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refreshIntel();
    void loadLastPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const ingestNote = async () => {
    if (!contactId) return;
    const text = noteText.trim();
    if (!text) return;
    setBusy(true);
    setStatus(null);
    try {
      const ingest = await echoApi.evidence.ingestUserNote({
        contact_id: contactId,
        note_text: text,
        note_kind: 'manual_notes',
      });
      await echoApi.evidence.extract({ document_id: ingest.document_id, model: 'gpt-4o-mini', prompt_version: 'extractor_v1' });
      setNoteText('');
      setStatus('Poznámka uložená + extrahovaná. Zkontroluj claimy.');
      await refreshIntel();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to ingest note');
    } finally {
      setBusy(false);
    }
  };

  const reviewClaim = async (evidenceId: string, nextStatus: 'approved' | 'rejected') => {
    setBusy(true);
    setStatus(null);
    try {
      await echoApi.evidence.reviewClaim(evidenceId, { status: nextStatus });
      await refreshIntel();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to review claim');
    } finally {
      setBusy(false);
    }
  };

  const generateQuestions = async () => {
    if (!contactId) return;
    setBusy(true);
    setStatus(null);
    try {
      const gen = await echoApi.packs.generate({
        contact_id: contactId,
        include: ['cold_call_prep_card', 'meeting_booking_pack'],
        language: 'cs',
      });
      window.localStorage.setItem(`${STORAGE_LAST_PACK_PREFIX}${contactId}`, gen.pack_id);
      const res = await echoApi.packs.get(gen.pack_id);
      setPack(res as SalesPack);
      setStatus(gen.quality_report.passes ? 'Pack připraven.' : `Pack má chyby: ${gen.quality_report.failed_checks.join(', ')}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to generate pack');
    } finally {
      setBusy(false);
    }
  };

  const approvedFacts = (facts || []).slice(0, 4);
  const pendingClaims = (claims || []).slice(0, 4);

  const prospectingQuestions = (pack?.cold_call_prep_card?.discovery_questions || []).slice(0, 6);
  const qualifyingQuestions = (pack?.meeting_booking_pack?.discovery_questions || []).slice(0, 6);
  const meetingAsks = (pack?.meeting_booking_pack?.meeting_asks || []).slice(0, 2);

  return (
    <div className="workspace" data-testid="book-demo-workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Lead</p>
            <h2>Domluvit demo</h2>
            <p className="muted text-sm">Intel + otázky. Bez přepínání.</p>
          </div>
          <button className="btn ghost" onClick={() => void refreshIntel()} disabled={!contactId || busy} type="button">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Aktivní lead</span>
            <span className="pill subtle">{contactId ? 'Active' : 'Pick one'}</span>
          </div>
          <select value={contactId} onChange={(e) => setActiveContactId(e.target.value)} disabled={busy}>
            <option value="" disabled>
              Vyber lead
            </option>
            {contactOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `· ${c.company}` : ''}
              </option>
            ))}
          </select>
          {activeContact && (
            <div className="muted text-sm mt-2">
              {activeContact.title || 'Role'} {activeContact.company ? `· ${activeContact.company}` : ''}
            </div>
          )}
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Poznámka (evidence)</span>
            <span className="muted text-xs">+ extrakce</span>
          </div>
          <textarea
            className="notes"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Co víš z CRM / callu / webu (bez LinkedIn scrapingu)…"
          />
          <button className="btn outline sm" onClick={() => void ingestNote()} disabled={!contactId || busy || !noteText.trim()} type="button">
            Uložit
          </button>
        </div>

        {status && <div className="status-line">{status}</div>}
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Otázky</p>
            <h2>Prospecting + Qualifying</h2>
            <p className="muted text-sm">Evidence‑gated. Pokud není evidence, uvidíš jen hypotézy k ověření.</p>
          </div>
          <button className="btn primary" onClick={() => void generateQuestions()} disabled={!contactId || busy} type="button">
            <Sparkles size={14} /> Připravit pack
          </button>
        </div>

        {!pack && <div className="muted">Vygeneruj pack pro otázky a meeting ask.</div>}

        {pack && (
          <div className="grid two">
            <div className="panel soft">
              <div className="panel-head tight">
                <span className="eyebrow">Prospecting otázky</span>
                <span className="pill subtle">{prospectingQuestions.length}</span>
              </div>
              <div className="list">
                {prospectingQuestions.map((q) => {
                  const badge = lineBadge(q);
                  return (
                    <div key={q.id} className="list-row">
                      <div className="item-title">{q.text}</div>
                      <span className={`pill ${badge.tone}`}>{badge.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel soft">
              <div className="panel-head tight">
                <span className="eyebrow">Qualifying otázky</span>
                <span className="pill subtle">{qualifyingQuestions.length}</span>
              </div>
              <div className="list">
                {qualifyingQuestions.map((q) => {
                  const badge = lineBadge(q);
                  return (
                    <div key={q.id} className="list-row">
                      <div className="item-title">{q.text}</div>
                      <span className={`pill ${badge.tone}`}>{badge.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {pack && (
          <div className="panel soft">
            <div className="panel-head tight">
              <span className="eyebrow">Meeting ask</span>
              <span className="muted text-sm">2 varianty</span>
            </div>
            <div className="list">
              {meetingAsks.map((a) => {
                const badge = lineBadge(a);
                return (
                  <div key={a.id} className="list-row">
                    <div className="item-title">{a.text}</div>
                    <span className={`pill ${badge.tone}`}>{badge.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Intel</p>
            <h2>Fakta + claimy</h2>
            <p className="muted text-sm">Jen to, co potřebuješ na domluvení.</p>
          </div>
          <span className="pill subtle">{approvedFacts.length} facts</span>
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Approved facts</span>
          </div>
          <div className="list">
            {approvedFacts.length === 0 && <div className="muted">Zatím žádná schválená fakta.</div>}
            {approvedFacts.map((f) => (
              <div key={f.evidence_id} className="list-row">
                <div>
                  <div className="item-title">{f.claim}</div>
                  <div className="muted text-xs">{safeHost(f.source_url)} · {f.confidence}</div>
                </div>
                <span className="pill success">FACT</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Needs review</span>
            <span className="pill subtle">{pendingClaims.length}</span>
          </div>
          <div className="list">
            {pendingClaims.length === 0 && <div className="muted">Nic nečeká na review.</div>}
            {pendingClaims.map((c) => (
              <div key={c.evidence_id} className="list-row">
                <div>
                  <div className="item-title">{c.claim}</div>
                  <div className="muted text-xs">{safeHost(c.source_url)} · {c.confidence}</div>
                </div>
                <div className="button-row">
                  <button className="btn ghost sm" onClick={() => void reviewClaim(c.evidence_id, 'approved')} disabled={busy} type="button" title="Approve">
                    <Check size={14} />
                  </button>
                  <button className="btn ghost sm danger" onClick={() => void reviewClaim(c.evidence_id, 'rejected')} disabled={busy} type="button" title="Reject">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
