import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============ DATA MODEL ============

export type IntelItemType = 'TRIGGER' | 'FACT' | 'HYPOTHESIS' | 'INFERENCE';

export interface IntelSource {
  label: string;
  url?: string;
  domain?: string;
}

export interface IntelItem {
  id: string;
  type: IntelItemType;
  text: string;
  source?: IntelSource;
  recency?: string;        // "last_30_days" | ISO date | "unknown"
  verifyQuestion?: string;  // only for HYPOTHESIS
  basedOnIds?: string[];    // references to trigger/fact IDs
}

export interface LeadIntel {
  leadId: string;
  companyName?: string;
  domain?: string;
  createdAt: string;
  items: IntelItem[];
}

// ============ HELPERS ============

/** Pick condensed subset: max 3 triggers, max 1 hypothesis, no DM style */
export function selectCondensedIntel(intel: LeadIntel): IntelItem[] {
  const triggers = intel.items.filter(i => i.type === 'TRIGGER').slice(0, 3);
  const hypothesis = intel.items.find(i => i.type === 'HYPOTHESIS');
  return hypothesis ? [...triggers, hypothesis] : triggers;
}

/** Group intel items by section */
function groupIntelItems(items: IntelItem[]) {
  return {
    triggers: items.filter(i => i.type === 'TRIGGER'),
    dmStyle: items.filter(i => i.type === 'FACT' || i.type === 'INFERENCE'),
    hypotheses: items.filter(i => i.type === 'HYPOTHESIS'),
  };
}

/** Format recency for display */
function formatRecency(recency?: string): string | null {
  if (!recency) return null;
  if (recency === 'last_30_days') return '< 30 dní';
  if (recency === 'unknown') return null;
  // Try ISO date
  try {
    const d = new Date(recency);
    if (!isNaN(d.getTime())) {
      const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
      if (diff <= 7) return `${diff}d ago`;
      if (diff <= 30) return `${Math.ceil(diff / 7)}w ago`;
      return d.toLocaleDateString('cs-CZ', { month: 'short', year: 'numeric' });
    }
  } catch { /* ignore */ }
  return null;
}

// ============ MOCK DATA ============

/** Generate mock intel for development/demo. Clearly marked as MOCK. */
export async function fetchLeadIntel(
  leadId: string,
  companyName?: string,
  domain?: string,
): Promise<LeadIntel> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 600));

  const company = companyName || 'Unknown Company';

  return {
    leadId,
    companyName: company,
    domain: domain || undefined,
    createdAt: new Date().toISOString(),
    items: [
      // TRIGGERS
      {
        id: 'trigger_1',
        type: 'TRIGGER',
        text: `${company} nabírá 3 nové manažery za poslední měsíc — rychlý růst týmu.`,
        source: { label: 'LinkedIn', url: `https://linkedin.com/company/${encodeURIComponent(company)}` },
        recency: 'last_30_days',
      },
      {
        id: 'trigger_2',
        type: 'TRIGGER',
        text: `Na webu nově zmiňují „firemní kulturu" v hodnotách — signál, že to řeší.`,
        source: { label: 'Web', domain: domain || `${company.toLowerCase().replace(/\s+/g, '')}.cz` },
        recency: 'last_30_days',
      },
      {
        id: 'trigger_3',
        type: 'TRIGGER',
        text: `Nedávná recenze na Atmoskop: „Management poslouchá málo." (3.2/5)`,
        source: { label: 'Atmoskop' },
        recency: new Date(Date.now() - 14 * 86400000).toISOString(),
      },

      // DM STYLE — FACT + INFERENCE
      {
        id: 'dm_fact_1',
        type: 'FACT',
        text: `CEO založil firmu v roce 2016. Technický background, předchozí role: CTO.`,
        source: { label: 'LinkedIn' },
      },
      {
        id: 'dm_inference_1',
        type: 'INFERENCE',
        text: `Pravděpodobně preferuje data a konkrétní čísla před emocemi. Mluvte stručně.`,
        basedOnIds: ['dm_fact_1'],
      },

      // HYPOTHESES
      {
        id: 'hyp_1',
        type: 'HYPOTHESIS',
        text: `Rychlé nabírání může vytvářet nerovnoměrnou kvalitu managementu.`,
        verifyQuestion: 'Jak dnes poznáte, že se někde tým začíná přetěžovat?',
        basedOnIds: ['trigger_1'],
      },
      {
        id: 'hyp_2',
        type: 'HYPOTHESIS',
        text: `Zmínka o kultuře na webu může znamenat, že problémy s engagementem už řeší reaktivně.`,
        verifyQuestion: 'Zjišťujete nějak pravidelně, jak se lidi ve firmě cítí?',
        basedOnIds: ['trigger_2'],
      },
      {
        id: 'hyp_3',
        type: 'HYPOTHESIS',
        text: `Negativní recenze na Atmoskop může být bolestivý bod — CEO o nich nemusí vědět.`,
        verifyQuestion: 'Stává se vám, že se o problému v týmu dozvíte pozdě?',
        basedOnIds: ['trigger_3'],
      },
    ],
  };
}

