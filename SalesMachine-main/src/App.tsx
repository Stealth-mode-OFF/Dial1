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
  const bypassAuth = import.meta.env.VITE_E2E_BYPASS_AUTH === 'true';
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
    if (bypassAuth) {
      setAuthStatus('authenticated');
      return;
    }
    if (!supabaseClient) {
      // No Supabase configured (local/demo mode)
      setAuthStatus('authenticated');
      return;
    }

    let isMounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setAuthStatus(data.session ? 'authenticated' : 'unauthenticated');
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [bypassAuth]);

  useEffect(() => {
    void loadDailyStats();
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
      <div className="min-h-screen flex items-center justify-center neo-grid-bg text-black">
        <div className="neo-card px-6 py-5 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-black border-t-transparent mx-auto mb-3"></div>
          <p className="font-black uppercase tracking-wider text-sm">Loading EchoOS…</p>
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
    <div className="flex h-screen figma-grid-bg font-sans text-black overflow-hidden">
      <EchoSidebar 
        activeTab={activeTab} 
        setActiveTab={handleNavigate}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar onNavigate={handleNavigate} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden figma-grid-bg">
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
