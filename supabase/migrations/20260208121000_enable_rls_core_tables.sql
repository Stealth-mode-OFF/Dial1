-- Emergency security hotfix: enforce server-only access for core tables and
-- per-user RLS for evidence/generation tables.

-- CORE TABLES (server-only; no per-user owner column)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.contacts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.calls FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.deals FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.contacts TO service_role;
GRANT ALL ON TABLE public.calls TO service_role;
GRANT ALL ON TABLE public.deals TO service_role;

-- EVIDENCE / PIPELINE TABLES (per-user access via owner_user_id)
ALTER TABLE public.evidence_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_claim_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Ensure anon cannot access.
REVOKE ALL ON TABLE public.evidence_documents FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.evidence_extraction_runs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.evidence_claims FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.evidence_claim_reviews FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.generation_runs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.sales_packs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.audit_events FROM PUBLIC, anon;

-- Allow authenticated users to access their own rows (guarded by RLS).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_extraction_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_claim_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.generation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales_packs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_events TO authenticated;

-- Ensure service role can access all.
GRANT ALL ON TABLE public.evidence_documents TO service_role;
GRANT ALL ON TABLE public.evidence_extraction_runs TO service_role;
GRANT ALL ON TABLE public.evidence_claims TO service_role;
GRANT ALL ON TABLE public.evidence_claim_reviews TO service_role;
GRANT ALL ON TABLE public.generation_runs TO service_role;
GRANT ALL ON TABLE public.sales_packs TO service_role;
GRANT ALL ON TABLE public.audit_events TO service_role;

-- RLS policies (per-user boundary)
DROP POLICY IF EXISTS "authenticated_own" ON public.evidence_documents;
CREATE POLICY "authenticated_own" ON public.evidence_documents
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_own" ON public.evidence_extraction_runs;
CREATE POLICY "authenticated_own" ON public.evidence_extraction_runs
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_own" ON public.evidence_claims;
CREATE POLICY "authenticated_own" ON public.evidence_claims
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_own" ON public.evidence_claim_reviews;
CREATE POLICY "authenticated_own" ON public.evidence_claim_reviews
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_own" ON public.generation_runs;
CREATE POLICY "authenticated_own" ON public.generation_runs
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_own" ON public.sales_packs;
CREATE POLICY "authenticated_own" ON public.sales_packs
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_own" ON public.audit_events;
CREATE POLICY "authenticated_own" ON public.audit_events
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()::text)
  WITH CHECK (owner_user_id = auth.uid()::text);

