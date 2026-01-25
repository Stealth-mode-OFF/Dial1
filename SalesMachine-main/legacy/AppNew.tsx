import { useState, useEffect } from 'react';
import { EchoSidebar } from './components/EchoSidebar';
import { TopBar } from './components/TopBar';
import { CommandCenter } from './components/CommandCenter';
import { LiveCampaigns } from './components/LiveCampaigns';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AuthGate } from './components/AuthGate';
import { supabaseClient } from './utils/supabase/client';
import { LiveMeetCoach } from './components/LiveMeetCoach';

export type EnergyLevel = 'low' | 'medium' | 'high';
export type MoodLevel = 'bad' | 'neutral' | 'good';

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  contacts: Contact[];
};

export type Contact = {
  id: string;
  name: string;
  role?: string;
  company: string;
  phone: string;
  aiSummary?: string;
  hiringSignal?: string;
  lastNews?: string;
  intentScore?: number;
  personalityType?: {
    type: string;
    advice: string;
  };
};

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    'loading',
  );
  const [activeTab, setActiveTab] = useState<NavItem>('command-center');
  const [dailyCallsCount, setDailyCallsCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    callsDone: 0,
    target: 60,
  });

  useEffect(() => {
    if (!supabaseClient) {
      setAuthStatus('unauthenticated');
      return;
    }

    supabaseClient.auth.getSession().then(({ data }) => {
      setAuthStatus(data.session ? 'authenticated' : 'unauthenticated');
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadDailyStats();
  }, []);

  async function loadDailyStats() {
    try {
      if (!supabaseClient) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: calls } = await supabaseClient
        .from('calls')
        .select('*')
        .gte('created_at', today);

      if (calls) {
        setDailyCallsCount(calls.length);
        setSessionStats({
          callsDone: calls.length,
          target: 60,
        });
      }
    } catch (error) {
      console.error('Failed to load daily stats:', error);
    }
  }

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p>Loading EchoOS...</p>
        </div>
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return <AuthGate onAuthenticated={() => setAuthStatus('authenticated')} />;
  }

  const handleNavigate = (tab: NavItem) => {
    setActiveTab(tab);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <EchoSidebar 
        activeTab={activeTab} 
        setActiveTab={handleNavigate}
        sessionStats={sessionStats}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar onNavigate={handleNavigate} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50">
          {activeTab === 'command-center' && (
            <CommandCenter onNavigate={handleNavigate} />
          )}
          {activeTab === 'live-campaigns' && (
            <LiveCampaigns />
          )}
          {activeTab === 'intelligence' && (
            <AnalyticsScreen />
          )}
          {activeTab === 'meet-coach' && (
            <LiveMeetCoach />
          )}
          {activeTab === 'configuration' && (
            <SettingsScreen salesStyle="consultative" setSalesStyle={() => {}} />
          )}
        </main>
      </div>
    </div>
  );
}
