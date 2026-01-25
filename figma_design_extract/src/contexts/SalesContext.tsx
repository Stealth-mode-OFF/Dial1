import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type Stats = {
  callsToday: number;
  callsGoal: number;
  connected: number;
  meetingsBooked: number;
  pipelineValue: number;
  streak: number;
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

type CoachSettings = {
  activePersona: string;
  interventions: {
    speedAlert: boolean;
    monologueBreaker: boolean;
    fillerWordKiller: boolean;
    sentimentTracker: boolean;
  };
};

type ConfigurationSettings = {
  notifications: {
    emailDigest: boolean;
    slackAlerts: boolean;
    browserPush: boolean;
  };
  audio: {
    inputDevice: string;
    outputDevice: string;
    noiseCancellation: boolean;
  };
};

type ActivityLog = {
  id: string;
  type: 'call' | 'meeting' | 'email';
  description: string;
  timestamp: string;
  score?: number; // 0-100
};

export type ScheduleItem = {
  id: string;
  time: string;
  end: string;
  title: string;
  type: 'prep' | 'work' | 'break';
  icon: string; // Storing icon name as string for serializability
  desc: string;
  status: 'pending' | 'active' | 'completed';
};

type SalesContextType = {
  stats: Stats;
  currentLead: Lead;
  user: UserProfile;
  integrations: Integrations;
  coachSettings: CoachSettings;
  configSettings: ConfigurationSettings;
  recentActivity: ActivityLog[];
  objectionCounts: Record<string, number>;
  schedule: ScheduleItem[];
  liveNote: string;
  scriptStep: number;
  incrementCalls: () => void;
  recordConnection: (success: boolean) => void;
  recordObjection: (objection: string) => void;
  bookMeeting: () => void;
  nextLead: () => void;
  toggleIntegration: (key: keyof Integrations) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  updateCoachSettings: (updates: Partial<CoachSettings>) => void;
  updateConfigSettings: (section: keyof ConfigurationSettings, updates: any) => void;
  updateScheduleStatus: (id: string, status: ScheduleItem['status']) => void;
  setLiveNote: (note: string) => void;
  setScriptStep: (step: number) => void;
  resetData: () => Promise<void>;
};

// Default values (used as fallback/initial state)
const defaultStats: Stats = {
  callsToday: 42,
  callsGoal: 60,
  connected: 8,
  meetingsBooked: 2,
  pipelineValue: 12450,
  streak: 8,
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

const defaultCoachSettings: CoachSettings = {
  activePersona: 'challenger',
  interventions: {
    speedAlert: true,
    monologueBreaker: true,
    fillerWordKiller: false,
    sentimentTracker: true
  }
};

const defaultConfigSettings: ConfigurationSettings = {
  notifications: {
    emailDigest: true,
    slackAlerts: false,
    browserPush: true
  },
  audio: {
    inputDevice: 'Default Microphone',
    outputDevice: 'Default Speakers',
    noiseCancellation: true
  }
};

const defaultSchedule: ScheduleItem[] = [
    { id: '1', time: '09:00', end: '09:30', title: 'Intel & Prep', type: 'prep', icon: 'Filter', desc: 'Review CRM, Coffee, Set Daily Goals', status: 'completed' },
    { id: '2', time: '09:30', end: '10:30', title: 'Deep Canvasing', type: 'work', icon: 'Target', desc: 'Prospecting new leads. No distractions.', status: 'active' },
    { id: '3', time: '10:30', end: '10:45', title: 'Neuro-Reset', type: 'break', icon: 'ArrowDownRight', desc: 'Walk, Stretch, No Screens.', status: 'pending' },
    { id: '4', time: '10:45', end: '11:45', title: 'Demo / Outbound', type: 'work', icon: 'Phone', desc: 'High energy calls & presentations.', status: 'pending' },
    { id: '5', time: '11:45', end: '12:45', title: 'Recharge', type: 'break', icon: 'Calendar', desc: 'Lunch & Disconnect.', status: 'pending' },
    { id: '6', time: '12:45', end: '13:45', title: 'Closing Time', type: 'work', icon: 'TrendingUp', desc: 'Contracts, Negotiations, Follow-ups.', status: 'pending' },
    { id: '7', time: '13:45', end: '14:00', title: 'Daily Wrap-Up', type: 'prep', icon: 'Download', desc: 'Update CRM, Prep "Tomorrow List".', status: 'pending' },
];

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function SalesProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [currentLead, setCurrentLead] = useState<Lead>(defaultLead);
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [integrations, setIntegrations] = useState<Integrations>(defaultIntegrations);
  const [coachSettings, setCoachSettings] = useState<CoachSettings>(defaultCoachSettings);
  const [configSettings, setConfigSettings] = useState<ConfigurationSettings>(defaultConfigSettings);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(defaultSchedule);
  
  // Live Campaign State (Transient, not synced to backend for now)
  const [liveNote, setLiveNote] = useState('');
  const [scriptStep, setScriptStep] = useState(0);

  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [objectionCounts, setObjectionCounts] = useState<Record<string, number>>({});

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

  // Helper to sync state to backend
  const sync = (endpoint: string, data: any) => {
    apiCall(endpoint, 'POST', data).catch(e => console.error(`Sync to ${endpoint} failed`, e));
  };

  // Load all data on mount
  useEffect(() => {
    const loadAll = async () => {
      const [
        statsData, 
        userData, 
        integrationsData, 
        coachData, 
        configData, 
        activityData,
        objectionData,
        scheduleData
      ] = await Promise.all([
        apiCall('/stats', 'GET'),
        apiCall('/user', 'GET'),
        apiCall('/integrations', 'GET'),
        apiCall('/coachsettings', 'GET'),
        apiCall('/configsettings', 'GET'),
        apiCall('/recentactivity', 'GET'),
        apiCall('/objectioncounts', 'GET'),
        apiCall('/schedule', 'GET')
      ]);

      if (statsData) setStats(statsData);
      if (userData) setUser(userData);
      if (integrationsData) setIntegrations(integrationsData);
      if (coachData) setCoachSettings(coachData);
      if (configData) setConfigSettings(configData);
      if (activityData) setRecentActivity(activityData);
      if (objectionData) setObjectionCounts(objectionData);
      if (scheduleData) setSchedule(scheduleData);
    };

    loadAll();
  }, []);

  const incrementCalls = () => {
    const newStats = { ...stats, callsToday: stats.callsToday + 1 };
    setStats(newStats);
    sync('/stats', newStats);
    
    // Add to activity log
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      type: 'call',
      description: `Call with ${currentLead.name}`,
      timestamp: 'Just now',
      score: 50 + Math.floor(Math.random() * 40)
    };
    const newActivity = [newLog, ...recentActivity].slice(0, 20);
    setRecentActivity(newActivity);
    sync('/recentactivity', newActivity);
  };

  const recordConnection = (success: boolean) => {
    const newStats = {
      ...stats,
      connected: success ? stats.connected + 1 : stats.connected,
      streak: success ? stats.streak + 1 : 0
    };
    setStats(newStats);
    sync('/stats', newStats);
  };

  const recordObjection = (objection: string) => {
    const newCounts = {
      ...objectionCounts,
      [objection]: (objectionCounts[objection] || 0) + 1
    };
    setObjectionCounts(newCounts);
    sync('/objectioncounts', newCounts);
  };

  const bookMeeting = () => {
    const newStats = {
      ...stats,
      meetingsBooked: stats.meetingsBooked + 1,
      pipelineValue: stats.pipelineValue + 5000,
      streak: stats.streak + 2
    };
    setStats(newStats);
    sync('/stats', newStats);

    setCurrentLead(prev => ({ ...prev, status: 'meeting' }));
    
    // Update activity log
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      type: 'meeting',
      description: `Booked meeting with ${currentLead.name}`,
      timestamp: 'Just now',
      score: 95
    };
    const newActivity = [newLog, ...recentActivity].slice(0, 20);
    setRecentActivity(newActivity);
    sync('/recentactivity', newActivity);
  };

  const nextLead = () => {
    const names = ['Sarah Connor', 'Rick Deckard', 'Ellen Ripley', 'Marty McFly', 'Tony Stark', 'Bruce Wayne', 'Clark Kent', 'Diana Prince'];
    const titles = ['CTO', 'Director of Engineering', 'VP of Ops', 'Sales Manager', 'CEO', 'Founder', 'Head of IT', 'Operations Lead'];
    const companies = ['CyberDyne', 'Tyrell Corp', 'Weyland-Yutani', 'Delorean Inc', 'Stark Ind', 'Wayne Ent', 'Daily Planet', 'Themyscira Inc'];
    
    const randomIdx = Math.floor(Math.random() * names.length);
    
    // Reset transient state
    setLiveNote('');
    setScriptStep(0);
    
    setCurrentLead({
      id: Math.random().toString(),
      name: names[randomIdx],
      title: titles[randomIdx],
      company: companies[randomIdx],
      status: 'new'
    });
  };

  const toggleIntegration = (key: keyof Integrations) => {
    const newIntegrations = { ...integrations, [key]: !integrations[key] };
    setIntegrations(newIntegrations);
    sync('/integrations', newIntegrations);
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    const newUser = { ...user, ...updates };
    setUser(newUser);
    sync('/user', newUser);
  };

  const updateCoachSettings = (updates: Partial<CoachSettings>) => {
    const newSettings = { ...coachSettings, ...updates };
    setCoachSettings(newSettings);
    sync('/coachsettings', newSettings);
  };

  const updateConfigSettings = (section: keyof ConfigurationSettings, updates: any) => {
    const newSettings = {
      ...configSettings,
      [section]: { ...configSettings[section], ...updates }
    };
    setConfigSettings(newSettings);
    sync('/configsettings', newSettings);
  };

  const updateScheduleStatus = (id: string, status: ScheduleItem['status']) => {
    const newSchedule = schedule.map(item => 
        item.id === id ? { ...item, status } : item
    );
    setSchedule(newSchedule);
    sync('/schedule', newSchedule);
  };

  const resetData = async () => {
    await apiCall('/reset', 'POST');
    window.location.reload();
  };

  return (
    <SalesContext.Provider value={{ 
      stats, 
      currentLead, 
      user, 
      integrations, 
      coachSettings, 
      configSettings,
      recentActivity,
      objectionCounts,
      schedule,
      liveNote,
      scriptStep,
      incrementCalls, 
      recordConnection, 
      recordObjection,
      bookMeeting, 
      nextLead,
      toggleIntegration,
      updateUser,
      updateCoachSettings,
      updateConfigSettings,
      updateScheduleStatus,
      setLiveNote,
      setScriptStep,
      resetData
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
