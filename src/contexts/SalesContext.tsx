import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { echoApi, type AnalyticsSummary, type CallLogPayload, type CallLogResult, type EchoContact } from '../utils/echoApi';
import { isSupabaseConfigured, supabaseConfigError } from '../utils/supabase/info';

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
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  lastTouch?: string | null;
  source?: string | null;
  location?: string | null;
  score?: number | null;
  orgId?: number | null;
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

export type Deal = { id: string; value?: number; status?: string; stage?: string };

export type UserProfile = { name: string; role: string; avatarInitials: string };
export type UserSettings = { dailyCallGoal?: number };

type SalesContextType = {
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  stats: Stats;
  contacts: Contact[];
  visibleContacts: Contact[];
  analytics: AnalyticsSummary | null;
  activeContact: Contact | null;
  setActiveContactId: (id: string | null) => void;
  refresh: () => Promise<void>;
  logCall: (payload: CallLogPayload) => Promise<CallLogResult>;
  pipedriveConfigured: boolean;
  setPipedriveKey: (apiKey: string) => Promise<void>;
  clearPipedriveKey: () => Promise<void>;
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  completedLeadIds: string[];
  showCompletedLeads: boolean;
  setShowCompletedLeads: (value: boolean) => void;
  markLeadCompleted: (id: string) => void;
  clearCompletedLeads: () => void;
};

const SalesContext = createContext<SalesContextType | undefined>(undefined);

const STORAGE_USER_KEY = 'echo.user';
const STORAGE_SETTINGS_KEY = 'echo.settings';
const STORAGE_COMPLETED_LEADS_KEY = 'echo.completed_leads';
const STORAGE_SHOW_COMPLETED_KEY = 'echo.show_completed_leads';
const STORAGE_ACTIVE_CONTACT_KEY = 'echo.active_contact_id';

const defaultStats: Stats = {
  callsToday: 0,
  connectRate: 0,
  meetingsBooked: 0,
  pipelineValue: 0,
  activeLeads: 0,
};

const defaultUser: UserProfile = { name: '', role: '', avatarInitials: '' };
const defaultSettings: UserSettings = { dailyCallGoal: 0 };

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '');
  return letters.join('') || '';
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

const loadArrayFromStorage = (key: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const loadBooleanFromStorage = (key: string, fallback = false): boolean => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return Boolean(JSON.parse(raw));
  } catch {
    return fallback;
  }
};

const loadStringFromStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? String(raw) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const mapContact = (row: EchoContact, index: number): Contact => ({
  id: row.id || String(index),
  name: row.name || 'Unnamed contact',
  title: row.role || '',
  company: row.company || '',
  phone: row.phone || '',
  email: row.email || '',
  status: row.status || '',
  location: '',
  score: row.aiScore ?? null,
  orgId: row.org_id ?? null,
});

