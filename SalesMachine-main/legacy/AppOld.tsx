import { useState, useEffect } from 'react';
import { CampaignList } from './components/CampaignList';
import { AICallScreen } from './components/AICallScreen';
import { PostCallScreen } from './components/PostCallScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { DailyBriefing } from './components/dashboard/DailyBriefing';
import { PreCallBattleCard } from './components/PreCallBattleCard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { MentorMood } from './components/ui/MentorIsland';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AuthGate } from './components/AuthGate';
import { supabaseClient } from './utils/supabase/client';
import { LiveMeetCoach } from './components/LiveMeetCoach';
import { CallCockpit } from './components/CallCockpit';

export type EnergyLevel = 'low' | 'medium' | 'high';
export type MoodLevel = 'bad' | 'neutral' | 'good';

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  contactCount: number; // derived if contacts present
  contacts: Contact[];
};

export type Contact = {
  id: string;
  name: string;
  role?: string;
  company: string;
  phone: string;
  // Deep Intel - optional for Pipedrive contacts initially
  aiSummary?: string;
  hiringSignal?: string;
  lastNews?: string;
  intentScore?: number; // 0-100
  personalityType?: {
    type: string; // e.g. "Driver", "Analytical"
    advice: string; // e.g. "Buď stručný, používej data."
  };

};

