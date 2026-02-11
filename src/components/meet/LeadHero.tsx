import type { Lead } from '../../features/meetcoach/types';

interface LeadHeroProps {
  lead: Lead;
  onStart: () => void;
  isLoading: boolean;
  onUpdate: (patch: Partial<Lead>) => void;
}

export function LeadHero({ lead, onStart, isLoading, onUpdate }: LeadHeroProps) {
  const isEmpty = !lead.name && !lead.company;

  return (
    <div className="mc-hero">
      <div className="mc-hero-avatar">{lead.name ? lead.name.charAt(0) : '?'}</div>
      <div className="mc-hero-info">
        {isEmpty ? (
          <>
            <input
              className="mc-hero-input"
              placeholder="Jméno kontaktu"
              value={lead.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
            />
            <input
              className="mc-hero-input"
              placeholder="Společnost"
              value={lead.company}
              onChange={(e) => onUpdate({ company: e.target.value })}
            />
            <input
              className="mc-hero-input"
              placeholder="Role (např. Sales Director)"
              value={lead.role}
              onChange={(e) => onUpdate({ role: e.target.value })}
            />
          </>
        ) : (
          <>
            <h1 className="mc-hero-name">{lead.name}</h1>
            <p className="mc-hero-company">{lead.role} @ {lead.company}</p>
            {lead.industry && <span className="mc-hero-tag">{lead.industry}</span>}
            {lead.companySize && <span className="mc-hero-tag">{lead.companySize} zaměstnanců</span>}
          </>
        )}
      </div>
      {lead.notes && (
        <div className="mc-hero-notes">
          <span className="mc-hero-notes-label">📝 Poznámky</span>
          <p>{lead.notes}</p>
        </div>
      )}
      <button className="mc-hero-btn" onClick={onStart} disabled={isLoading || (!lead.name && !lead.company)}>
        {isLoading ? '⏳ Generuji skript...' : '▶️ Zahájit demo'}
      </button>
      {isEmpty && <p className="mc-hero-hint">Vyplňte jméno a firmu pro zahájení</p>}
    </div>
  );
}
