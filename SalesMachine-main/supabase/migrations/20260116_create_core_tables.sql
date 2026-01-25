-- Create core tables for EchoOS

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  name TEXT NOT NULL,
  role TEXT,
  company TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT,
  last_touch TEXT,
  ai_summary TEXT,
  hiring_signal TEXT,
  last_news TEXT,
  intent_score INTEGER CHECK (intent_score >= 0 AND intent_score <= 100),
  personality_type JSONB,
  status TEXT DEFAULT 'queued',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  campaign_id UUID REFERENCES campaigns(id),
  status TEXT DEFAULT 'queued', -- queued, dialing, connected, no-answer, busy, failed
  duration INTEGER, -- in seconds
  disposition TEXT, -- meeting, callback, not-interested, etc.
  transcript JSONB,
  analysis JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  campaign_id UUID REFERENCES campaigns(id),
  title TEXT NOT NULL,
  value NUMERIC(10, 2),
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'open', -- open, won, lost
  stage TEXT,
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own calls" ON calls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calls" ON calls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calls" ON calls
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own deals" ON deals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deals" ON deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals" ON deals
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_contacts_campaign_id ON contacts(campaign_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_calls_contact_id ON calls(contact_id);
CREATE INDEX idx_calls_campaign_id ON calls(campaign_id);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_user_id ON deals(user_id);
