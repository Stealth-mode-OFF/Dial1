import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Flame, RefreshCw, Sparkles, Wand2, X } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi, type ApprovedFact, type EvidenceClaim, type WhisperObjectionResult } from '../utils/echoApi';

export function IntelWorkspace() {
  const { activeContact, setActiveContactId, contacts } = useSales();
  const [noteText, setNoteText] = useState('');
  const [siteBaseUrl, setSiteBaseUrl] = useState('');
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [claims, setClaims] = useState<EvidenceClaim[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const [whisperInput, setWhisperInput] = useState('');
  const [whisper, setWhisper] = useState<WhisperObjectionResult | null>(null);
  const [battleCard, setBattleCard] = useState<any | null>(null);

  const contactId = activeContact?.id || '';
  const contactOptions = useMemo(() => contacts.slice(0, 80), [contacts]);

  const refresh = useCallback(async () => {
    if (!contactId) return;
    setIsLoading(true);
    setStatus('');
    try {
      const [claimsRes, factsRes] = await Promise.all([
        echoApi.evidence.listClaims({ contact_id: contactId, status: 'needs_review' }),
        echoApi.evidence.listFacts({ contact_id: contactId }),
      ]);
      setClaims(claimsRes.claims || []);
      setFacts(factsRes.facts || []);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ingestNote = async () => {
    if (!contactId) return;
    const text = noteText.trim();
    if (!text) return;
    setIsLoading(true);
    setStatus('');
    try {
      const res = await echoApi.evidence.ingestUserNote({ contact_id: contactId, note_text: text, note_kind: 'manual_notes' });
      setLastDocId(res.document_id);
      setNoteText('');
      setStatus('Note ingested.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const ingestAllowlist = async () => {
    if (!contactId) return;
    const base = siteBaseUrl.trim();
    if (!base) return;
    setIsLoading(true);
    setStatus('');
    try {
      const res = await echoApi.evidence.ingestCompanySiteAllowlist({ contact_id: contactId, base_url: base });
      setStatus(`Ingested ${res.documents.length} pages, skipped ${res.skipped.length}.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const extractLast = async () => {
    if (!lastDocId) return;
    setIsLoading(true);
    setStatus('');
    try {
      await echoApi.evidence.extract({ document_id: lastDocId, model: 'gpt-4o-mini', prompt_version: 'extractor_v1' });
      setStatus('Extraction completed.');
      await refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const reviewClaim = async (evidenceId: string, nextStatus: 'approved' | 'rejected') => {
    setIsLoading(true);
    setStatus('');
    try {
      await echoApi.evidence.reviewClaim(evidenceId, { status: nextStatus });
      await refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const runWhisper = async () => {
    if (!contactId) return;
    const text = whisperInput.trim();
    if (!text) return;
    setIsLoading(true);
    setStatus('');
    try {
      const res = await echoApi.whisper.objection({ contact_id: contactId, prospect_text: text });
      setWhisper(res);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const runBattleCard = async () => {
    if (!activeContact) return;
    setIsLoading(true);
    setStatus('');
    try {
      const res = await echoApi.ai.sectorBattleCard({
        companyName: activeContact.company || activeContact.name,
        personTitle: activeContact.title,
      });
      setBattleCard(res);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const generatePack = async () => {
    if (!contactId) return;
    setIsLoading(true);
    setStatus('');
    try {
      const res = await echoApi.packs.generate({
        contact_id: contactId,
        include: ['cold_call_prep_card', 'meeting_booking_pack', 'spin_demo_pack'],
        language: 'cs',
      });
      setStatus(`Pack generated: ${res.pack_id} (passes: ${res.quality_report.passes ? 'yes' : 'no'})`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Intel</p>
            <h2>Evidence Gate</h2>
            <p className="muted text-sm">Approve claims → facts → packs.</p>
          </div>
          <button className="btn ghost" onClick={() => void refresh()} disabled={!contactId || isLoading} type="button">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Lead</span>
            <span className="pill subtle">{contactId ? 'Active' : 'Pick one'}</span>
          </div>
          <select value={contactId} onChange={(e) => setActiveContactId(e.target.value)} disabled={isLoading}>
            <option value="" disabled>
              Select a lead
            </option>
            {contactOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `· ${c.company}` : ''}
              </option>
            ))}
          </select>
        </div>

        <details className="details" open>
          <summary className="details-summary">Ingest</summary>
          <div className="details-body">
            <textarea
              className="notes"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Manual notes (no LinkedIn scraping)."
            />
            <div className="button-row">
              <button className="btn outline sm" onClick={() => void ingestNote()} disabled={!contactId || isLoading} type="button">
                Ingest note
              </button>
              <button className="btn ghost sm" onClick={() => void extractLast()} disabled={!lastDocId || isLoading} type="button">
                Extract last
              </button>
            </div>
            <input
              placeholder="Company website base URL (https://example.com)"
              value={siteBaseUrl}
              onChange={(e) => setSiteBaseUrl(e.target.value)}
            />
            <button className="btn ghost sm" onClick={() => void ingestAllowlist()} disabled={!contactId || isLoading} type="button">
              Ingest allowlist pages
            </button>
            {lastDocId && <div className="muted text-sm">Last doc: {lastDocId}</div>}
          </div>
        </details>

        {status && <div className="status-line">{status}</div>}
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Live Intel</p>
            <h2>Whisper + Battle Card</h2>
            <p className="muted text-sm">Whisper is hypothesis-gated unless product evidence is approved.</p>
          </div>
          <button className="btn outline" onClick={() => void generatePack()} disabled={!contactId || isLoading} type="button">
            <Sparkles size={14} /> Generate pack
          </button>
        </div>

        <details className="details" open>
          <summary className="details-summary">Whisper (Objections)</summary>
          <div className="details-body">
            <textarea
              className="notes"
              value={whisperInput}
              onChange={(e) => setWhisperInput(e.target.value)}
              placeholder="Paste the prospect’s objection (exact words)."
            />
            <button className="btn outline" onClick={() => void runWhisper()} disabled={!contactId || isLoading} type="button">
              <Wand2 size={14} /> Whisper
            </button>
            {whisper && (
              <div className="coach-box focus">
                <p className="muted text-sm">
                  {whisper.objection_id} · {whisper.core_fear} · {whisper.confidence}
                  {whisper.product_evidence_available ? ' · product evidence OK' : ' · no product evidence'}
                </p>
                <p className="say-next">{whisper.whisper.validate.text}</p>
                <p className="say-next">{whisper.whisper.reframe.text}</p>
                <p className="say-next">{whisper.whisper.implication_question.text}</p>
                <p className="say-next">{whisper.whisper.next_step.text}</p>
              </div>
            )}
          </div>
        </details>

        <details className="details">
          <summary className="details-summary">Battle Card (AI hypotheses)</summary>
          <div className="details-body">
            <button className="btn ghost sm" onClick={() => void runBattleCard()} disabled={!contactId || isLoading} type="button">
              <Flame size={14} /> Generate
            </button>
            {battleCard ? (
              <div className="coach-box">
                <div className="tagline">
                  {battleCard.detected_sector} {battleCard.sector_emoji}
                </div>
                <p className="muted text-sm">{battleCard.strategy_insight}</p>
              </div>
            ) : (
              <p className="muted text-sm">This is hypothesis-only unless backed by evidence.</p>
            )}
          </div>
        </details>
      </div>

      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Review</p>
            <h2>Claims → Facts</h2>
            <p className="muted text-sm">Approve only if snippet proves it.</p>
          </div>
          <span className="pill subtle">{claims.length} pending</span>
        </div>

        <div className="list">
          {!contactId && <div className="muted">Select a lead.</div>}
          {contactId && claims.length === 0 && <div className="muted">No pending claims.</div>}
          {claims.slice(0, 6).map((c) => (
            <div key={c.evidence_id} className="list-row">
              <div>
                <div className="item-title">{c.claim}</div>
                <div className="muted text-sm">
                  {c.confidence} · {new Date(c.captured_at).toLocaleString()}
                </div>
                <div className="output-box" style={{ minHeight: 0 }}>
                  {c.evidence_snippet}
                </div>
              </div>
              <div className="button-row">
                <button
                  className="btn outline sm"
                  onClick={() => void reviewClaim(c.evidence_id, 'approved')}
                  disabled={isLoading}
                  type="button"
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  className="btn danger sm"
                  onClick={() => void reviewClaim(c.evidence_id, 'rejected')}
                  disabled={isLoading}
                  type="button"
                >
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Approved facts</span>
            <span className="pill subtle">{facts.length}</span>
          </div>
          <div className="list paged">
            {facts.slice(0, 6).map((f) => (
              <div key={f.evidence_id} className="list-row">
                <div>
                  <div className="item-title">{f.claim}</div>
                  <div className="muted text-sm">{f.source_url}</div>
                </div>
                <span className="pill subtle">{f.confidence}</span>
              </div>
            ))}
            {contactId && facts.length === 0 && <div className="muted text-sm">No approved facts yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