const deriveStats = (analytics: AnalyticsSummary | null, contactsCount: number): Stats => {
  const callsToday = analytics?.callsToday ?? analytics?.totalCalls ?? 0;
  const connectRate = analytics?.connectRate ?? 0;
  const meetingsBooked =
    analytics?.dispositionBreakdown?.find((d) => d.name?.toLowerCase() === 'meeting')?.value || 0;
  const pipelineValue = analytics?.revenue ?? 0;
  const activeLeads = contactsCount;
  return { callsToday, connectRate, meetingsBooked, pipelineValue, activeLeads };
};

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [activeContactId, setActiveContactId] = useState<string | null>(() =>
    loadStringFromStorage(STORAGE_ACTIVE_CONTACT_KEY),
  );
  const [pipedriveConfigured, setPipedriveConfigured] = useState(false);

  const [user, setUser] = useState<UserProfile>(() => loadFromStorage(STORAGE_USER_KEY, defaultUser));
  const [settings, setSettings] = useState<UserSettings>(() =>
    loadFromStorage(STORAGE_SETTINGS_KEY, defaultSettings),
  );
  const [completedLeadIds, setCompletedLeadIds] = useState<string[]>(() =>
    loadArrayFromStorage(STORAGE_COMPLETED_LEADS_KEY),
  );
  const [showCompletedLeads, setShowCompletedLeads] = useState<boolean>(() =>
    loadBooleanFromStorage(STORAGE_SHOW_COMPLETED_KEY, false),
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Keep a ref to contacts so callbacks don't go stale
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  useEffect(() => {
    saveToStorage(STORAGE_USER_KEY, user);
  }, [user]);

  useEffect(() => {
    saveToStorage(STORAGE_SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    saveToStorage(STORAGE_COMPLETED_LEADS_KEY, completedLeadIds);
  }, [completedLeadIds]);

  useEffect(() => {
    saveToStorage(STORAGE_SHOW_COMPLETED_KEY, showCompletedLeads);
  }, [showCompletedLeads]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const lead = params.get('lead');
    if (lead) setActiveContactId(lead);
  }, []);

  useEffect(() => {
    if (!activeContactId) return;
    try {
      window.localStorage.setItem(STORAGE_ACTIVE_CONTACT_KEY, activeContactId);
    } catch {
      // ignore
    }
  }, [activeContactId]);

  const fetchContacts = async () => {
    const list = await echoApi.fetchContacts();
    const mapped = list.map(mapContact);
    setContacts(mapped);
    return mapped;
  };

  const fetchAnalytics = async (contactCount: number) => {
    const summary = await echoApi.analytics();
    setAnalytics(summary);
    setStats(deriveStats(summary, contactCount));
    return summary;
  };

  const fetchPipedriveStatus = async () => {
    const status = await echoApi.getPipedriveStatus();
    setPipedriveConfigured(Boolean(status?.configured));
  };

  const refresh = async () => {
    if (!isSupabaseConfigured) {
      setError(supabaseConfigError || 'Add Supabase URL and anon key to enable data.');
      return;
    }

    setIsLoading(true);
    setError(null);
    const errors: string[] = [];

    const [contactsResult] = await Promise.all([
      fetchContacts().catch((e) => {
        errors.push(e?.message || 'Contacts unavailable');
        return contacts;
      }),
      fetchPipedriveStatus().catch((e) => errors.push(e?.message || 'Pipedrive unavailable')),
    ]);

    await fetchAnalytics((contactsResult || contacts).length).catch((e) =>
      errors.push(e?.message || 'Analytics unavailable'),
    );

    setLastUpdated(new Date().toISOString());
    setIsLoading(false);
    setError(errors.length ? errors.join(' • ') : null);
  };

  const markLeadCompleted = useCallback((id: string) => {
    if (!id) return;
    setCompletedLeadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const clearCompletedLeads = useCallback(() => {
    setCompletedLeadIds([]);
  }, []);

  const logCall = useCallback(async (payload: CallLogPayload): Promise<CallLogResult> => {
    const res = await echoApi.logCall(payload);
    markLeadCompleted(payload.contactId);
    await fetchAnalytics(contactsRef.current.length).catch(() => null);
    return res;
  }, [markLeadCompleted]);

  const setPipedriveKey = useCallback(async (apiKey: string) => {
    await echoApi.savePipedriveKey(apiKey);
    await fetchPipedriveStatus();
  }, []);

  const clearPipedriveKey = useCallback(async () => {
    await echoApi.deletePipedriveKey();
    await fetchPipedriveStatus();
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      const initials = updates.avatarInitials || initialsFromName(next.name || '');
      return { ...next, avatarInitials: initials || next.avatarInitials || '' };
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const activeContact = useMemo(() => {
    if (!activeContactId) return contacts[0] || null;
    return contacts.find((contact) => contact.id === activeContactId) || contacts[0] || null;
  }, [activeContactId, contacts]);

  const visibleContacts = useMemo(() => {
    if (showCompletedLeads) return contacts;
    if (completedLeadIds.length === 0) return contacts;
    const completed = new Set(completedLeadIds);
    return contacts.filter((contact) => !completed.has(contact.id));
  }, [contacts, completedLeadIds, showCompletedLeads]);

  const value = useMemo<SalesContextType>(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      error,
      lastUpdated,
      stats,
      contacts,
      visibleContacts,
      analytics,
      activeContact,
      setActiveContactId,
      refresh,
      logCall,
      pipedriveConfigured,
      setPipedriveKey,
      clearPipedriveKey,
      user,
      updateUser,
      settings,
      updateSettings,
      completedLeadIds,
      showCompletedLeads,
      setShowCompletedLeads,
      markLeadCompleted,
      clearCompletedLeads,
    }),
    [
      isLoading,
      error,
      lastUpdated,
      stats,
      contacts,
      visibleContacts,
      analytics,
      activeContact,
      pipedriveConfigured,
      user,
      settings,
      completedLeadIds,
      showCompletedLeads,
      refresh,
      logCall,
      setPipedriveKey,
      clearPipedriveKey,
      updateUser,
      updateSettings,
      markLeadCompleted,
      clearCompletedLeads,
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
