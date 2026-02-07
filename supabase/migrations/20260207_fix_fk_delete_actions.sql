-- Fix FK delete actions for audit columns.
-- Avoid ON DELETE SET NULL on NOT NULL columns.

alter table if exists public.contacts
  drop constraint if exists contacts_created_by_fkey;
alter table if exists public.contacts
  add constraint contacts_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete restrict;

alter table if exists public.call_sessions
  drop constraint if exists call_sessions_created_by_fkey;
alter table if exists public.call_sessions
  add constraint call_sessions_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete restrict;

alter table if exists public.call_notes
  drop constraint if exists call_notes_author_user_id_fkey;
alter table if exists public.call_notes
  add constraint call_notes_author_user_id_fkey
  foreign key (author_user_id)
  references auth.users(id)
  on delete restrict;

