
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import CommandCenter from './pages/CommandCenter';
import LiveCampaigns from './pages/LiveCampaigns';
import Intelligence from './pages/Intelligence';
import Configuration from './pages/Configuration';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'configuration';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItem>('command-center');

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="app-main">
        <TopBar onNavigate={(tab) => setActiveTab(tab)} />

        <main className="app-content">
          {activeTab === 'command-center' && (
            <CommandCenter onStartDialer={() => setActiveTab('live-campaigns')} />
          )}
          {activeTab === 'live-campaigns' && <LiveCampaigns />}
          {activeTab === 'intelligence' && <Intelligence />}
          {activeTab === 'configuration' && <Configuration />}
        </main>
      </div>
    </div>
  );
}