// ============ SUB-COMPONENTS ============

type IntelTab = 'triggers' | 'dm' | 'hypotheses';

/** Badge for intel type */
function TypeBadge({ type }: { type: IntelItemType }) {
  const config: Record<IntelItemType, { label: string; className: string }> = {
    TRIGGER: { label: 'Trigger', className: 'intel-badge-trigger' },
    FACT: { label: 'Fakt', className: 'intel-badge-fact' },
    INFERENCE: { label: 'Inference', className: 'intel-badge-inference' },
    HYPOTHESIS: { label: 'Hypotéza', className: 'intel-badge-hypothesis' },
  };
  const c = config[type];
  return <span className={`intel-badge ${c.className}`}>{c.label}</span>;
}

/** Source chip */
function SourceChip({ source }: { source: IntelSource }) {
  const inner = (
    <span className="intel-source-chip">
      {source.label}
      {source.domain && <span className="intel-source-domain">{source.domain}</span>}
    </span>
  );
  if (source.url) {
    return <a href={source.url} target="_blank" rel="noopener noreferrer" className="intel-source-link">{inner}</a>;
  }
  return inner;
}

/** Recency chip */
function RecencyChip({ recency }: { recency?: string }) {
  const label = formatRecency(recency);
  if (!label) return null;
  return <span className="intel-recency-chip">{label}</span>;
}

