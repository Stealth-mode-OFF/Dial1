-- Google Meet Coaching Infrastructure
-- Migrated from MeetDial MVP, adapted for Echo Dialer multi-user

-- 1. Meet Sessions Table (links Google Meet calls to users/campaigns)
CREATE TABLE IF NOT EXISTS meet_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID,
  contact_id UUID,
  title TEXT DEFAULT 'Google Meet Call',
  meet_url TEXT,
  session_code VARCHAR(12) UNIQUE, -- Code shown in extension popup
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INT,
  transcript_summary TEXT,
  coaching_interactions INT DEFAULT 0,
  outcomes JSONB DEFAULT '{}'::jsonb, -- { "disposition": "connected", "notes": "..." }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Live Transcript Events (real-time caption stream from Google Meet)
CREATE TABLE IF NOT EXISTS transcript_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_session_id UUID REFERENCES meet_sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  speaker VARCHAR(50) DEFAULT 'prospect', -- 'prospect' | 'agent' | 'system'
  confidence FLOAT DEFAULT 1.0, -- 0-1 scale from speech-to-text service
  timestamp_in_call INT DEFAULT 0, -- Milliseconds from call start
  language VARCHAR(10) DEFAULT 'en',
  metadata JSONB DEFAULT '{}'::jsonb, -- { "sentiment": "positive", "intent": "question", ... }
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Coaching Recommendations (AI-generated live coaching suggestions)
CREATE TABLE IF NOT EXISTS coaching_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_session_id UUID REFERENCES meet_sessions(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL, -- "Ask about their timeline"
  reasoning TEXT, -- "Prospect mentioned budget concerns..."
  examples TEXT[] DEFAULT '{}', -- ["What's your timeline?", "When do you typically make decisions?"]
  spin_category VARCHAR(30), -- 'situation' | 'problem' | 'implication' | 'needPayoff'
  priority VARCHAR(20) DEFAULT 'medium', -- 'high' | 'medium' | 'low'
  agent_acknowledged BOOLEAN DEFAULT FALSE,
  agent_accepted BOOLEAN DEFAULT FALSE,
  agent_response TEXT, -- What agent actually said
  similarity_score FLOAT, -- 0-1: how close to suggestion?
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Meet Session Analytics (aggregated metrics per session)
CREATE TABLE IF NOT EXISTS meet_session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_session_id UUID REFERENCES meet_sessions(id) ON DELETE CASCADE,
  total_transcript_lines INT,
  agent_lines INT,
  prospect_lines INT,
  silence_seconds INT,
  coaching_suggestions_shown INT,
  coaching_suggestions_accepted INT,
  sentiment_trend JSONB, -- [{"timestamp": 1234, "sentiment": "positive", "confidence": 0.9}]
  objections_detected INT,
  key_phrases TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE meet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_session_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view their meet sessions"
  ON meet_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert meet sessions"
  ON meet_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their meet sessions"
  ON meet_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Transcript events inherit from meet_sessions
CREATE POLICY "Users can view transcripts of their sessions"
  ON transcript_events FOR SELECT
  USING (
    meet_session_id IN (
      SELECT id FROM meet_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transcripts for their sessions"
  ON transcript_events FOR INSERT
  WITH CHECK (
    meet_session_id IN (
      SELECT id FROM meet_sessions WHERE user_id = auth.uid()
    )
  );

-- Coaching recommendations inherit from meet_sessions
CREATE POLICY "Users can view coaching for their sessions"
  ON coaching_recommendations FOR SELECT
  USING (
    meet_session_id IN (
      SELECT id FROM meet_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert coaching for their sessions"
  ON coaching_recommendations FOR INSERT
  WITH CHECK (
    meet_session_id IN (
      SELECT id FROM meet_sessions WHERE user_id = auth.uid()
    )
  );

-- Analytics inherit from meet_sessions
CREATE POLICY "Users can view analytics of their sessions"
  ON meet_session_analytics FOR SELECT
  USING (
    meet_session_id IN (
      SELECT id FROM meet_sessions WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_meet_sessions_user_id ON meet_sessions(user_id);
CREATE INDEX idx_meet_sessions_session_code ON meet_sessions(session_code);
CREATE INDEX idx_transcript_events_meet_session ON transcript_events(meet_session_id);
CREATE INDEX idx_transcript_events_created_at ON transcript_events(created_at);
CREATE INDEX idx_coaching_recommendations_meet_session ON coaching_recommendations(meet_session_id);
CREATE INDEX idx_coaching_recommendations_created_at ON coaching_recommendations(created_at);

-- Enable Realtime for live streaming (for frontend subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE transcript_events;
ALTER PUBLICATION supabase_realtime ADD TABLE coaching_recommendations;

-- Comments for documentation
COMMENT ON TABLE meet_sessions IS 'Represents a single Google Meet coaching session, links to user and campaign';
COMMENT ON TABLE transcript_events IS 'Real-time caption stream from Google Meet - extension pushes these';
COMMENT ON TABLE coaching_recommendations IS 'AI-generated coaching suggestions based on conversation flow';
COMMENT ON TABLE meet_session_analytics IS 'Aggregated analytics for each Meet session (sentiment, objections, etc)';
