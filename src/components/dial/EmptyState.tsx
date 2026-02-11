interface EmptyStateProps {
  importing: boolean;
  pipedriveConfigured: boolean;
  onImport: () => void;
  onShowSettings: () => void;
}

export function EmptyState({ importing, pipedriveConfigured, onImport, onShowSettings }: EmptyStateProps) {
  return (
    <div className="phase-empty">
      <div className="empty-card">
        <span className="empty-icon">📞</span>
        <h2>Připraven k volání</h2>
        <p>Importuj leady z Pipedrive a spusť svůj calling blok.</p>
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
