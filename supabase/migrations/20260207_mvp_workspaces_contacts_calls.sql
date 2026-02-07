-- Echo Dialer MVP: Workspaces + Contacts + Calls + Notes (RLS)

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Preserve legacy tables from earlier prototypes (if present).
do $$
begin
  if to_regclass('public.campaigns') is not null and to_regclass('public.campaigns_legacy_20260207') is null then
    alter table public.campaigns rename to campaigns_legacy_20260207;
  end if;
  if to_regclass('public.contacts') is not null and to_regclass('public.contacts_legacy_20260207') is null then
    alter table public.contacts rename to contacts_legacy_20260207;
  end if;
  if to_regclass('public.calls') is not null and to_regclass('public.calls_legacy_20260207') is null then
    alter table public.calls rename to calls_legacy_20260207;
  end if;
  if to_regclass('public.deals') is not null and to_regclass('public.deals_legacy_20260207') is null then
    alter table public.deals rename to deals_legacy_20260207;
  end if;
exception
  when others then
    -- Best-effort rename; do not block migrations if a legacy rename fails.
    raise notice 'Legacy table rename skipped: %', sqlerrm;
end $$;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type public.workspace_role as enum ('owner', 'admin', 'member');
  end if;
  if not exists (select 1 from pg_type where typname = 'call_outcome') then
    create type public.call_outcome as enum (
      'connected',
      'no_answer',
      'voicemail',
      'callback',
      'not_interested',
      'interested',
      'booked_meeting'
    );
  end if;
end $$;

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core tables
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_personal boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  company text,
  phone text,
  email text,
  tags text[] not null default '{}',
  created_by uuid not null default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contacts_set_updated_at
before update on public.contacts
for each row
execute function public.set_updated_at();

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null default 'phone',
  dialed_number text,
  outcome public.call_outcome,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  created_by uuid not null default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_sessions_ended_after_started check (ended_at is null or ended_at >= started_at),
  constraint call_sessions_duration_nonneg check (duration_seconds is null or duration_seconds >= 0)
);

create trigger call_sessions_set_updated_at
before update on public.call_sessions
for each row
execute function public.set_updated_at();

create table if not exists public.call_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  call_session_id uuid not null references public.call_sessions(id) on delete cascade,
  author_user_id uuid not null default auth.uid() references auth.users(id) on delete set null,
  body_text text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);

create index if not exists idx_contacts_workspace_id on public.contacts(workspace_id);
create index if not exists idx_contacts_workspace_name_trgm on public.contacts using gin (full_name gin_trgm_ops);
create index if not exists idx_contacts_workspace_company_trgm on public.contacts using gin (company gin_trgm_ops);

create index if not exists idx_call_sessions_workspace_id on public.call_sessions(workspace_id);
create index if not exists idx_call_sessions_contact_id on public.call_sessions(contact_id);
create index if not exists idx_call_sessions_started_at on public.call_sessions(started_at desc);

create index if not exists idx_call_notes_workspace_id on public.call_notes(workspace_id);
create index if not exists idx_call_notes_session_id on public.call_notes(call_session_id);

-- Membership helpers (used by RLS policies)
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

-- RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.contacts enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_notes enable row level security;

-- Workspaces
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select
  on public.workspaces
  for select
  using (public.is_workspace_member(id));

drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert
  on public.workspaces
  for insert
  with check (auth.uid() = created_by);

drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update
  on public.workspaces
  for update
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete
  on public.workspaces
  for delete
  using (public.is_workspace_admin(id));

-- Workspace members
drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select
  on public.workspace_members
  for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert
  on public.workspace_members
  for insert
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists workspace_members_update on public.workspace_members;
create policy workspace_members_update
  on public.workspace_members
  for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete
  on public.workspace_members
  for delete
  using (public.is_workspace_admin(workspace_id));

-- Contacts
drop policy if exists contacts_select on public.contacts;
create policy contacts_select
  on public.contacts
  for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists contacts_insert on public.contacts;
create policy contacts_insert
  on public.contacts
  for insert
  with check (
    public.is_workspace_member(workspace_id)
    and created_by = auth.uid()
  );

drop policy if exists contacts_update on public.contacts;
create policy contacts_update
  on public.contacts
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists contacts_delete on public.contacts;
create policy contacts_delete
  on public.contacts
  for delete
  using (public.is_workspace_member(workspace_id));

-- Call sessions
drop policy if exists call_sessions_select on public.call_sessions;
create policy call_sessions_select
  on public.call_sessions
  for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists call_sessions_insert on public.call_sessions;
create policy call_sessions_insert
  on public.call_sessions
  for insert
  with check (
    public.is_workspace_member(workspace_id)
    and created_by = auth.uid()
  );

drop policy if exists call_sessions_update on public.call_sessions;
create policy call_sessions_update
  on public.call_sessions
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists call_sessions_delete on public.call_sessions;
create policy call_sessions_delete
  on public.call_sessions
  for delete
  using (public.is_workspace_member(workspace_id));

-- Call notes
drop policy if exists call_notes_select on public.call_notes;
create policy call_notes_select
  on public.call_notes
  for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists call_notes_insert on public.call_notes;
create policy call_notes_insert
  on public.call_notes
  for insert
  with check (
    public.is_workspace_member(workspace_id)
    and author_user_id = auth.uid()
  );

drop policy if exists call_notes_delete on public.call_notes;
create policy call_notes_delete
  on public.call_notes
  for delete
  using (public.is_workspace_member(workspace_id));

-- Onboarding: create personal workspace on user creation + allow client to ensure it exists.
create or replace function public.echo_handle_new_user_create_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  ws_name text;
begin
  ws_name := coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Personal Workspace');

  insert into public.workspaces (name, is_personal, created_by)
  values (ws_name, true, new.id)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists echo_on_auth_user_created on auth.users;
create trigger echo_on_auth_user_created
after insert on auth.users
for each row
execute function public.echo_handle_new_user_create_personal_workspace();

create or replace function public.ensure_personal_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select w.id
    into ws_id
  from public.workspaces w
  join public.workspace_members wm
    on wm.workspace_id = w.id
  where w.is_personal = true
    and wm.user_id = auth.uid()
  order by w.created_at asc
  limit 1;

  if ws_id is not null then
    return ws_id;
  end if;

  insert into public.workspaces (name, is_personal, created_by)
  values ('Personal Workspace', true, auth.uid())
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, auth.uid(), 'owner');

  return ws_id;
end;
$$;

revoke all on function public.ensure_personal_workspace() from public;
grant execute on function public.ensure_personal_workspace() to authenticated;

-- End call session server-side (duration computed using DB clock).
create or replace function public.end_call_session(p_session_id uuid, p_outcome public.call_outcome)
returns public.call_sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated public.call_sessions;
begin
  update public.call_sessions
  set
    outcome = p_outcome,
    ended_at = now(),
    duration_seconds = greatest(0, extract(epoch from (now() - started_at))::int)
  where id = p_session_id
  returning * into updated;

  if updated.id is null then
    raise exception 'Call session not found';
  end if;

  return updated;
end;
$$;

revoke all on function public.end_call_session(uuid, public.call_outcome) from public;
grant execute on function public.end_call_session(uuid, public.call_outcome) to authenticated;

