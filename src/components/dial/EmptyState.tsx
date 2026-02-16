interface EmptyStateProps {
  importing: boolean;
  pipedriveConfigured: boolean;
  error?: string | null;
  onImport: () => void;
  onShowSettings: () => void;
}

export function EmptyState({ importing, pipedriveConfigured, error, onImport, onShowSettings }: EmptyStateProps) {
  return (
    <div className="phase-empty">
      <div className="empty-card">
        <span className="empty-icon">📞</span>
        <h2>Připraven k volání</h2>
        <p>
          {!pipedriveConfigured
            ? 'Nastav Pipedrive API klíč v Nastavení a pak importuj leady.'
            : 'Importuj leady z Pipedrive a spusť svůj calling blok.'}
        </p>
        {error && (
          <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
            {error}
          </div>
        )}
        <div className="empty-actions">
          <button onClick={onImport} disabled={importing || !pipedriveConfigured}>
            {importing ? 'Importuji…' : '↓ Importovat leady'}
          </button>
          <button onClick={onShowSettings}>⚙ Nastavení</button>
        </div>
      </div>
    </div>
  );
}
