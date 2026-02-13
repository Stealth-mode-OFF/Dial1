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
        <span className="empty-icon">◎</span>
        <h2>Žádné kontakty</h2>
        <p>Importuj 30 leadů z Pipedrive a začni volat.</p>
        <div className="empty-actions">
          <button onClick={onImport} disabled={importing || !pipedriveConfigured}>
            {importing ? 'Importuji…' : '↓ Importovat 30 leadů'}
          </button>
          <button onClick={onShowSettings}>⚙ Nastavení</button>
        </div>
      </div>
    </div>
  );
}