type Screen = 'dashboard' | 'campaigns' | 'battlecard' | 'call' | 'cockpit' | 'postcall' | 'analytics' | 'settings' | 'briefing' | 'meet';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    'loading',
  );
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    return localStorage.getItem('echo:onboarded') === 'true';
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [dailyCallsCount, setDailyCallsCount] = useState(0);
  const [pomodoroSession, setPomodoroSession] = useState(2);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]); // Empty initially, CampaignList will fetch
  
  // Call Data (for post-call screen)
  const [callTranscript, setCallTranscript] = useState<any[]>([]);
  const [callAnalysis, setCallAnalysis] = useState<any>(null);
  
  // Mentor / Island State
  const [mentorMessage, setMentorMessage] = useState<string | null>(null);
  const [mentorMood, setMentorMood] = useState<MentorMood>('neutral');

  // Initial Welcome Message
  useEffect(() => {
    // Only show if on dashboard initially
    setTimeout(() => {
      setMentorMood('happy');
      setMentorMessage("Vítej zpět, šampione. Systémy běží na 100%. Jsi připraven ovládnout dnešní den?");
      
      // Auto-dismiss after a while
      setTimeout(() => {
         setMentorMessage(null);
         setMentorMood('neutral');
      }, 8000);
    }, 1500);
  }, []);
  
  // New State for "Check-in" & Persona
  const [energy, setEnergy] = useState<EnergyLevel>('high');
  const [mood, setMood] = useState<MoodLevel>('good');
  const [callsSinceBreak, setCallsSinceBreak] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [salesStyle, setSalesStyle] = useState<'hunter' | 'consultative'>('consultative');

  const handleCheckIn = (newEnergy: EnergyLevel, newMood: MoodLevel) => {
    setEnergy(newEnergy);
    setMood(newMood);
    setCallsSinceBreak(0);
    // After check-in, go to Briefing if energy is high enough, otherwise Dashboard
    if (newEnergy !== 'low') {
        setCurrentScreen('briefing');
    }
  };
  
  const handleTakeBreak = () => {
    // Reset energy after break
    setEnergy('high');
    setCallsSinceBreak(0);
    setStreak(0); // Reset streak on break? Or keep it? Usually break resets "hot streak".
    setShowBreakReminder(false);
  };

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

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Checking access…
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return <AuthGate onAuthenticated={() => setAuthStatus('authenticated')} />;
  }

  const handleStartCampaign = (campaign: Campaign) => {
    setActiveCampaign(campaign);
    setCurrentContactIndex(0);
    // NEW: Go to battlecard screen first, not directly to call
    setCurrentScreen('battlecard');
  };

  const handleBattleCardReady = () => {
    // User reviewed battlecard and is ready to dial
    setCurrentScreen('call');
  };

  const handleSkipContact = () => {
    // Skip current contact and move to next
    handleNextContact();
  };

  const handleCallComplete = (transcript: any[], analysis?: any) => {
    // Call ended, store data and go to post-call screen
    setCallTranscript(transcript);
    setCallAnalysis(analysis);
    setCurrentScreen('postcall');
  };

  const handlePostCallComplete = (disposition: 'meeting' | 'callback' | 'not-interested') => {
    // Log to backend if needed
    console.log('Call logged with disposition:', disposition);
    // Move to next contact
    handleNextContact();
  };

  const handleNextContact = () => {
    setDailyCallsCount(prev => prev + 1);
    setStreak(prev => prev + 1);
    
    // Dynamic Energy Drain Logic
    const newCallsCount = callsSinceBreak + 1;
    setCallsSinceBreak(newCallsCount);

    // Every 3 calls drop energy level
    if (newCallsCount === 3 && energy === 'high') {
        setEnergy('medium');
    } else if (newCallsCount === 6 && energy === 'medium') {
        setEnergy('low');
        setShowBreakReminder(true);
    }

    if (!activeCampaign) return;
    
    const nextIndex = currentContactIndex + 1;
    if (nextIndex < activeCampaign.contacts.length) {
      setCurrentContactIndex(nextIndex);
      // Go to battlecard for next contact
      setCurrentScreen('battlecard');
    } else {
      setActiveCampaign(null);
      setCurrentScreen('campaigns');
    }
  };

  const handleBriefingStart = (contacts: Contact[]) => {
    // Convert Pipedrive contacts into a temporary campaign
    const campaign: Campaign = {
      id: 'daily-mission',
      name: 'Daily Mission (Pipedrive)',
      description: 'Auto-generated priority list',
      contactCount: contacts.length,
      contacts,
    };

    handleStartCampaign(campaign);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('echo:onboarded', 'true');
    setHasSeenOnboarding(true);
  };

  // Show onboarding if first time
  if (!hasSeenOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <DashboardLayout
      dailyCount={dailyCallsCount}
      userName="Pepa Trader"
      currentScreen={currentScreen}
      onNavigate={setCurrentScreen}
      pomodoroSession={pomodoroSession}
      mentorMessage={mentorMessage}
      mentorMood={mentorMood}
      energy={energy}
      streak={streak}
      showBreakReminder={showBreakReminder}
      onTakeBreak={handleTakeBreak}
      onDismissBreak={() => setShowBreakReminder(false)}
    >
      {currentScreen === 'dashboard' && (
        <DashboardScreen 
          onNavigate={setCurrentScreen} 
          energy={energy}
          mood={mood}
          onCheckIn={handleCheckIn}
          campaigns={campaigns}
        />
      )}

      {currentScreen === 'briefing' && (
          <DailyBriefing 
            isLoading={false}
            onStartSession={handleBriefingStart}
          />
      )}

      {currentScreen === 'campaigns' && (
        <CampaignList 
          campaigns={campaigns} 
          onStartCampaign={handleStartCampaign}
          energy={energy}
        />
      )}

      {/* NEW: Pre-Call Battle Card Screen */}
      {currentScreen === 'battlecard' && activeCampaign && (
        <PreCallBattleCard
          contact={activeCampaign.contacts[currentContactIndex]}
          onReady={handleBattleCardReady}
          onSkip={handleSkipContact}
        />
      )}
      
      {currentScreen === 'call' && activeCampaign && (
        <AICallScreen 
          contact={activeCampaign.contacts[currentContactIndex]}
          contactNumber={currentContactIndex + 1}
          totalContacts={activeCampaign.contacts.length}
          campaignId={activeCampaign.id}
          onNextContact={handleNextContact}
          onCallComplete={handleCallComplete}
          energy={energy}
          mood={mood}
          salesStyle={salesStyle}
        />
      )}

      {/* NEW: Production Call Cockpit */}
      {currentScreen === 'cockpit' && activeCampaign && (
        <CallCockpit
          contactId={activeCampaign.contacts[currentContactIndex].id}
          onEndCall={() => setCurrentScreen('postcall')}
          onNavigate={(screen) => setCurrentScreen(screen as Screen)}
        />
      )}

      {/* NEW: Post-Call Disposition Screen */}
      {currentScreen === 'postcall' && activeCampaign && (
        <PostCallScreen
          contact={activeCampaign.contacts[currentContactIndex]}
          campaignId={activeCampaign.id}
          transcript={callTranscript}
          analysisResult={callAnalysis}
          onComplete={handlePostCallComplete}
        />
      )}

      {currentScreen === 'analytics' && (
        <AnalyticsScreen />
      )}
      
      {currentScreen === 'meet' && (
        <LiveMeetCoach />
      )}
      
      {currentScreen === 'settings' && (
        <SettingsScreen 
          salesStyle={salesStyle} 
          setSalesStyle={setSalesStyle} 
        />
      )}
    </DashboardLayout>
  );
}
