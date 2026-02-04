import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, PhoneCall, Sparkles, TriangleAlert } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { echoApi, type ApprovedFact } from '../utils/echoApi';
import { dialViaTelLink } from '../utils/extensionBridge';

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

type PackObjection = {
  id: string;
  trigger: string;
  response: string;
  evidence_ids: string[];
  hypothesis_ids: string[];
};

type ColdCallCard = {
  opener_variants: PackLine[];
  discovery_questions: PackLine[];
  objections: PackObjection[];
  insufficient_evidence: boolean;
  insufficient_evidence_reasons?: string[];
};

type MeetingPack = {
  discovery_questions: PackLine[];
  meeting_asks: PackLine[];
  agenda: PackLine[];
  next_step_conditions: PackLine[];
  insufficient_evidence: boolean;
  insufficient_evidence_reasons?: string[];
};

type SpinPack = {
  spin: null | {
    situation: PackLine[];
    problem: PackLine[];
    implication: PackLine[];
    need_payoff: PackLine[];
  };
  insufficient_evidence: boolean;
  insufficient_evidence_reasons?: string[];
};

type SalesPack = {
  id: string;
  contact_id: string;
  approved_facts: ApprovedFact[];
  hypotheses: Hypothesis[];
  cold_call_prep_card: ColdCallCard | null;
  meeting_booking_pack: MeetingPack | null;
  spin_demo_pack: SpinPack | null;
  quality_report?: { passes: boolean; failed_checks: string[] };
  created_at: string;
};

type PreparedContact = {
  id: string;
  name: string;
  title?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  company_website?: string | null;
};

const STORAGE_LAST_PACK_PREFIX = 'echo.lastPackId.';

const safeHost = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

const safeOpen = (url: string) => {
  if (typeof window === 'undefined') return;
  if (import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true') return;
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // ignore
  }
};

const copyToClipboard = async (text: string) => {
  if (typeof window === 'undefined') return;
  const clean = (text || '').toString().trim();
  if (!clean) return;
  try {
    await navigator.clipboard.writeText(clean);
  } catch {
    // ignore
  }
};

