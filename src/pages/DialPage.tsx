import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { BriefPanel } from '../components/dial/BriefPanel';
import { CallScriptPanel } from '../components/dial/CallScriptPanel';
import { useBrief } from '../hooks/useBrief';
import type { BriefRequest } from '../types/contracts';

interface DialPageProps {
  onSwitchMode?: () => void;
  /** Pre-fill from active contact */
  contactDomain?: string;
  contactName?: string;
  contactRole?: string;
  contactNotes?: string;
}

export function DialPage({
  onSwitchMode,
  contactDomain = '',
  contactName = '',
  contactRole = '',
  contactNotes = '',
}: DialPageProps) {
  const { brief, script, loading, error, generate, clear } = useBrief();

  // Local form state
  const [domain, setDomain] = useState(contactDomain);
  const [name, setName] = useState(contactName);
  const [role, setRole] = useState(contactRole);
  const [notes, setNotes] = useState(contactNotes);

  // Sync props → state when contact changes
  React.useEffect(() => {
    setDomain(contactDomain);
    setName(contactName);
    setRole(contactRole);
    setNotes(contactNotes);
    clear();
  }, [contactDomain, contactName, contactRole, contactNotes, clear]);

  const handleGenerate = useCallback(
    (forceRefresh = false) => {
      if (!domain.trim() || !name.trim()) return;
      const req: BriefRequest = {
        domain: domain.trim(),
        personName: name.trim(),
        role: role.trim() || 'Unknown',
        notes: notes.trim() || undefined,
      };
      generate(req, forceRefresh);
    },
    [domain, name, role, notes, generate],
  );

  const canGenerate = domain.trim().length > 0 && name.trim().length > 0;

  return (
    <div className="dp-page dp-dial-page">
      {/* Top bar */}
      <header className="dp-topbar">
        <div className="dp-topbar-left">
          <span className="dp-logo">Dial1</span>
          <span className="dp-page-label">DIAL</span>
        </div>

        <div className="dp-topbar-center">
          <input
            className="dp-input"
            placeholder="Company domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <input
            className="dp-input"
            placeholder="Person name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="dp-input short"
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <button
            className="dp-btn dp-btn-primary"
            disabled={!canGenerate || loading}
            onClick={() => handleGenerate(false)}
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
          {brief && (
            <button
              className="dp-btn dp-btn-ghost"
              disabled={loading}
              onClick={() => handleGenerate(true)}
              title="Force refresh (skip cache)"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        <div className="dp-topbar-right">
          {onSwitchMode && (
            <button className="dp-btn dp-btn-ghost" onClick={onSwitchMode}>
              Meet →
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="dp-error-banner">{error}</div>
      )}

      {/* Two-column layout */}
      <main className="dp-split dp-split-2">
        <BriefPanel brief={brief} loading={loading} />
        <CallScriptPanel script={script} loading={loading} />
      </main>
    </div>
  );
}

export default DialPage;
