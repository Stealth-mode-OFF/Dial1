import React from 'react';
import { Copy } from 'lucide-react';
import type { Brief } from '../../types/contracts';

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function SignalBadge({ type, text }: { type: string; text: string }) {
  const colors: Record<string, string> = {
    opportunity: 'var(--green-500, #22c55e)',
    risk: 'var(--red-500, #ef4444)',
    neutral: 'var(--gray-500, #737373)',
  };
  return (
    <span
      className="dp-signal-badge"
      style={{ borderLeft: `3px solid ${colors[type] || colors.neutral}` }}
    >
      {text}
    </span>
  );
}

export function BriefPanel({ brief, loading }: { brief: Brief | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="dp-panel dp-brief">
        <div className="dp-panel-title">Company & Person Brief</div>
        <div className="dp-skeleton-block" />
        <div className="dp-skeleton-block short" />
        <div className="dp-skeleton-block" />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="dp-panel dp-brief">
        <div className="dp-panel-title">Company & Person Brief</div>
        <p className="dp-empty">Select a contact and click <strong>Generate</strong> to load the brief.</p>
      </div>
    );
  }

  const { company, person, signals, landmines } = brief;

  return (
    <div className="dp-panel dp-brief">
      <div className="dp-panel-header">
        <span className="dp-panel-title">Brief</span>
        {brief.cached && <span className="dp-cached-badge">cached</span>}
      </div>

      {/* Company */}
      <section className="dp-section">
        <h3 className="dp-section-title">
          🏢 {company.name}
          <button className="dp-copy-btn" onClick={() => copyText(company.summary)} title="Copy">
            <Copy size={12} />
          </button>
        </h3>
        <div className="dp-meta-row">
          {company.industry && <span className="dp-tag">{company.industry}</span>}
          {company.size && <span className="dp-tag">{company.size}</span>}
          {company.website && (
            <a className="dp-link" href={company.website} target="_blank" rel="noreferrer">
              {company.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
        <p className="dp-text">{company.summary}</p>
        {company.recentNews && (
          <p className="dp-text dp-news">📰 {company.recentNews}</p>
        )}
      </section>

      {/* Person */}
      <section className="dp-section">
        <h3 className="dp-section-title">
          👤 {person.name}
          <button className="dp-copy-btn" onClick={() => copyText(`${person.name} — ${person.role}`)} title="Copy">
            <Copy size={12} />
          </button>
        </h3>
        <div className="dp-meta-row">
          <span className="dp-tag">{person.role}</span>
          <span className="dp-tag">{person.decisionPower}</span>
          {person.linkedin && (
            <a className="dp-link" href={person.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          )}
        </div>
        {person.background && <p className="dp-text">{person.background}</p>}
      </section>

      {/* Signals */}
      {signals.length > 0 && (
        <section className="dp-section">
          <h3 className="dp-section-title">📡 Signals</h3>
          <div className="dp-signals">
            {signals.map((s, i) => (
              <SignalBadge key={i} type={s.type} text={s.text} />
            ))}
          </div>
        </section>
      )}

      {/* Landmines */}
      {landmines.length > 0 && (
        <section className="dp-section">
          <h3 className="dp-section-title">⚠️ Landmines</h3>
          <ul className="dp-landmines">
            {landmines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