export function BookDemoWorkspace() {
  const {
    isConfigured,
    isLoading,
    error,
    contacts,
    visibleContacts,
    showCompletedLeads,
    activeContact,
    setActiveContactId,
    pipedriveConfigured,
    setPipedriveKey,
    refresh,
  } = useSales();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pack, setPack] = useState<SalesPack | null>(null);
  const [preparedContact, setPreparedContact] = useState<PreparedContact | null>(null);
  const [pipedriveKeyDraft, setPipedriveKeyDraft] = useState('');
  const [companyWebsiteDraft, setCompanyWebsiteDraft] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const contactId = activeContact?.id || '';
  const contactOptions = useMemo(() => {
    const base = (showCompletedLeads ? contacts : visibleContacts).slice(0, 80);
    if (activeContact && !base.find((c) => c.id === activeContact.id)) return [activeContact, ...base];
    return base;
  }, [contacts, visibleContacts, showCompletedLeads, activeContact]);

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
    setStatus(null);
    void loadLastPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  useEffect(() => {
    const next = (preparedContact?.company_website || '').toString().trim();
    setCompanyWebsiteDraft(next);
  }, [preparedContact?.company_website]);

  const prepare = async () => {
    if (!contactId) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await echoApi.lead.prepare({
        contact_id: contactId,
        language: 'cs',
        include: ['cold_call_prep_card', 'meeting_booking_pack', 'spin_demo_pack'],
        base_url: companyWebsiteDraft.trim() ? companyWebsiteDraft.trim() : undefined,
      });
      window.localStorage.setItem(`${STORAGE_LAST_PACK_PREFIX}${contactId}`, res.pack_id);
      setPack(res.pack as SalesPack);
      if (res.contact) setPreparedContact(res.contact as PreparedContact);
      if (res.quality_report?.passes) setStatus('Připraveno.');
      else setStatus(`Pozor: ${res.quality_report?.failed_checks?.join(', ') || 'Pack má chyby.'}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Prepare failed');
    } finally {
      setBusy(false);
    }
  };

  const onConnectPipedrive = async () => {
    const key = pipedriveKeyDraft.trim();
    if (!key) return;
    setBusy(true);
    setStatus(null);
    try {
      await setPipedriveKey(key);
      setPipedriveKeyDraft('');
      await refresh();
      setStatus('Pipedrive připojený.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Připojení selhalo');
    } finally {
      setBusy(false);
    }
  };

  const leadTitle = preparedContact?.title || activeContact?.title || null;
  const leadCompany = preparedContact?.company || activeContact?.company || null;
  const leadPhone = preparedContact?.phone || activeContact?.phone || null;
  const leadEmail = preparedContact?.email || activeContact?.email || null;

  const facts = (pack?.approved_facts || []).slice(0, 5);
  const hypotheses = (pack?.hypotheses || []).slice(0, 3);

  const openers = (pack?.cold_call_prep_card?.opener_variants || []).slice(0, 2);
  const prospecting = (pack?.cold_call_prep_card?.discovery_questions || []).slice(0, 5);
  const qualifying = (pack?.meeting_booking_pack?.discovery_questions || []).slice(0, 5);
  const objections = (pack?.cold_call_prep_card?.objections || []).slice(0, 3);
  const meetingAsks = (pack?.meeting_booking_pack?.meeting_asks || []).slice(0, 2);

  const spin = pack?.spin_demo_pack?.spin || null;
  const spinMap = spin
    ? {
        situation: spin.situation.slice(0, 2),
        problem: spin.problem.slice(0, 2),
        implication: spin.implication.slice(0, 2),
        need_payoff: spin.need_payoff.slice(0, 2),
      }
    : null;

  const openerCopy = openers.map((l) => l.text).join('\n');
  const meetingAskCopy = meetingAsks.map((l) => l.text).join('\n');

  const scriptText = useMemo(() => {
    if (!pack) return '';
    const lines: string[] = [];
    const add = (title: string, items: Array<{ text: string }>) => {
      if (!items.length) return;
      lines.push(title);
      for (const item of items) lines.push(`- ${item.text}`);
      lines.push('');
    };
    add('Opener', openers);
    add('Prospecting', prospecting);
    add('Qualifying', qualifying);
    if (objections.length) {
      lines.push('Top objections');
      for (let i = 0; i < objections.length; i++) {
        const o = objections[i];
        const redirect =
          spin?.implication?.[i]?.text ||
          spin?.need_payoff?.[0]?.text ||
          'Když to zůstane stejné další 3 měsíce, co bude největší dopad?';
        lines.push(`- "${o.trigger || 'Námitka'}" → ${o.response} → ${redirect}`);
      }
      lines.push('');
    }
    add('Meeting ask', meetingAsks);
    return lines.join('\n').trim();
  }, [pack, objections, openers, prospecting, qualifying, meetingAsks, spin]);

  return (
    <div className="workspace" data-testid="book-demo-workspace">
      <div className="panel head">
        <div className="panel-head tight">
          <div>
            <p className="eyebrow">Lead Brief</p>
            <h2>{activeContact?.name || 'Vyber lead'}</h2>
            <div className="muted text-sm">
              {(leadCompany && `${leadCompany} · `) || ''}
              {(leadTitle && `${leadTitle} · `) || ''}
              {leadPhone || '—'} {leadEmail ? `· ${leadEmail}` : ''}
            </div>
          </div>
          <div className="button-row wrap">
            <button className="btn primary" onClick={() => void prepare()} disabled={!contactId || busy || !pipedriveConfigured} type="button">
              <Sparkles size={14} /> {busy ? 'Preparing…' : 'Prepare'}
            </button>
            <button className="btn outline sm" onClick={() => leadPhone && dialViaTelLink(leadPhone)} disabled={!leadPhone} type="button">
              <PhoneCall size={14} /> Call
            </button>
            <button className="btn ghost sm" onClick={() => void copyToClipboard(openerCopy)} disabled={!openerCopy} type="button">
              <Copy size={14} /> Copy opener
            </button>
            <button className="btn ghost sm" onClick={() => void copyToClipboard(meetingAskCopy)} disabled={!meetingAskCopy} type="button">
              <Copy size={14} /> Copy meeting ask
            </button>
            <button className="btn ghost sm" onClick={() => setShowAdvanced((v) => !v)} type="button">
              {showAdvanced ? 'Advanced −' : 'Advanced +'}
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="full">
            <label className="label">Lead</label>
            <select value={contactId} onChange={(e) => setActiveContactId(e.target.value)} disabled={busy || isLoading}>
              <option value="" disabled>
                Vyber lead
              </option>
              {contactOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `· ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isConfigured && (
          <div className="banner warning">
            <strong>Supabase není nastavený.</strong>
            <div className="muted text-sm">{error || 'Doplň VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY.'}</div>
          </div>
        )}

        {isConfigured && !pipedriveConfigured && (
          <div className="banner warning">
            <div className="icon-title">
              <TriangleAlert size={16} /> <strong>Pipedrive není připojený</strong>
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="full">
                <label className="label">Pipedrive API key</label>
                <input
                  value={pipedriveKeyDraft}
                  onChange={(e) => setPipedriveKeyDraft(e.target.value)}
                  placeholder="Vlož API key z Pipedrive"
                  type="password"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="button-row" style={{ marginTop: 10 }}>
              <button className="btn primary sm" onClick={() => void onConnectPipedrive()} disabled={busy || !pipedriveKeyDraft.trim()} type="button">
                Připojit
              </button>
            </div>
          </div>
        )}

        {showAdvanced && (
          <div className="panel soft" style={{ marginTop: 12 }}>
            <div className="panel-head tight">
              <span className="eyebrow">Advanced</span>
              <span className="pill subtle">
                {pack?.quality_report?.passes ? (
                  <>
                    <CheckCircle2 size={14} /> Pack OK
                  </>
                ) : (
                  'Hidden'
                )}
              </span>
            </div>
            <label className="label">Company website (optional)</label>
            <input
              value={companyWebsiteDraft}
              onChange={(e) => setCompanyWebsiteDraft(e.target.value)}
              placeholder="https://firma.cz"
              autoComplete="off"
            />
            <div className="muted text-xs" style={{ marginTop: 8 }}>
              Pokud je prázdné, zkusíme odvodit web z email domény (bez LinkedIn scrapingu).
            </div>
          </div>
        )}

        {(status || error) && <div className="status-line">{status || error}</div>}
      </div>

      <div className="panel soft">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Intel</p>
            <h2>Fakta + hypotézy</h2>
            <p className="muted text-sm">Fakta jen z evidence. Hypotézy jsou otázky k ověření.</p>
          </div>
          <span className={`pill ${facts.length ? 'success' : 'subtle'}`}>{facts.length ? `${facts.length} facts` : '0 facts'}</span>
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Verified facts</span>
            <span className="pill subtle">{facts.length}</span>
          </div>
          <div className="list paged">
            {facts.length === 0 && <div className="muted">Zatím žádná schválená fakta (script bude víc generický).</div>}
            {facts.map((f) => (
              <div key={f.evidence_id} className="list-row" style={{ cursor: 'default' }}>
                <div>
                  <div className="item-title">{f.claim}</div>
                  <div className="muted text-xs">{safeHost(f.source_url)} · {f.confidence}</div>
                </div>
                <button className="btn ghost sm" onClick={() => safeOpen(f.source_url)} type="button" title="Open source">
                  <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel soft" style={{ marginTop: 12 }}>
          <div className="panel-head tight">
            <span className="eyebrow">Hypotheses</span>
            <span className="pill subtle">{hypotheses.length}</span>
          </div>
          <div className="list paged">
            {hypotheses.length === 0 && <div className="muted">Žádné hypotézy.</div>}
            {hypotheses.map((h) => (
              <div key={h.hypothesis_id} className="list-row" style={{ cursor: 'default' }}>
                <div>
                  <div className="item-title">{h.hypothesis}</div>
                  <div className="muted text-xs">Ověř: {h.how_to_verify}</div>
                </div>
                <span className="pill warning">HYP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Script</p>
            <h2>Cold call + kvalifikace</h2>
            <p className="muted text-sm">Maximálně krátké. Drž se toho.</p>
          </div>
          <button className="btn outline sm" onClick={() => void copyToClipboard(scriptText)} disabled={!scriptText} type="button">
            <Copy size={14} /> Copy all
          </button>
        </div>

        {!pack && <div className="muted">Vyber lead a klikni Prepare.</div>}

        {pack && (
          <div className="output-box">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{scriptText}</pre>
          </div>
        )}
      </div>

      <div className="panel soft">
        <div className="panel-head">
          <div>
            <p className="eyebrow">SPIN</p>
            <h2>Runbook</h2>
            <p className="muted text-sm">2 otázky na stage.</p>
          </div>
          <span className="pill subtle">{spinMap ? 'Ready' : '—'}</span>
        </div>

        {!spinMap && <div className="muted">Prepare vygeneruje SPIN runbook.</div>}

        {spinMap && (
          <div className="output-box">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {[
                'Situation',
                ...spinMap.situation.map((l) => `- ${l.text}`),
                '',
                'Problem',
                ...spinMap.problem.map((l) => `- ${l.text}`),
                '',
                'Implication',
                ...spinMap.implication.map((l) => `- ${l.text}`),
                '',
                'Need-Payoff',
                ...spinMap.need_payoff.map((l) => `- ${l.text}`),
              ]
                .join('\n')
                .trim()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
