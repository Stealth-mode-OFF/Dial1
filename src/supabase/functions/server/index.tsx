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

// Default stats
const defaultStats = {
  callsToday: 42,
  callsGoal: 60,
  connected: 8,
  meetingsBooked: 2,
  pipelineValue: 12450,
  streak: 8,
};

// Explicitly define routes with the full prefix to avoid basePath confusion
const PREFIX = '/make-server-139017f8';

app.get(`${PREFIX}/stats`, async (c) => {
  try {
    const stored = await get('stats');
    if (!stored) {
      try {
        await set('stats', defaultStats);
      } catch (e) {
        console.warn('Could not initialize stats, using defaults');
      }
      return c.json(defaultStats);
    }
    return c.json(stored);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json(defaultStats);
  }
})

app.post(`${PREFIX}/stats`, async (c) => {
  try {
    const body = await c.req.json();
    await set('stats', body);
    return c.json({ success: true, stats: body });
  } catch (error) {
    console.error('Error saving stats:', error);
    return c.json({ error: 'Failed to save stats' }, 500);
  }
})

Deno.serve(app.fetch)