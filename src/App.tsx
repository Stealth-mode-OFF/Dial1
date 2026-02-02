
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import CommandCenter from './pages/CommandCenter';
import LiveCampaigns from './pages/LiveCampaigns';
import Intelligence from './pages/Intelligence';
import MeetCoach from './pages/MeetCoach';
import Configuration from './pages/Configuration';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItem>('command-center');

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="app-main">
        <TopBar onNavigate={(tab) => setActiveTab(tab)} />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'command-center' && <CommandCenter />}
          {activeTab === 'live-campaigns' && <LiveCampaigns />}
          {activeTab === 'intelligence' && <Intelligence />}
          {activeTab === 'meet-coach' && <MeetCoach />}
          {activeTab === 'configuration' && <Configuration />}
        </main>
      </div>
    </div>
  );
}
