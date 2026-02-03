create extension if not exists "pgcrypto";

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  company text,
  phone text,
  email text,
  status text,
  last_touch timestamptz,
  source text,
  location text,
  score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_id uuid references public.contacts(id) on delete set null,
  status text,
  outcome text,
  connected boolean,
  duration_sec integer,
  notes text
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  value numeric,
  status text,
  stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
