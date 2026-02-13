-- Multi-user isolation: add owner_user_id to contacts and calls tables.
-- This allows each user to have their own contacts and call logs.

-- 1. Add owner_user_id to contacts (nullable initially so existing rows aren't broken)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

-- 2. Add owner_user_id to calls
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

-- 3. Add index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calls_owner ON public.calls (owner_user_id);

-- 4. RLS policies for contacts (service_role already has full access)
--    We keep service_role bypass intact. These policies allow authenticated
--    users to see only their own rows if they ever query directly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'contacts_owner_select'
  ) THEN
    CREATE POLICY contacts_owner_select ON public.contacts
      FOR SELECT TO authenticated
      USING (owner_user_id = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'contacts_owner_insert'
  ) THEN
    CREATE POLICY contacts_owner_insert ON public.contacts
      FOR INSERT TO authenticated
      WITH CHECK (owner_user_id = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'contacts_owner_update'
  ) THEN
    CREATE POLICY contacts_owner_update ON public.contacts
      FOR UPDATE TO authenticated
      USING (owner_user_id = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'contacts_owner_delete'
  ) THEN
    CREATE POLICY contacts_owner_delete ON public.contacts
      FOR DELETE TO authenticated
      USING (owner_user_id = auth.uid()::text);
  END IF;
END $$;

-- 5. RLS policies for calls
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'calls' AND policyname = 'calls_owner_select'
  ) THEN
    CREATE POLICY calls_owner_select ON public.calls
      FOR SELECT TO authenticated
      USING (owner_user_id = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'calls' AND policyname = 'calls_owner_insert'
  ) THEN
    CREATE POLICY calls_owner_insert ON public.calls
      FOR INSERT TO authenticated
      WITH CHECK (owner_user_id = auth.uid()::text);
  END IF;
END $$;

-- 6. Grant authenticated users SELECT on contacts/calls (they were previously revoked)
--    RLS policies above ensure they only see their own rows.
GRANT SELECT, INSERT, UPDATE ON TABLE public.contacts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.calls TO authenticated;