/** Single intel card */
function IntelCard({
  item,
  onCopyToOpening,
}: {
  item: IntelItem;
  onCopyToOpening?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = item.verifyQuestion || item.text;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
    onCopyToOpening?.(text);
  }, [item, onCopyToOpening]);

  return (
    <motion.div
      className={`intel-card intel-card-${item.type.toLowerCase()}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="intel-card-top">
        <TypeBadge type={item.type} />
        <div className="intel-card-chips">
          {item.source && <SourceChip source={item.source} />}
          <RecencyChip recency={item.recency} />
        </div>
      </div>

      <p className="intel-card-text">{item.text}</p>

      {item.verifyQuestion && (
        <div className="intel-card-verify">
          <span className="intel-verify-label">Zeptej se:</span>
          <p className="intel-verify-question">„{item.verifyQuestion}"</p>
        </div>
      )}

      <button
        className="intel-card-copy"
        onClick={handleCopy}
        title="Zkopírovat do schránky"
      >
        {copied ? '✓ Zkopírováno' : 'Kopírovat'}
      </button>
    </motion.div>
  );
}

/** Empty state */
function IntelEmptyState({ onLoad, loading }: { onLoad: () => void; loading: boolean }) {
  return (
    <div className="intel-empty">
      <div className="intel-empty-icon">◎</div>
      <p className="intel-empty-text">Intel not loaded</p>
      <button className="intel-empty-btn" onClick={onLoad} disabled={loading}>
        {loading ? 'Loading…' : 'Load intel'}
      </button>
    </div>
  );
}

/** Condensed / Full toggle */
function CondensedToggle({ condensed, onChange }: { condensed: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="intel-toggle">
      <button
        className={`intel-toggle-btn ${condensed ? 'active' : ''}`}
        onClick={() => onChange(true)}
      >
        Při hovoru
      </button>
      <button
        className={`intel-toggle-btn ${!condensed ? 'active' : ''}`}
        onClick={() => onChange(false)}
      >
        Vše
      </button>
    </div>
  );
}

// ============ MAIN PANEL ============

interface CallIntelPanelProps {
  leadId: string | null;
  companyName?: string;
  domain?: string;
  onCopyToOpening?: (text: string) => void;
}

export function CallIntelPanel({ leadId, companyName, domain, onCopyToOpening }: CallIntelPanelProps) {
  const [intel, setIntel] = useState<LeadIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<IntelTab>('triggers');
  const [condensed, setCondensed] = useState(true);
  const [prevLeadId, setPrevLeadId] = useState<string | null>(null);

  // Reset on lead change
  if (leadId !== prevLeadId) {
    setPrevLeadId(leadId);
    setIntel(null);
    setError(null);
    setTab('triggers');
  }

  const loadIntel = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeadIntel(leadId, companyName, domain);
      setIntel(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodařilo se načíst intel');
    } finally {
      setLoading(false);
    }
  }, [leadId, companyName, domain]);

  // Auto-load on lead change
  React.useEffect(() => {
    if (leadId && !intel && !loading) {
      loadIntel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  // Section data
  const sections = useMemo(() => {
    if (!intel) return null;

    if (condensed) {
      const condensedItems = selectCondensedIntel(intel);
      return {
        triggers: condensedItems.filter(i => i.type === 'TRIGGER'),
        dmStyle: [],
        hypotheses: condensedItems.filter(i => i.type === 'HYPOTHESIS'),
      };
    }

    return groupIntelItems(intel.items);
  }, [intel, condensed]);

  const tabItems = useMemo(() => {
    if (!sections) return [];
    if (tab === 'triggers') return sections.triggers;
    if (tab === 'dm') return sections.dmStyle;
    return sections.hypotheses;
  }, [sections, tab]);

  // Tab counts
  const counts = useMemo(() => {
    if (!sections) return { triggers: 0, dm: 0, hypotheses: 0 };
    return {
      triggers: sections.triggers.length,
      dm: sections.dmStyle.length,
      hypotheses: sections.hypotheses.length,
    };
  }, [sections]);

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-badge">Intel</span>
          Call Intelligence
        </div>
        <button
          className="ai-refresh"
          onClick={loadIntel}
          disabled={loading || !leadId}
          title="Reload intelligence"
        >
          {loading ? '...' : '↻'}
        </button>
      </div>

      {/* Toggle */}
      <CondensedToggle condensed={condensed} onChange={setCondensed} />

      {/* Tabs */}
      <div className="intel-tabs">
        <button
          className={`intel-tab ${tab === 'triggers' ? 'active' : ''}`}
          onClick={() => setTab('triggers')}
        >
          Triggers{counts.triggers > 0 && <span className="intel-tab-count">{counts.triggers}</span>}
        </button>
        {!condensed && (
          <button
            className={`intel-tab ${tab === 'dm' ? 'active' : ''}`}
            onClick={() => setTab('dm')}
          >
            DM Style{counts.dm > 0 && <span className="intel-tab-count">{counts.dm}</span>}
          </button>
        )}
        <button
          className={`intel-tab ${tab === 'hypotheses' ? 'active' : ''}`}
          onClick={() => setTab('hypotheses')}
        >
          Hypotézy{counts.hypotheses > 0 && <span className="intel-tab-count">{counts.hypotheses}</span>}
        </button>
      </div>

      {/* Content */}
      <div className="ai-content">
        {loading ? (
          <div className="ai-loading">
            <div className="ai-loading-bar" />
            <div className="ai-loading-bar short" />
            <div className="ai-loading-bar" />
          </div>
        ) : error ? (
          <div className="intel-empty">
            <div className="intel-empty-icon" style={{ color: 'var(--danger, #ef4444)' }}>!</div>
            <p className="intel-empty-text">{error}</p>
            <button className="intel-empty-btn" onClick={loadIntel}>Zkusit znovu</button>
          </div>
        ) : !intel || !sections ? (
          <IntelEmptyState onLoad={loadIntel} loading={loading} />
        ) : tabItems.length === 0 ? (
          <div className="intel-empty">
            <p className="intel-empty-text">
              {tab === 'triggers' && 'Žádné triggery nenalezeny'}
              {tab === 'dm' && 'Žádné informace o DM stylu'}
              {tab === 'hypotheses' && 'Žádné hypotézy'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tabItems.map(item => (
              <IntelCard
                key={item.id}
                item={item}
                onCopyToOpening={onCopyToOpening}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Condensed mode hint */}
        {condensed && intel && (
          <div className="intel-condensed-hint">
            Režim „při hovoru" — zobrazeno {selectCondensedIntel(intel).length} položek.
            <button className="intel-condensed-show-all" onClick={() => setCondensed(false)}>
              Zobrazit vše →
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
