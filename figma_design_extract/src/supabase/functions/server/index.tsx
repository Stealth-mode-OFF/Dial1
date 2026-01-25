import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'

const app = new Hono()

app.use('*', cors())
app.use('*', logger(console.log))

// Initialize Supabase Client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

const TABLE_NAME = 'kv_store_139017f8'

// Helper functions
async function get(key: string) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('value')
      .eq('key', key)
      .maybeSingle()
    
    if (error) {
      console.error('KV Get Error:', error)
      return null
    }
    return data?.value ?? null
  } catch (e) {
    console.error('KV Get Exception:', e)
    return null
  }
}

async function set(key: string, value: any) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert({ key, value })
  
  if (error) {
    console.error('KV Set Error:', error)
    throw error
  }
}

// Defaults
const defaults = {
  stats: {
    callsToday: 42,
    callsGoal: 60,
    connected: 8,
    meetingsBooked: 2,
    pipelineValue: 12450,
    streak: 8,
  },
  user: {
    name: 'Alex Salesman',
    role: 'Senior AE',
    avatarInitials: 'AS',
    status: 'online',
    energyLevel: 85,
  },
  integrations: {
    pipedrive: true,
    googleMeet: true,
    slack: false,
  },
  coachSettings: {
    activePersona: 'challenger',
    interventions: {
      speedAlert: true,
      monologueBreaker: true,
      fillerWordKiller: false,
      sentimentTracker: true
    }
  },
  configSettings: {
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
  },
  objectionCounts: {
    'Too expensive': 42,
    'Send me an email': 28,
    'Not interested': 15,
    'Using competitor': 12,
  },
  recentActivity: [
    { id: '1', type: 'meeting', description: 'Demo with Acme Corp', timestamp: '2h ago', score: 92 },
    { id: '2', type: 'call', description: 'Intro call - Stark Ind', timestamp: '4h ago', score: 64 },
    { id: '3', type: 'call', description: 'Follow-up / Wayne Ent', timestamp: 'Yesterday', score: 85 },
  ],
  schedule: [
    { id: '1', time: '09:00', end: '09:30', title: 'Intel & Prep', type: 'prep', icon: 'Filter', desc: 'Review CRM, Coffee, Set Daily Goals', status: 'completed' },
    { id: '2', time: '09:30', end: '10:30', title: 'Deep Canvasing', type: 'work', icon: 'Target', desc: 'Prospecting new leads. No distractions.', status: 'active' },
    { id: '3', time: '10:30', end: '10:45', title: 'Neuro-Reset', type: 'break', icon: 'ArrowDownRight', desc: 'Walk, Stretch, No Screens.', status: 'pending' },
    { id: '4', time: '10:45', end: '11:45', title: 'Demo / Outbound', type: 'work', icon: 'Phone', desc: 'High energy calls & presentations.', status: 'pending' },
    { id: '5', time: '11:45', end: '12:45', title: 'Recharge', type: 'break', icon: 'Calendar', desc: 'Lunch & Disconnect.', status: 'pending' },
    { id: '6', time: '12:45', end: '13:45', title: 'Closing Time', type: 'work', icon: 'TrendingUp', desc: 'Contracts, Negotiations, Follow-ups.', status: 'pending' },
    { id: '7', time: '13:45', end: '14:00', title: 'Daily Wrap-Up', type: 'prep', icon: 'Download', desc: 'Update CRM, Prep "Tomorrow List".', status: 'pending' },
  ]
};

const PREFIX = '/make-server-139017f8';

// Generic handler factory to reduce boilerplate
const createHandler = (key: keyof typeof defaults) => {
  // GET handler
  app.get(`${PREFIX}/${key.toLowerCase()}`, async (c) => {
    try {
      const stored = await get(key);
      if (!stored) {
        // Initialize if not exists
        try {
          await set(key, defaults[key]);
        } catch (e) {
          console.warn(`Could not initialize ${key}, using defaults`);
        }
        return c.json(defaults[key]);
      }
      return c.json(stored);
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      return c.json(defaults[key]);
    }
  });

  // POST handler
  app.post(`${PREFIX}/${key.toLowerCase()}`, async (c) => {
    try {
      const body = await c.req.json();
      await set(key, body);
      return c.json({ success: true, [key]: body });
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return c.json({ error: `Failed to save ${key}` }, 500);
    }
  });
};

// Register routes
(Object.keys(defaults) as Array<keyof typeof defaults>).forEach(key => {
  createHandler(key);
});

// Special handler for "reset" (useful for debugging/demos)
app.post(`${PREFIX}/reset`, async (c) => {
  try {
    for (const key of Object.keys(defaults)) {
       await set(key, defaults[key as keyof typeof defaults]);
    }
    return c.json({ success: true, message: 'All data reset to defaults' });
  } catch (error) {
    return c.json({ error: 'Failed to reset' }, 500);
  }
});

Deno.serve(app.fetch)