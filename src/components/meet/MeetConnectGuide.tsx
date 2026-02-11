interface MeetConnectGuideProps {
  isConnected: boolean;
}

export function MeetConnectGuide({ isConnected }: MeetConnectGuideProps) {
  return (
    <div className="mc-sidebar-section">
      <div className="mc-sidebar-heading">📡 Google Meet</div>
      {isConnected ? (
        <div className="mc-meet-status mc-meet-status--ok">
          <span className="mc-captions-dot connected" /> Připojeno — titulky běží
        </div>
      ) : (
        <div className="mc-meet-guide">
          <div className="mc-meet-status mc-meet-status--waiting">
            <span className="mc-captions-dot" /> Čekám na připojení
          </div>
          <ol className="mc-meet-steps">
            <li>Otevři <strong>Google Meet</strong> v tomto prohlížeči</li>
            <li>Zapni <strong>titulky</strong> (CC tlačítko)</li>
            <li>Nainstaluj rozšíření <a href="https://chromewebstore.google.com" target="_blank" rel="noopener noreferrer">Echo Meet Coach</a></li>
            <li>Titulky se zobrazí automaticky</li>
          </ol>
        </div>
      )}
    </div>
  );
}
