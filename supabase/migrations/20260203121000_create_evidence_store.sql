create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evidence_confidence') then
    create type public.evidence_confidence as enum ('high','medium','low');
  end if;
  if not exists (select 1 from pg_type where typname = 'evidence_source_type') then
    create type public.evidence_source_type as enum (
      'company_website',
      'ares_record',
      'crm_note',
      'user_note',
      'internal_product_note'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'claim_review_status') then
    create type public.claim_review_status as enum ('needs_review','approved','rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'pipeline_step') then
    create type public.pipeline_step as enum ('ingest','extract','review','generate','export');
  end if;
end$$;

create table if not exists public.evidence_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  correlation_id uuid not null default gen_random_uuid(),

  source_type public.evidence_source_type not null,
  source_url text not null,
  canonical_url text,
  source_title text,

  http_status integer,
  content_type text,
  language text,

  captured_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),

  content_text text not null,
  content_sha256 text not null,

  robots_policy jsonb,
  request_meta jsonb,

  contact_id uuid references public.contacts(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_documents_owner_idx on public.evidence_documents (owner_user_id);
create index if not exists evidence_documents_contact_idx on public.evidence_documents (contact_id);
create index if not exists evidence_documents_canonical_idx on public.evidence_documents (canonical_url);
create index if not exists evidence_documents_correlation_idx on public.evidence_documents (correlation_id);
create index if not exists evidence_documents_sha_idx on public.evidence_documents (content_sha256);

create table if not exists public.evidence_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  correlation_id uuid not null,

  document_id uuid not null references public.evidence_documents(id) on delete cascade,

  model text not null,
  prompt_version text not null,
  extractor_version text not null,

  status text not null check (status in ('success','failed')),
  error text,

  created_at timestamptz not null default now()
);

create index if not exists evidence_extraction_runs_doc_idx on public.evidence_extraction_runs (document_id);
create index if not exists evidence_extraction_runs_corr_idx on public.evidence_extraction_runs (correlation_id);

create table if not exists public.evidence_claims (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  correlation_id uuid not null,

  document_id uuid not null references public.evidence_documents(id) on delete cascade,
  extraction_run_id uuid references public.evidence_extraction_runs(id) on delete set null,

  claim text not null,
  source_url text not null,
  evidence_snippet text not null,
  captured_at timestamptz not null,
  confidence public.evidence_confidence not null,

  language text,
  subject_name text,
  claim_tags text[] not null default '{}',

  claim_hash text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists evidence_claims_owner_hash_uidx
  on public.evidence_claims (owner_user_id, claim_hash);

create index if not exists evidence_claims_doc_idx on public.evidence_claims (document_id);
create index if not exists evidence_claims_corr_idx on public.evidence_claims (correlation_id);
create index if not exists evidence_claims_conf_idx on public.evidence_claims (confidence);

create table if not exists public.evidence_claim_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  claim_id uuid not null references public.evidence_claims(id) on delete cascade,

  status public.claim_review_status not null default 'needs_review',
  approved_claim text,
  reviewer_notes text,

  reviewed_at timestamptz not null default now(),
  reviewed_by text not null
);

create index if not exists evidence_claim_reviews_claim_idx
  on public.evidence_claim_reviews (claim_id, reviewed_at desc);

create or replace view public.v_evidence_claim_latest_review as
select distinct on (r.claim_id)
  r.claim_id,
  r.status,
  r.approved_claim,
  r.reviewer_notes,
  r.reviewed_at,
  r.reviewed_by
from public.evidence_claim_reviews r
order by r.claim_id, r.reviewed_at desc;

create or replace view public.v_evidence_claims_with_review as
select
  c.id as evidence_id,
  c.owner_user_id,
  c.correlation_id,
  c.claim,
  c.source_url,
  c.evidence_snippet,
  c.captured_at,
  c.confidence,
  c.document_id,
  d.contact_id,
  c.language,
  c.subject_name,
  c.claim_tags,
  coalesce(lr.status, 'needs_review'::public.claim_review_status) as review_status,
  lr.approved_claim,
  lr.reviewer_notes,
  lr.reviewed_at,
  lr.reviewed_by
from public.evidence_claims c
join public.evidence_documents d on d.id = c.document_id
left join public.v_evidence_claim_latest_review lr on lr.claim_id = c.id;

create or replace view public.v_approved_facts as
select
  c.id as evidence_id,
  c.owner_user_id,
  c.correlation_id,
  coalesce(lr.approved_claim, c.claim) as claim,
  c.source_url,
  c.evidence_snippet,
  c.captured_at,
  c.confidence,
  c.document_id,
  d.contact_id,
  c.subject_name,
  c.claim_tags,
  lr.reviewed_at as approved_at,
  lr.reviewed_by as approved_by
from public.evidence_claims c
join public.evidence_documents d on d.id = c.document_id
join public.v_evidence_claim_latest_review lr on lr.claim_id = c.id
where lr.status = 'approved';

create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  correlation_id uuid not null,

  purpose text not null check (purpose in (
    'company_dossier','lead_dossier','cold_call_prep_card','meeting_booking_pack','spin_demo_pack','full_pack'
  )),

  model text not null,
  prompt_version text not null,

  input jsonb not null,
  output jsonb,
  validator_output jsonb,

  status text not null check (status in ('success','failed')),
  error text,

  created_at timestamptz not null default now()
);

create index if not exists generation_runs_corr_idx on public.generation_runs (correlation_id);
create index if not exists generation_runs_owner_idx on public.generation_runs (owner_user_id);

create table if not exists public.sales_packs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  correlation_id uuid not null,

  contact_id uuid references public.contacts(id) on delete set null,
  pack_version integer not null default 1,

  approved_facts jsonb not null default '[]'::jsonb,
  hypotheses jsonb not null default '[]'::jsonb,

  company_dossier jsonb,
  lead_dossier jsonb,
  cold_call_prep_card jsonb,
  meeting_booking_pack jsonb,
  spin_demo_pack jsonb,

  quality_report jsonb not null default '{}'::jsonb,

  generation_run_id uuid references public.generation_runs(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_packs_contact_idx on public.sales_packs (contact_id);
create index if not exists sales_packs_corr_idx on public.sales_packs (correlation_id);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  correlation_id uuid not null,
  step public.pipeline_step not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_corr_idx on public.audit_events (correlation_id);
create index if not exists audit_events_owner_idx on public.audit_events (owner_user_id);
create index if not exists audit_events_step_idx on public.audit_events (step);
