
import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandCenter } from './components/CommandCenter';
import { LiveCampaigns } from './components/LiveCampaigns';
import { Intelligence } from './pages/Intelligence';
import { MeetCoach } from './pages/MeetCoach';
import { Configuration } from './pages/Configuration';
import { SalesProvider } from './contexts/SalesContext';
import { DebugOverlay } from './components/DebugOverlay';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItem>('command-center');

  return (
    <SalesProvider>
      <div className="flex h-screen bg-grid-pattern font-sans text-slate-900 overflow-hidden relative selection:bg-yellow-200 selection:text-black">
        <DebugOverlay />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Space+Grotesk:wght@400;500;700;800&display=swap');
          body { font-family: 'Space Grotesk', sans-serif; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
        `}</style>

        <div className="z-50">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <TopBar onNavigate={(tab) => setActiveTab(tab)} />
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24">
            <div className="max-w-7xl mx-auto h-full">
              {activeTab === 'command-center' && <CommandCenter onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'live-campaigns' && <LiveCampaigns onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'intelligence' && <Intelligence onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'meet-coach' && <MeetCoach onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'configuration' && <Configuration onNavigate={(tab) => setActiveTab(tab)} />}
            </div>
          </main>
        </div>
      </div>
    </SalesProvider>
  );
}
