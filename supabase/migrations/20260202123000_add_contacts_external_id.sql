alter table public.contacts
  add column if not exists external_id text;

create unique index if not exists contacts_source_external_id_uidx
  on public.contacts (source, external_id)
  where external_id is not null;