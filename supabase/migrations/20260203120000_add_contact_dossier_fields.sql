alter table public.contacts
  add column if not exists linkedin_url text,
  add column if not exists manual_notes text,
  add column if not exists company_website text;

create index if not exists contacts_linkedin_url_idx on public.contacts (linkedin_url);
