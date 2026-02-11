import type { Brief } from '../../types/contracts';
import type { Lead } from '../../features/meetcoach/types';

interface LiveBriefPanelProps {
  lead: Lead;
  brief: Brief | null;
}

export function LiveBriefPanel({ lead, brief }: LiveBriefPanelProps) {
  return (
    <div className="mc-sidebar-section">
      <div className="mc-sidebar-heading">🏢 Firma & kontakt</div>
      <div className="mc-sidebar-brief">
        <div className="mc-brief-row">
          <span className="mc-brief-label">Firma</span>
          <span className="mc-brief-value">{brief?.company?.name || lead.company}</span>
        </div>
        <div className="mc-brief-row">
          <span className="mc-brief-label">Kontakt</span>
          <span className="mc-brief-value">{brief?.person?.name || lead.name}</span>
        </div>
        <div className="mc-brief-row">
          <span className="mc-brief-label">Role</span>
          <span className="mc-brief-value">{brief?.person?.role || lead.role}</span>
        </div>
        {(brief?.company?.industry || lead.industry) && (
          <div className="mc-brief-row">
            <span className="mc-brief-label">Obor</span>
            <span className="mc-brief-value">{brief?.company?.industry || lead.industry}</span>
          </div>
        )}
        {(brief?.company?.size || lead.companySize) && (
          <div className="mc-brief-row">
            <span className="mc-brief-label">Velikost</span>
            <span className="mc-brief-value">{brief?.company?.size || `${lead.companySize} zaměstnanců`}</span>
          </div>
        )}
        {brief?.person?.decisionPower && brief.person.decisionPower !== 'unknown' && (
          <div className="mc-brief-row">
            <span className="mc-brief-label">Typ</span>
            <span className="mc-brief-value">
              {brief.person.decisionPower === 'decision-maker'
                ? '🔑 Rozhodovatel'
                : brief.person.decisionPower === 'influencer'
                  ? '💡 Influencer'
                  : '🏅 Champion'}
            </span>
          </div>
        )}
        {(brief?.company?.summary || lead.notes) && (
          <div className="mc-brief-notes">{brief?.company?.summary || lead.notes}</div>
        )}
        {brief?.company?.recentNews && (
          <div className="mc-brief-notes">📰 {brief.company.recentNews}</div>
        )}
        {brief?.person?.background && (
          <div className="mc-brief-notes">👤 {brief.person.background}</div>
        )}
        <div className="mc-brief-links">
          {brief?.company?.website ? (
            <a
              href={brief.company.website.startsWith('http') ? brief.company.website : `https://${brief.company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mc-brief-link"
            >
              🌐 Web
            </a>
          ) : null}
          {brief?.person?.linkedin ? (
            <a href={brief.person.linkedin} target="_blank" rel="noopener noreferrer" className="mc-brief-link">
              💼 LinkedIn
            </a>
          ) : null}
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="mc-brief-link">✉️ E-mail</a>
          ) : null}
        </div>
      </div>

      {brief && ((brief.signals || []).length > 0 || (brief.landmines || []).length > 0) && (
        <div className="mc-brief-signals">
          {(brief.signals || []).slice(0, 4).map((s, idx) => (
            <span key={`sig-${idx}`} className={`mc-brief-chip mc-brief-chip--${s.type}`}>
              {s.type === 'opportunity' ? '🟢' : s.type === 'risk' ? '🔴' : '⚪'} {s.text}
            </span>
          ))}
          {(brief.landmines || []).slice(0, 3).map((t, idx) => (
            <span key={`lm-${idx}`} className="mc-brief-chip mc-brief-chip--landmine">⚠️ {t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
