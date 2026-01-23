import React, { createContext, useContext, useState, ReactNode } from 'react';

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

type SalesContextType = {
  stats: Stats;
  currentLead: Lead;
  incrementCalls: () => void;
  recordConnection: (success: boolean) => void;
  bookMeeting: () => void;
  nextLead: () => void;
};

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

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function SalesProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [currentLead, setCurrentLead] = useState<Lead>(defaultLead);

  const incrementCalls = () => {
    setStats(prev => ({ ...prev, callsToday: prev.callsToday + 1 }));
  };

  const recordConnection = (success: boolean) => {
    setStats(prev => ({
      ...prev,
      connected: success ? prev.connected + 1 : prev.connected,
      streak: success ? prev.streak + 1 : 0
    }));
  };

  const bookMeeting = () => {
    setStats(prev => ({
      ...prev,
      meetingsBooked: prev.meetingsBooked + 1,
      pipelineValue: prev.pipelineValue + 5000, // Avg deal size
      streak: prev.streak + 2 // Bonus streak
    }));
    setCurrentLead(prev => ({ ...prev, status: 'meeting' }));
  };

  const nextLead = () => {
    // Mock switching lead
    setCurrentLead({
      id: Math.random().toString(),
      name: 'Jane Smith',
      title: 'Director of Ops',
      company: 'Logistics Inc',
      status: 'new'
    });
  };

  return (
    <SalesContext.Provider value={{ stats, currentLead, incrementCalls, recordConnection, bookMeeting, nextLead }}>
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
