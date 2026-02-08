-- Emergency security hotfix: lock down KV store table.
-- Goal: server-only access (no anon/authenticated direct access).

-- Remove permissive allow-all policy.
DROP POLICY IF EXISTS "Enable all access" ON public.kv_store_139017f8;

-- Ensure RLS is enabled.
ALTER TABLE public.kv_store_139017f8 ENABLE ROW LEVEL SECURITY;

-- Revoke any accidental access from client-facing roles.
REVOKE ALL ON TABLE public.kv_store_139017f8 FROM PUBLIC;
REVOKE ALL ON TABLE public.kv_store_139017f8 FROM anon;
REVOKE ALL ON TABLE public.kv_store_139017f8 FROM authenticated;

-- Ensure service_role can access (service_role bypasses RLS but still needs grants).
GRANT ALL ON TABLE public.kv_store_139017f8 TO service_role;

