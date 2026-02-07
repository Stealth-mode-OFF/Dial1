# Echo Dialer MVP (Production-Ready) Spec

## Goal
Ship a production-ready MVP that supports daily use for an internal sales team:

- Authentication (Supabase Auth)
- Workspace scoping (personal workspace on first login)
- Contacts CRUD (scoped to workspace)
- Call session tracking (start/end/outcome) (scoped to workspace + contact)
- Call notes linked to call sessions (scoped to workspace)
- Strict Row Level Security (RLS): users can only access rows in workspaces they are members of

AI coaching, transcription, CRM sync, and analytics dashboards are explicitly out of scope.

## Entities (Database)

### `workspaces`
- `id` uuid PK
- `name` text
- `is_personal` boolean (true for the auto-created personal workspace)
- `created_by` uuid (auth.users.id)
- `created_at` timestamptz

### `workspace_members`
- `workspace_id` uuid FK -> workspaces.id (CASCADE)
- `user_id` uuid FK -> auth.users.id (CASCADE)
- `role` enum: `owner | admin | member`
- `created_at` timestamptz
- PK (`workspace_id`, `user_id`)

### `contacts`
- `id` uuid PK
- `workspace_id` uuid FK -> workspaces.id (CASCADE)
- `full_name` text (required)
- `company` text (optional)
- `phone` text (optional)
- `email` text (optional)
- `tags` text[] (optional)
- `created_at` timestamptz
- `updated_at` timestamptz
- `created_by` uuid (auth.users.id)

### `call_sessions`
- `id` uuid PK
- `workspace_id` uuid FK -> workspaces.id (CASCADE)
- `contact_id` uuid FK -> contacts.id (CASCADE)
- `channel` text (default `phone`)
- `dialed_number` text (optional)
- `outcome` enum:
  - `connected`
  - `no_answer`
  - `voicemail`
  - `callback`
  - `not_interested`
  - `interested`
  - `booked_meeting`
- `started_at` timestamptz (required)
- `ended_at` timestamptz (optional until ended)
- `duration_seconds` int (computed when ended)
- `created_at` timestamptz
- `updated_at` timestamptz
- `created_by` uuid (auth.users.id)

### `call_notes`
- `id` uuid PK
- `workspace_id` uuid FK -> workspaces.id (CASCADE)
- `call_session_id` uuid FK -> call_sessions.id (CASCADE)
- `author_user_id` uuid (auth.users.id)
- `body_text` text
- `created_at` timestamptz

## RLS Rules
All tables above have RLS enabled.

Membership primitive:
- A user is a workspace member if a row exists in `workspace_members` where `user_id = auth.uid()`.

Policies:
- `workspaces`: users can `SELECT` workspaces they belong to; `INSERT` their own; `UPDATE/DELETE` only if `owner` or `admin`.
- `workspace_members`: `SELECT` members for workspaces the user belongs to; `INSERT/UPDATE/DELETE` only if `owner` or `admin` of that workspace.
- `contacts`, `call_sessions`, `call_notes`: `SELECT/INSERT/UPDATE/DELETE` only if the user is a member of the row’s `workspace_id`.
- Inserts also enforce authorship fields (`created_by`, `author_user_id`) match `auth.uid()`.

## Onboarding (Personal Workspace)
On first login for a user, ensure a personal workspace exists and the user is an `owner` member.

Implementation:
- Postgres trigger on `auth.users` insert creates a personal workspace + owner membership.
- A Postgres RPC `ensure_personal_workspace()` is called by the frontend after login to cover existing users (idempotent).

## Screens / Flows (Frontend)

### `/login`
- Email + password sign-in and sign-up (same screen, toggle).
- On success: redirect to `/contacts`.

### App Shell (Authenticated)
- Loads current user + ensures personal workspace.
- Stores an `activeWorkspaceId` (MVP uses the personal workspace, auto-selected).

### `/contacts`
- Contacts list (workspace-scoped), search input (simple text search)
- Create contact (minimal form)
- Contact detail panel:
  - edit + delete contact
  - call session history list
  - start call session
  - end call session with outcome
  - notes list for selected session
  - add note to selected (or active) session

### `/calls`
- Recent call sessions list (workspace-scoped)
- Clicking a row navigates to the related contact

### `/settings`
- Shows signed-in email
- Sign out button

## Definition Of Done (DoD)
- [ ] Auth: sign-up, sign-in, sign-out works in production build
- [ ] Onboarding: first login creates personal workspace + membership
- [ ] Workspace scoping: all contacts/calls/notes are tied to `workspace_id`
- [ ] Contacts CRUD: create, list, search, update, delete
- [ ] Call sessions: start, end with outcome, duration computed, history shown
- [ ] Notes: add + list notes per call session
- [ ] Persistence: data is stored in Supabase Postgres (no demo/fallback data paths)
- [ ] RLS: enabled and policies enforce workspace membership for all operations
- [ ] No secrets in frontend; only anon key is used
- [ ] Runs locally with documented env vars and Supabase migrations
- [ ] Deploys on Vercel with documented env vars
- [ ] TypeScript strict build passes; basic loading/error states exist for async calls

