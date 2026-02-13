-- Email log (history per contact)

CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  contact_name TEXT,
  company TEXT,
  email_type TEXT NOT NULL, -- 'cold' | 'demo-followup' | 'sequence-d1' | 'sequence-d3'
  subject TEXT,
  body TEXT,
  recipient_email TEXT,
  gmail_draft_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'manual', -- 'manual' | 'gmail-draft' | 'auto-sequence'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_contact ON public.email_log(owner_user_id, contact_id);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_log FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_log TO authenticated;
GRANT ALL ON TABLE public.email_log TO service_role;

DROP POLICY IF EXISTS "authenticated_own" ON public.email_log;
CREATE POLICY "authenticated_own" ON public.email_log
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

