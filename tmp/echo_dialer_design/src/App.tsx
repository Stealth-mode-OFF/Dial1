import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandCenter } from './pages/CommandCenter';
import { LiveCampaigns } from './pages/LiveCampaigns';
import { Intelligence } from './pages/Intelligence';
import { MeetCoach } from './pages/MeetCoach';
import { Configuration } from './pages/Configuration';
import { SalesProvider } from './contexts/SalesContext';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItem>('command-center');

  return (
    <SalesProvider>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <TopBar onNavigate={(tab) => setActiveTab(tab)} />
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50">
            {activeTab === 'command-center' && <CommandCenter onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'live-campaigns' && <LiveCampaigns onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'intelligence' && <Intelligence onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'meet-coach' && <MeetCoach onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'configuration' && <Configuration onNavigate={(tab) => setActiveTab(tab)} />}
          </main>
        </div>
      </div>
    </SalesProvider>
  );
}