import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronRight } from 'lucide-react';
import type { CallScript } from '../../types/contracts';

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dp-collapsible">
      <button className="dp-collapsible-header" onClick={() => setOpen(!open)}>
        <span>{icon} {title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="dp-collapsible-body">{children}</div>}
    </div>
  );
}

export function CallScriptPanel({ script, loading }: { script: CallScript | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="dp-panel dp-script">
        <div className="dp-panel-title">Call Script</div>
        <div className="dp-skeleton-block" />
        <div className="dp-skeleton-block short" />
        <div className="dp-skeleton-block" />
        <div className="dp-skeleton-block short" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="dp-panel dp-script">
        <div className="dp-panel-title">Call Script</div>
        <p className="dp-empty">Script will appear after generating brief.</p>
      </div>
    );
  }

  return (
    <div className="dp-panel dp-script">
      <div className="dp-panel-header">
        <span className="dp-panel-title">Call Script</span>
        {script.cached && <span className="dp-cached-badge">cached</span>}
      </div>

      {/* Opening Variants */}
      <CollapsibleSection title="Opening Lines" icon="🎙️" defaultOpen>
        <div className="dp-variants">
          {script.openingVariants.map((v) => (
            <div key={v.id} className="dp-variant">
              <p className="dp-variant-text">{v.text}</p>
              <button className="dp-copy-btn" onClick={() => copyText(v.text)} title="Copy">
                <Copy size={12} />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Value Props */}
      <CollapsibleSection title="Value Propositions" icon="💎" defaultOpen>
        {script.valueProps.map((vp, i) => (
          <div key={i} className="dp-value-prop">
            <span className="dp-vp-persona">{vp.persona}</span>
            <ul className="dp-vp-points">
              {vp.points.map((p, j) => (
                <li key={j}>
                  {p}
                  <button className="dp-copy-btn inline" onClick={() => copyText(p)} title="Copy">
                    <Copy size={10} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CollapsibleSection>

      {/* Qualification Questions */}
      <CollapsibleSection title="Qualification" icon="❓">
        <ul className="dp-qual-list">
          {script.qualification.map((q, i) => (
            <li key={i} className="dp-qual-item">
              <p className="dp-qual-q">{q.question}</p>
              <p className="dp-qual-why">{q.why}</p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Objection Handlers */}
      <CollapsibleSection title="Objection Handlers" icon="🛡️">
        <div className="dp-objections">
          {script.objections.map((o, i) => (
            <div key={i} className="dp-objection">
              <div className="dp-obj-trigger">{o.objection}</div>
              <div className="dp-obj-response">
                {o.response}
                <button className="dp-copy-btn inline" onClick={() => copyText(o.response)} title="Copy">
                  <Copy size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Closing */}
      <CollapsibleSection title="Close Variants" icon="🎯">
        <div className="dp-variants">
          {script.closeVariants.map((v) => (
            <div key={v.id} className="dp-variant">
              <p className="dp-variant-text">{v.text}</p>
              <button className="dp-copy-btn" onClick={() => copyText(v.text)} title="Copy">
                <Copy size={12} />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Next Steps */}
      {script.nextSteps.length > 0 && (
        <CollapsibleSection title="Next Steps" icon="➡️">
          <ul className="dp-next-steps">
            {script.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
