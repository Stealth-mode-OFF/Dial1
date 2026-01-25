import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type Stats = {
  callsToday: number;
  callsGoal: number;
  connected: number;
  meetingsBooked: number;
  pipelineValue: number;
  streak: number;
  // Optional analytics fields (when Supabase analytics is wired)
  totalCalls?: number;
  connectRate?: number;
  revenue?: number;
  dailyVolume?: Array<{ time: string; value: number }>;
  dispositionBreakdown?: Array<{ name: string; value: number }>;
};

type Lead = {
  id: string;
  name: string;
  title: string;
  company: string;
  status: 'new' | 'called' | 'connected' | 'meeting' | 'refused';
};

type UserProfile = {
  name: string;
  role: string;
  avatarInitials: string;
  status: 'online' | 'away' | 'busy';
  energyLevel: number;
};

type Integrations = {
  pipedrive: boolean;
  googleMeet: boolean;
  slack: boolean;
};

type ActivityLog = {
  id: string;
  type: 'call' | 'meeting' | 'email';
  description: string;
  timestamp: string;
  score?: number; // 0-100
};

type SalesContextType = {
  stats: Stats;
  currentLead: Lead;
  user: UserProfile;
  integrations: Integrations;
  recentActivity: ActivityLog[];
  objectionCounts: Record<string, number>;
  incrementCalls: () => void;
  recordConnection: (success: boolean) => void;
  recordObjection: (objection: string) => void;
  bookMeeting: () => void;
  nextLead: () => void;
  toggleIntegration: (key: keyof Integrations) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
};

const defaultStats: Stats = {
  callsToday: 45,
  callsGoal: 60,
  connected: 8,
  meetingsBooked: 7,
  pipelineValue: 37450,
  streak: 42,
};

const defaultLead: Lead = {
  id: '1',
  name: 'John Doe',
  title: 'VP of Sales',
  company: 'TechCorp',
  status: 'new',
};

const defaultUser: UserProfile = {
  name: 'Alex Salesman',
  role: 'Senior AE',
  avatarInitials: 'AS',
  status: 'online',
  energyLevel: 85,
};

const defaultIntegrations: Integrations = {
  pipedrive: true,
  googleMeet: true,
  slack: false,
};

/**
 * SalesContext
 *
 * Provides user, stats, and objection data for the app.
 * Used by all main screens and components.
 *
 * For handover: Update this context for new user/stats fields as needed.
 */
const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function SalesProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [currentLead, setCurrentLead] = useState<Lead>(defaultLead);
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [integrations, setIntegrations] = useState<Integrations>(defaultIntegrations);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([
    { id: '1', type: 'meeting', description: 'Demo with Acme Corp', timestamp: '2h ago', score: 92 },
    { id: '2', type: 'call', description: 'Intro call - Stark Ind', timestamp: '4h ago', score: 64 },
    { id: '3', type: 'call', description: 'Follow-up / Wayne Ent', timestamp: 'Yesterday', score: 85 },
  ]);
  const [objectionCounts, setObjectionCounts] = useState<Record<string, number>>({
    'Too expensive': 42,
    'Send me an email': 28,
    'Not interested': 15,
    'Using competitor': 12,
  });

  // API Helper with Fallback
  const apiCall = async (endpoint: string, method: 'GET' | 'POST', body?: any) => {
    if (!projectId) {
      console.warn('Missing Supabase Project ID, running in local mode');
      return null;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-139017f8${endpoint}`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (error) {
      console.error('API Call Failed, falling back to local state:', error);
      return null;
    }
  };

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      const data = await apiCall('/stats', 'GET');
      if (data) {
        setStats(data);
      } else {
        console.log('Using local/default stats');
      }
    };
    loadStats();
  }, []);

  // Sync stats to server
  const syncStats = async (newStats: Stats) => {
    setStats(newStats); // Optimistic update
    apiCall('/stats', 'POST', newStats).catch(e => console.error('Sync failed', e));
  };

  const incrementCalls = () => {
    const newStats = { ...stats, callsToday: stats.callsToday + 1 };
    syncStats(newStats);
    // Add to activity log
      const newLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'call',
        description: `Call with ${currentLead.name}`,
        timestamp: 'Just now',
        // score: 50 + Math.floor(Math.random() * 40)
        // REMOVE: No random score, should come from real data
    };
    setRecentActivity(prev => [newLog, ...prev].slice(0, 10));
  };

  const recordConnection = (success: boolean) => {
    const newStats = {
      ...stats,
      connected: success ? stats.connected + 1 : stats.connected,
      streak: success ? stats.streak + 1 : 0
    };
    syncStats(newStats);
  };

  const recordObjection = (objection: string) => {
    setObjectionCounts(prev => ({
      ...prev,
      [objection]: (prev[objection] || 0) + 1
    }));
  };

  const bookMeeting = () => {
    const newStats = {
      ...stats,
      meetingsBooked: stats.meetingsBooked + 1,
      pipelineValue: stats.pipelineValue + 5000,
      streak: stats.streak + 2
    };
    syncStats(newStats);
    setCurrentLead(prev => ({ ...prev, status: 'meeting' }));
    // Update activity log
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      type: 'meeting',
      description: `Booked meeting with ${currentLead.name}`,
      timestamp: 'Just now',
      score: 95
    };
    setRecentActivity(prev => [newLog, ...prev].slice(0, 10));
  };

  const nextLead = () => {
    // REMOVE: No fake names, titles, or companies. App is empty and ready for import.
    // Reset transient state
    setLiveNote('');
    setScriptStep(0);
    // REMOVE: No random contact generation, should come from real data
    setCurrentLead(null);
    });
  };

  const toggleIntegration = (key: keyof Integrations) => {
    setIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <SalesContext.Provider value={{ 
      stats, 
      currentLead, 
      user, 
      integrations, 
      recentActivity,
      objectionCounts,
      incrementCalls, 
      recordConnection, 
      recordObjection,
      bookMeeting, 
      nextLead,
      toggleIntegration,
      updateUser
    }}>
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}
