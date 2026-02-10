-- Email sequencing (scheduled follow-ups)

CREATE TABLE IF NOT EXISTS public.email_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'sequence-d1' | 'sequence-d3' | etc.
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'draft-created' | 'cancelled' | 'sent'
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_schedule_due ON public.email_schedule(owner_user_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_schedule_contact ON public.email_schedule(owner_user_id, contact_id);

ALTER TABLE public.email_schedule ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_schedule FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_schedule TO authenticated;
GRANT ALL ON TABLE public.email_schedule TO service_role;

DROP POLICY IF EXISTS "authenticated_own" ON public.email_schedule;
CREATE POLICY "authenticated_own" ON public.email_schedule
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

