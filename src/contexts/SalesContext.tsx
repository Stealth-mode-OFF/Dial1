import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '../utils/supabase/client';
import { isSupabaseConfigured } from '../utils/supabase/info';

export type Stats = {
  callsToday: number;
  connectRate: number;
  meetingsBooked: number;
  pipelineValue: number;
  activeLeads: number;
};

export type Contact = {
  id: string;
  name: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  status?: string;
  lastTouch?: string;
  source?: string;
  location?: string;
  score?: number;
};

export type CallRecord = {
  id: string;
  createdAt?: string;
  contactId?: string;
  status?: string;
  outcome?: string;
  connected?: boolean;
  durationSec?: number;
  notes?: string;
};

export type Deal = {
  id: string;
  value?: number;
  status?: string;
  stage?: string;
};

export type UserProfile = {
  name: string;
  role: string;
  avatarInitials: string;
};

export type UserSettings = {
  dailyCallGoal?: number;
};

type SalesContextType = {
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  stats: Stats;
  contacts: Contact[];
  calls: CallRecord[];
  deals: Deal[];
  activeContact: Contact | null;
  setActiveContactId: (id: string | null) => void;
  refresh: () => Promise<void>;
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
};

const SalesContext = createContext<SalesContextType | undefined>(undefined);

const STORAGE_USER_KEY = 'echo.user';
const STORAGE_SETTINGS_KEY = 'echo.settings';

const defaultStats: Stats = {
  callsToday: 0,
  connectRate: 0,
  meetingsBooked: 0,
  pipelineValue: 0,
  activeLeads: 0,
};

const defaultUser: UserProfile = {
  name: '',
  role: '',
  avatarInitials: '',
};

const defaultSettings: UserSettings = {
  dailyCallGoal: 0,
};

const normalizeContact = (row: Record<string, any>, index: number): Contact => {
  const name =
    row.name ||
    row.full_name ||
    row.contact_name ||
    [row.first_name, row.last_name].filter(Boolean).join(' ');
  const company = row.company || row.organization || row.org_name || row.company_name || '';
  const id = String(row.id || row.contact_id || row.uuid || row.email || row.phone || index);
  return {
    id,
    name: name || 'Unnamed contact',
    title: row.title || row.role || row.job_title || '',
    company,
    phone: row.phone || row.mobile || row.phone_number || '',
    email: row.email || '',
    status: row.status || row.stage || '',
    lastTouch: row.last_touch || row.last_contacted_at || row.updated_at || row.created_at || '',
    source: row.source || row.source_name || '',
    location: row.location || row.city || row.region || '',
    score: row.score || row.lead_score || undefined,
  };
};

const normalizeCall = (row: Record<string, any>, index: number): CallRecord => {
  const status = row.status || row.disposition || row.outcome || '';
  const connected =
    row.connected === true ||
    row.is_connected === true ||
    (typeof status === 'string' &&
      ['connected', 'answered', 'completed', 'meeting'].some((key) => status.toLowerCase().includes(key)));
  const outcome = row.outcome || row.disposition || row.status || '';
  return {
    id: String(row.id || row.call_id || row.uuid || index),
    createdAt: row.created_at || row.createdAt || row.timestamp || '',
    contactId: row.contact_id || row.contactId || '',
    status,
    outcome,
    connected,
    durationSec: row.duration_sec || row.duration || row.call_duration || undefined,
    notes: row.notes || row.summary || '',
  };
};

