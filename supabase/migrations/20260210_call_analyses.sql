-- Call Analysis Storage
-- Stores post-call transcript analyses with metrics for long-term tracking

CREATE TABLE IF NOT EXISTS call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Call metadata
  contact_name TEXT,
  contact_company TEXT,
  contact_role TEXT,
  call_date TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER,
  
  -- Raw transcript (stored for re-analysis)
  raw_transcript TEXT NOT NULL,
  parsed_turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Computed metrics
  talk_ratio_me NUMERIC(5,2),          -- % I talked
  talk_ratio_prospect NUMERIC(5,2),    -- % prospect talked
  total_words_me INTEGER,
  total_words_prospect INTEGER,
  filler_words JSONB DEFAULT '{}'::jsonb,  -- { "uhm": 5, "eee": 3, ... }
  filler_word_rate NUMERIC(5,2),       -- fillers per 100 words
  
  -- AI analysis
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_summary TEXT,
  ai_strengths JSONB DEFAULT '[]'::jsonb,
  ai_weaknesses JSONB DEFAULT '[]'::jsonb,
  ai_coaching_tip TEXT,
  
  -- SPIN analysis
  spin_stage_coverage JSONB DEFAULT '{}'::jsonb,  -- { "situation": 3, "problem": 2, ... }
  spin_notes_pipedrive TEXT,  -- formatted SPIN notes for Pipedrive
  
  -- Detailed question analysis
  questions_asked JSONB DEFAULT '[]'::jsonb,  -- [{ "text": "...", "type": "open/closed", "phase": "situation", "quality": "good/weak" }]
  objections_handled JSONB DEFAULT '[]'::jsonb,  -- [{ "objection": "...", "response": "...", "quality": "good/weak" }]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries and dashboard
CREATE INDEX IF NOT EXISTS idx_call_analyses_user_date ON call_analyses(user_id, call_date DESC);

-- RLS
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON call_analyses
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own analyses" ON call_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON call_analyses
  FOR UPDATE USING (auth.uid() = user_id);
