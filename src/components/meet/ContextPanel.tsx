import React from 'react';
import { Copy } from 'lucide-react';
import type { Brief } from '../../types/contracts';

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export function ContextPanel({ brief }: { brief: Brief | null }) {
  if (!brief) {
    return (
      <div className="dp-panel dp-context">
        <div className="dp-panel-title">Context</div>
        <p className="dp-empty">No brief loaded.</p>
      </div>
    );
  }

  const { company, person, signals, landmines } = brief;

  return (
    <div className="dp-panel dp-context">
      <div className="dp-panel-title">Context</div>

      <section className="dp-section compact">
        <h3 className="dp-section-title">
          🏢 {company.name}
          <button className="dp-copy-btn" onClick={() => copyText(company.summary)} title="Copy">
            <Copy size={12} />
          </button>
        </h3>
        <div className="dp-meta-row">
          {company.industry && <span className="dp-tag">{company.industry}</span>}
          {company.size && <span className="dp-tag">{company.size}</span>}
        </div>
        <p className="dp-text small">{company.summary}</p>
      </section>

      <section className="dp-section compact">
        <h3 className="dp-section-title">👤 {person.name}</h3>
        <div className="dp-meta-row">
          <span className="dp-tag">{person.role}</span>
          <span className="dp-tag">{person.decisionPower}</span>
        </div>
        {person.background && <p className="dp-text small">{person.background}</p>}
      </section>

      {signals.length > 0 && (
        <section className="dp-section compact">
          <h3 className="dp-section-title">📡 Signals</h3>
          <div className="dp-signals">
            {signals.slice(0, 4).map((s, i) => (
              <span
                key={i}
                className="dp-signal-badge"
                style={{
                  borderLeft: `3px solid ${
                    s.type === 'opportunity' ? 'var(--green-500, #22c55e)' :
                    s.type === 'risk' ? 'var(--red-500, #ef4444)' :
                    'var(--gray-500, #737373)'
                  }`,
                }}
              >
                {s.text}
              </span>
            ))}
          </div>
        </section>
      )}

      {landmines.length > 0 && (
        <section className="dp-section compact">
          <h3 className="dp-section-title">⚠️ Landmines</h3>
          <ul className="dp-landmines">
            {landmines.slice(0, 3).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
