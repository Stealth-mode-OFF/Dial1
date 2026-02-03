import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, FileText, RefreshCw, X } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi, type ApprovedFact, type EvidenceClaim } from '../utils/echoApi';

export function EvidenceWorkspace() {
  const { activeContact, setActiveContactId, contacts } = useSales();
  const [noteText, setNoteText] = useState('');
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [claims, setClaims] = useState<EvidenceClaim[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const contactId = activeContact?.id || null;

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
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const contactOptions = useMemo(() => contacts.slice(0, 50), [contacts]);

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
      setStatus('Note ingested as evidence document.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const extractFromLastDoc = async () => {
    if (!lastDocId) return;
    setIsLoading(true);
    setStatus('');
    try {
      await echoApi.evidence.extract({ document_id: lastDocId, model: 'gpt-4o-mini', prompt_version: 'extractor_v1' });
      setStatus('Extraction completed.');
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const review = async (evidenceId: string, nextStatus: 'approved' | 'rejected') => {
    setIsLoading(true);
    setStatus('');
    try {
      await echoApi.evidence.reviewClaim(evidenceId, { status: nextStatus });
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
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
        language: 'en',
      });
      setStatus(`Pack generated: ${res.pack_id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Evidence</p>
            <h2>Review Gate</h2>
            <p className="muted text-sm">Only approved claims can become facts.</p>
          </div>
          <button className="btn ghost" onClick={() => void refresh()} disabled={!contactId || isLoading} type="button">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Selected Lead</span>
            <span className="pill subtle">{contactId ? 'Active' : 'Pick one'}</span>
          </div>
          <select
            value={contactId || ''}
            onChange={(e) => setActiveContactId(e.target.value)}
            disabled={isLoading}
            aria-label="Select contact"
          >
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

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Manual Notes</span>
            <span className="muted text-sm">Stored as evidence doc.</span>
          </div>
          <textarea
            className="notes"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Paste verified notes you want to use (no LinkedIn scraping)."
          />
          <div className="button-row">
            <button className="btn outline" onClick={() => void ingestNote()} disabled={!contactId || isLoading} type="button">
              <FileText size={14} /> Ingest note
            </button>
            <button className="btn ghost" onClick={() => void extractFromLastDoc()} disabled={!lastDocId || isLoading} type="button">
              Extract claims
            </button>
          </div>
          {lastDocId && <div className="muted text-sm">Last doc: {lastDocId}</div>}
        </div>

        {status && <div className="status-line">{status}</div>}
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Claims</p>
            <h2>Needs Review</h2>
            <p className="muted text-sm">Approve only if the snippet proves the claim.</p>
          </div>
          <span className="pill subtle">{claims.length} pending</span>
        </div>

        <div className="list">
          {!contactId && <div className="muted">Select a lead to review evidence.</div>}
          {contactId && claims.length === 0 && <div className="muted">No pending claims.</div>}
          {claims.map((c) => (
            <div key={c.evidence_id} className="list-row">
              <div>
                <div className="item-title">{c.claim}</div>
                <div className="muted text-sm">
                  {c.confidence} · {new Date(c.captured_at).toLocaleString()}
                </div>
                <div className="output-box" style={{ minHeight: 0 }}>
                  {c.evidence_snippet}
                </div>
                <div className="muted text-sm">{c.source_url}</div>
              </div>
              <div className="button-row">
                <button className="btn outline sm" onClick={() => void review(c.evidence_id, 'approved')} disabled={isLoading} type="button">
                  <Check size={14} /> Approve
                </button>
                <button className="btn danger sm" onClick={() => void review(c.evidence_id, 'rejected')} disabled={isLoading} type="button">
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Approved</p>
            <h2>Facts</h2>
            <p className="muted text-sm">Used by the writer.</p>
          </div>
          <button className="btn primary" onClick={() => void generatePack()} disabled={!contactId || isLoading} type="button">
            Generate pack
          </button>
        </div>

        <div className="list paged">
          {!contactId && <div className="muted">Select a lead to view approved facts.</div>}
          {contactId && facts.length === 0 && <div className="muted">No approved facts yet.</div>}
          {facts.slice(0, 8).map((f) => (
            <div key={f.evidence_id} className="list-row">
              <div>
                <div className="item-title">{f.claim}</div>
                <div className="muted text-sm">{f.source_url}</div>
              </div>
              <span className="pill subtle">{f.confidence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