const normalizeDeal = (row: Record<string, any>, index: number): Deal => ({
  id: String(row.id || row.deal_id || row.uuid || index),
  value: toNumber(row.value ?? row.amount ?? row.pipeline_value ?? row.deal_value),
  status: row.status || row.stage || '',
  stage: row.stage || row.phase || '',
});

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore write errors (privacy mode, quota, etc.)
  }
};

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '');
  return letters.join('') || '';
};

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(() => loadFromStorage(STORAGE_USER_KEY, defaultUser));
  const [settings, setSettings] = useState<UserSettings>(() =>
    loadFromStorage(STORAGE_SETTINGS_KEY, defaultSettings),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    saveToStorage(STORAGE_USER_KEY, user);
  }, [user]);

  useEffect(() => {
    saveToStorage(STORAGE_SETTINGS_KEY, settings);
  }, [settings]);

  const refresh = async () => {
    if (!supabaseClient || !isSupabaseConfigured) {
      setError(null);
      setContacts([]);
      setCalls([]);
      setDeals([]);
      setStats(defaultStats);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const errors: string[] = [];
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    const contactsPromise = supabaseClient
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    const callsPromise = supabaseClient
      .from('calls')
      .select('*')
      .gte('created_at', startIso)
      .limit(500);

    const dealsPromise = supabaseClient
      .from('deals')
      .select('*')
      .limit(200);

    const [contactsRes, callsRes, dealsRes] = await Promise.allSettled([
      contactsPromise,
      callsPromise,
      dealsPromise,
    ]);

    const nextContacts: Contact[] = [];
    const nextCalls: CallRecord[] = [];
    const nextDeals: Deal[] = [];

    if (contactsRes.status === 'fulfilled') {
      if (contactsRes.value.error) {
        errors.push('Contacts unavailable');
      } else {
        const rows = contactsRes.value.data || [];
        rows.forEach((row, index) => nextContacts.push(normalizeContact(row as Record<string, any>, index)));
      }
    } else {
      errors.push('Contacts unavailable');
    }

    if (callsRes.status === 'fulfilled') {
      if (callsRes.value.error) {
        // If created_at filter fails, attempt fallback without filter
        const fallback = await supabaseClient.from('calls').select('*').limit(200);
        if (fallback.error) {
          errors.push('Calls unavailable');
        } else {
          const rows = fallback.data || [];
          rows.forEach((row, index) => nextCalls.push(normalizeCall(row as Record<string, any>, index)));
        }
      } else {
        const rows = callsRes.value.data || [];
        rows.forEach((row, index) => nextCalls.push(normalizeCall(row as Record<string, any>, index)));
      }
    } else {
      errors.push('Calls unavailable');
    }

    if (dealsRes.status === 'fulfilled') {
      if (dealsRes.value.error) {
        errors.push('Deals unavailable');
      } else {
        const rows = dealsRes.value.data || [];
        rows.forEach((row, index) => nextDeals.push(normalizeDeal(row as Record<string, any>, index)));
      }
    } else {
      errors.push('Deals unavailable');
    }

    const callsToday = nextCalls.length;
    const connected = nextCalls.filter((call) => call.connected).length;
    const meetingsBooked = nextCalls.filter((call) => {
      const outcome = (call.outcome || call.status || '').toLowerCase();
      return ['meeting', 'demo', 'appointment'].some((key) => outcome.includes(key));
    }).length;
    const pipelineValue = nextDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const activeLeads = nextContacts.filter((contact) => {
      const status = (contact.status || '').toLowerCase();
      return !status || ['queued', 'new', 'open', 'active'].some((key) => status.includes(key));
    }).length;

    setContacts(nextContacts);
    setCalls(nextCalls);
    setDeals(nextDeals);
    setStats({
      callsToday,
      connectRate: callsToday ? Math.round((connected / callsToday) * 100) : 0,
      meetingsBooked,
      pipelineValue,
      activeLeads,
    });
    setLastUpdated(new Date().toISOString());
    setError(errors.length ? errors.join(' • ') : null);
    setIsLoading(false);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      const initials = updates.avatarInitials || initialsFromName(next.name || '');
      return {
        ...next,
        avatarInitials: initials || next.avatarInitials || '',
      };
    });
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const activeContact = useMemo(() => {
    if (!activeContactId) return contacts[0] || null;
    return contacts.find((contact) => contact.id === activeContactId) || contacts[0] || null;
  }, [activeContactId, contacts]);

  const value = useMemo<SalesContextType>(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      error,
      lastUpdated,
      stats,
      contacts,
      calls,
      deals,
      activeContact,
      setActiveContactId,
      refresh,
      user,
      updateUser,
      settings,
      updateSettings,
    }),
    [
      isLoading,
      error,
      lastUpdated,
      stats,
      contacts,
      calls,
      deals,
      activeContact,
      user,
      settings,
    ],
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}
